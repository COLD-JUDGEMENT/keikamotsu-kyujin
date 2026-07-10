// api/line-webhook.js
// LINEからのメッセージ・ボタン操作（postback）を受け取るサーバーレス関数。
//
// 必要なVercel環境変数：
//   LINE_CHANNEL_SECRET       … LINE Developersコンソール「Messaging API設定」の Channel secret
//   LINE_CHANNEL_ACCESS_TOKEN … 同画面で発行した チャネルアクセストークン
//   FIREBASE_SERVICE_ACCOUNT_KEY … 既存のFirebase Admin用サービスアカウントキー（stripe-webhook.jsと共通）
//
import crypto from 'crypto'
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

function verifySignature(rawBody, signature) {
  const hash = crypto
    .createHmac('sha256', process.env.LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest('base64')
  return hash === signature
}

function getDb() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    initializeApp({ credential: cert(serviceAccount) })
  }
  return getFirestore()
}

async function replyMessage(replyToken, text) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).send('Method Not Allowed')
  }

  const rawBody = await readRawBody(req)
  const signature = req.headers['x-line-signature']

  if (!verifySignature(rawBody, signature)) {
    console.error('LINE Webhook署名の検証に失敗しました')
    return res.status(400).send('Invalid signature')
  }

  const body = JSON.parse(rawBody.toString('utf-8'))
  const events = body.events || []

  for (const event of events) {
    // ここでuserIdをログに出す（初回セットアップ時、T2yさんのユーザーIDを特定するため）
    console.log('LINEイベント受信:', JSON.stringify({
      type: event.type,
      userId: event.source?.userId,
      messageText: event.message?.text,
      postbackData: event.postback?.data,
    }))

    // メッセージイベント：ユーザーIDが分かるように返信する（セットアップ確認用）
    if (event.type === 'message' && event.message?.type === 'text') {
      await replyMessage(event.replyToken, `あなたのユーザーIDです：\n${event.source.userId}`)
    }

    // ボタン（postback）イベント：承認/却下の処理（次のステップで実装）
    if (event.type === 'postback') {
      const params = new URLSearchParams(event.postback.data)
      const action = params.get('action')
      const listingId = params.get('listingId')

      if (action && listingId) {
        try {
          const db = getDb()
          const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null
          if (newStatus) {
            await db.collection('listingRequests').doc(listingId).update({ status: newStatus })
            const label = newStatus === 'approved' ? '承認' : '却下'
            await replyMessage(event.replyToken, `${label}しました（ID: ${listingId}）`)
          }
        } catch (err) {
          console.error('LINEボタン操作の処理に失敗しました', err)
          await replyMessage(event.replyToken, '処理に失敗しました。管理画面から操作してください。')
        }
      }
    }
  }

  return res.status(200).json({ received: true })
}
