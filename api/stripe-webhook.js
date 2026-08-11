// api/stripe-webhook.js
// Stripeからの決済完了通知（Webhook）を受け取り、Firestoreの該当申込の
// paymentStatus を 'unpaid' → 'paid' に更新するサーバーレス関数。
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
      await db.collection('listingRequests').doc(listingId).update({
        paymentStatus: 'paid',
      })
      console.log('決済完了・paymentStatusを更新しました:', listingId)
    } catch (err) {
      console.error('Firestoreの更新に失敗しました', err)
      // Stripeにリトライしてもらうため500を返す
      return res.status(500).json({ error: 'firestore update failed' })
    }
  }

  return res.status(200).json({ received: true })
}
