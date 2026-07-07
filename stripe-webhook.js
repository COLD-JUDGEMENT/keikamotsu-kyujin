// api/stripe-webhook.js
// Stripeからの決済完了通知（Webhook）を受け取り、Firestoreの掲載申込データを更新する。
//
// 必要なVercel環境変数：
//   STRIPE_SECRET_KEY           … Stripeの秘密鍵（sk_test_... / sk_live_...）
//   STRIPE_WEBHOOK_SECRET       … Stripeダッシュボードでこのエンドポイントを登録すると発行される whsec_...
//   FIREBASE_SERVICE_ACCOUNT_KEY … Firebaseコンソール「プロジェクトの設定」→「サービスアカウント」→
//                                   「新しい秘密鍵を生成」でダウンロードしたJSONファイルの中身をそのまま
//                                   1行の文字列として設定（改行はそのままでOK）
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

// Firebase Admin初期化（複数回初期化されないようgetApps()でガード）
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
  const sig = req.headers['stripe-signature']
  let event

  try {
    const rawBody = await readRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook署名の検証に失敗しました', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    const db = getDb()

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { listingId, plan } = session.metadata || {}
      if (listingId) {
        await db.collection('listingRequests').doc(listingId).update({
          paymentStatus: 'paid',
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: session.subscription || null,
          paidPlan: plan || null,
          paidAt: new Date(),
        })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const snapshot = await db.collection('listingRequests')
        .where('stripeSubscriptionId', '==', subscription.id)
        .limit(1)
        .get()
      if (!snapshot.empty) {
        await snapshot.docs[0].ref.update({ paymentStatus: 'cancelled' })
      }
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      const snapshot = await db.collection('listingRequests')
        .where('stripeSubscriptionId', '==', invoice.subscription)
        .limit(1)
        .get()
      if (!snapshot.empty) {
        await snapshot.docs[0].ref.update({ paymentStatus: 'payment_failed' })
      }
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook処理中にエラーが発生しました', err)
    return res.status(500).json({ error: 'internal error' })
  }
}
