// api/stripe-webhook.js
// Stripeからの決済完了通知（Webhook）を受け取り、Firestoreの該当申込の
// paymentStatus を 'unpaid' → 'paid' に更新するサーバーレス関数。
//
// 【重複登録防止】
// 有料枠（トップ特別広告=全国1社、エリア有料枠=各エリア5社）は、申込〜決済完了までの間に
// 複数社が同時に手続きを進める可能性がある。決済が確定するこのタイミングで、Firestore
// トランザクションを使って「他に支払い済みの件数」を数え直し、枠が既に埋まっていた場合は
// 自動的にStripe側を返金・サブスクリプション解約し、LINEでT2yに通知する。
//
// 必要なVercel環境変数：
//   STRIPE_SECRET_KEY            … create-checkout-session.jsと共通
//   STRIPE_WEBHOOK_SECRET        … Stripeダッシュボード「開発者」→「Webhook」→
//                                   対象エンドポイントの「署名シークレット」（whsec_...）
//   FIREBASE_SERVICE_ACCOUNT_KEY … 既存のFirebase Admin用サービスアカウントキー（line-webhook.jsと共通）
//
// StripeダッシュボードでのWebhookエンドポイント設定：
//   URL: https://keikamotsu-kyujin.vercel.app/api/stripe-webhook
//   購読するイベント: checkout.session.completed
//
import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// 各プランの上限枠数（PROJECT_CONTEXT.md 5章の料金体系と一致させること）
const CAPACITY = { premium: 1, area: 5 }

// Vercelの自動bodyパースを無効化し、署名検証に必要な「生のリクエストボディ」を扱えるようにする
export const config = {
  api: {
    bodyParser: false,
  },
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function getDb() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    initializeApp({ credential: cert(serviceAccount) })
  }
  return getFirestore()
}

// トランザクション内で「この申込を支払い済みにしてよいか」を枠数付きで判定し、Firestoreを更新する。
// 戻り値: { oversold: boolean, listing: object }
async function finalizePaidListing(db, listingId) {
  return db.runTransaction(async (tx) => {
    const listingRef = db.collection('listingRequests').doc(listingId)
    const listingSnap = await tx.get(listingRef)
    if (!listingSnap.exists) {
      throw new Error(`listingRequests/${listingId} が見つかりません`)
    }
    const listing = listingSnap.data()
    const capacity = CAPACITY[listing.plan]

    // 上限のないプラン（free等）はそのまま支払い済みにする
    if (!capacity) {
      tx.update(listingRef, { paymentStatus: 'paid' })
      return { oversold: false, listing }
    }

    let capacityQuery = db.collection('listingRequests')
      .where('plan', '==', listing.plan)
      .where('paymentStatus', '==', 'paid')
    if (listing.plan === 'area') {
      capacityQuery = capacityQuery.where('areaId', '==', listing.areaId)
    }
    const existingSnap = await tx.get(capacityQuery)
    const otherPaidCount = existingSnap.docs.filter(d => d.id !== listingId).length

    if (otherPaidCount >= capacity) {
      // 既に枠が埋まっている＝この申込は決済タイミングが重なった重複分。返金対象としてマークする
      tx.update(listingRef, { paymentStatus: 'oversold_refund_pending' })
      return { oversold: true, listing }
    }

    tx.update(listingRef, { paymentStatus: 'paid' })
    return { oversold: false, listing }
  })
}

// notify-line.js を叩いてLINE通知を送る
async function sendLineNotification(req, payload) {
  try {
    const baseUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
    await fetch(`${baseUrl}/api/notify-line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('LINE通知の呼び出しでエラーが発生しました', err)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).send('Method Not Allowed')
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const rawBody = await readRawBody(req)
  const signature = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe Webhook署名の検証に失敗しました', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const listingId = session.metadata?.listingId

    if (!listingId) {
      console.error('Stripe Webhook: metadataにlistingIdがありません', session.id)
      return res.status(200).json({ received: true })
    }

    try {
      const db = getDb()
      const { oversold, listing } = await finalizePaidListing(db, listingId)

      if (oversold) {
        console.warn('満枠のため返金処理を行います:', listingId)
        // このセッションで発生した課金を取り消す（サブスクリプション解約＋直近請求分の返金）
        try {
          if (session.subscription) {
            await stripe.subscriptions.cancel(session.subscription)
          }
          if (session.invoice) {
            const invoice = await stripe.invoices.retrieve(session.invoice)
            if (invoice.payment_intent) {
              await stripe.refunds.create({ payment_intent: invoice.payment_intent })
            }
          }
        } catch (refundErr) {
          console.error('返金処理に失敗しました。手動対応が必要です', refundErr)
        }

        await sendLineNotification(req, {
          type: 'oversold_refund',
          listingId,
          companyName: listing.companyName,
          jobTitle: listing.jobTitle,
          areaLabel: listing.areaId || listing.prefId || listing.regionId,
        })
      }
    } catch (err) {
      console.error('Firestoreの更新に失敗しました', err)
      // Stripeにリトライしてもらうため500を返す
      return res.status(500).json({ error: 'firestore update failed' })
    }
  }

  return res.status(200).json({ received: true })
}
