// api/screen-listing.js
// 新規掲載申込をAI（Anthropic API）で審査し、OK/グレー/NGの3段階で判定する。
// App.jsxの掲載フォーム送信時に呼び出される。
//
// 判定結果に応じた挙動：
//   OK    → Firestoreのstatusを自動で approved に更新（通知なし）
//   グレー → status は pending_review のまま。notify-line.js 経由でLINE通知（人力判断）
//   NG    → Firestoreのstatusを自動で rejected に更新。念のため notify-line.js 経由でLINE通知
//
// 必要なVercel環境変数：
//   ANTHROPIC_API_KEY            … 未設定の場合は常にグレー判定にフォールバックする
//                                   （＝これまで通り全件LINE通知で人力判断のまま安全に稼働する）
//   FIREBASE_SERVICE_ACCOUNT_KEY … Firebaseコンソール「プロジェクトの設定」→「サービスアカウント」→
//                                   「新しい秘密鍵を生成」でダウンロードしたJSONファイルの中身をそのまま
//                                   1行の文字列として設定（改行はそのままでOK）
//
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Firebase Admin初期化（複数回初期化されないようgetApps()でガード）
function getDb() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    initializeApp({ credential: cert(serviceAccount) })
  }
  return getFirestore()
}

// Anthropic APIを呼び出してOK/グレー/NGを判定する。
// APIキー未設定・呼び出し失敗・応答の解釈に失敗した場合は、安全側に倒してグレー扱いにする。
async function runAiScreening(payload) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { verdict: 'gray', reason: null }
  }

  try {
    const prompt = `あなたは軽貨物（個人事業主向け配送業務）の求人掲載サイトの審査担当です。
以下の掲載申込内容を確認し、掲載して問題ないかを判定してください。

【判定基準】
- ok: 内容に問題がなく、そのまま掲載してよい
- gray: 誇大な報酬表記・不明瞭な業務内容・法令に抵触しそうな記載など、人による確認が望ましい
- ng: 明らかな詐欺的表現、違法な内容、公序良俗に反する内容など、掲載してはならない

【申込内容】
会社名: ${payload.companyName || ''}
事業内容: ${payload.businessDescription || ''}
求人タイトル: ${payload.jobTitle || ''}
勤務地: ${payload.workLocation || ''}
仕事内容: ${payload.jobDescription || ''}
待遇・福利厚生: ${payload.benefits || ''}
資格・学歴: ${payload.qualifications || ''}
必須条件: ${payload.requirements || ''}

以下のJSON形式のみで回答してください。他の文章は一切含めないでください。
{"verdict": "ok" | "gray" | "ng", "reason": "判定理由（30文字程度、okの場合は空文字でよい）"}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      console.error('AI審査APIの呼び出しに失敗しました', await res.text())
      return { verdict: 'gray', reason: null }
    }

    const data = await res.json()
    const text = (data.content || []).map(b => b.text || '').join('')
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())

    if (!['ok', 'gray', 'ng'].includes(parsed.verdict)) {
      return { verdict: 'gray', reason: null }
    }
    return { verdict: parsed.verdict, reason: parsed.reason || null }
  } catch (err) {
    console.error('AI審査の判定処理でエラーが発生しました', err)
    return { verdict: 'gray', reason: null }
  }
}

// notify-line.js を叩いてLINE通知を送る（このAPI自身の処理は止めない）
async function sendLineNotification(req, { type, listingId, companyName, jobTitle, areaLabel, reason }) {
  try {
    const baseUrl = `https://${req.headers['x-forwarded-host'] || req.headers.host}`
    await fetch(`${baseUrl}/api/notify-line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, listingId, companyName, jobTitle, areaLabel, reason }),
    })
  } catch (err) {
    console.error('LINE通知の呼び出しでエラーが発生しました', err)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const {
      listingId, companyName, businessDescription, jobTitle,
      workLocation, jobDescription, benefits, qualifications, requirements, areaLabel,
    } = req.body || {}

    if (!listingId || !companyName) {
      return res.status(400).json({ error: '必要な情報が不足しています' })
    }

    const { verdict, reason } = await runAiScreening({
      companyName, businessDescription, jobTitle, workLocation,
      jobDescription, benefits, qualifications, requirements,
    })

    const db = getDb()

    if (verdict === 'ok') {
      await db.collection('listingRequests').doc(listingId).update({ status: 'approved' })
    } else if (verdict === 'ng') {
      await db.collection('listingRequests').doc(listingId).update({ status: 'rejected' })
      await sendLineNotification(req, { type: 'ng_flag', listingId, companyName, jobTitle, areaLabel, reason })
    } else {
      // gray: statusはpending_reviewのまま、LINEで人力判断を仰ぐ
      await sendLineNotification(req, { type: 'gray_flag', listingId, companyName, jobTitle, areaLabel, reason })
    }

    return res.status(200).json({ verdict })
  } catch (err) {
    console.error('AI審査処理でエラーが発生しました', err)
    return res.status(500).json({ error: 'internal error' })
  }
}
