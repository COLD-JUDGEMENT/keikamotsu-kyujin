// api/screen-listing.js
// 掲載申込のテキスト内容をAI（Claude）で審査し、OK/グレー/NGを判定する。
// OK → Firestoreのstatusを自動で'approved'に更新（通知なし）
// グレー → statusは'pending_review'のまま。LINEに要確認の通知を送る
// NG → Firestoreのstatusを自動で'rejected'に更新。念のためLINEにも通知を送る
//
// 掲載フォーム送信直後（App.jsxのhandlePostSubmit）から呼び出される想定。
//
// 必要なVercel環境変数：
//   ANTHROPIC_API_KEY            … console.anthropic.com で発行するAPIキー
//   FIREBASE_SERVICE_ACCOUNT_KEY … 既存のFirebase Admin用サービスアカウントキー（他のapi関数と共通）
//   LINE_CHANNEL_ACCESS_TOKEN    … 既存のLINE通知用トークン（notify-line.jsと共通）
//   LINE_TARGET_USER_ID          … 既存のLINE通知の送り先（notify-line.jsと共通）
//
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function getDb() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    initializeApp({ credential: cert(serviceAccount) })
  }
  return getFirestore()
}

const SCREENING_PROMPT = `あなたは軽貨物ドライバー求人サイト「軽貨物求人.com」の掲載審査担当です。
以下の企業からの掲載申込内容を確認し、OK・グレー・NGのいずれかで判定してください。

【NG判定の基準】
- 違法な勧誘、詐欺的な内容（「誰でも即日高収入確約」等の過度な誇大表現、実態不明な高額収入の断定）
- 差別的な表現（年齢・性別・国籍等による不当な差別文言）
- 求人内容と無関係な内容、スパム、意味不明な文章
- 個人情報の不正収集を目的とした内容

【グレー判定の基準】
- NGとまでは言えないが、表現が誇大・曖昧で確認が必要（「業界No.1」等の根拠不明な訴求、極端に高い収入例で裏付けが弱いもの）
- ロイヤリティ・手数料に関する記載が不自然に曖昧、または実質的な条件が分かりにくい
- 記載内容に矛盾がある（例：勤務日数の記載と業務形態の記載が食い違う）

【OK判定の基準】
- 上記のいずれにも該当せず、通常の求人内容として問題ないもの

出力は必ず以下のJSON形式のみで、他の文章は一切含めないでください：
{"judgement": "ok" または "gray" または "ng", "reason": "判定理由を日本語で1文（グレー・NGの場合のみ。OKの場合は空文字でよい）"}`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const {
      listingId, companyName, businessDescription, jobTitle,
      workLocation, jobDescription, benefits, qualifications, requirements,
      areaLabel,
    } = req.body || {}

    if (!listingId) {
      return res.status(400).json({ error: 'listingIdが指定されていません' })
    }

    const listingText = `
会社名：${companyName || '(未入力)'}
事業・サービス内容：${businessDescription || '(未入力)'}
求人タイトル：${jobTitle || '(未入力)'}
勤務地：${workLocation || '(未入力)'}
仕事内容：${jobDescription || '(未入力)'}
待遇・福利厚生：${benefits || '(未入力)'}
資格・学歴：${qualifications || '(未入力)'}
必須条件：${requirements || '(未入力)'}
`.trim()

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        system: SCREENING_PROMPT,
        messages: [{ role: 'user', content: listingText }],
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('AI審査APIの呼び出しに失敗しました', errText)
      // 審査に失敗した場合は、安全側に倒してグレー扱い（要人力確認）にする
      return res.status(200).json({ judgement: 'gray', reason: 'AI審査に失敗したため要確認' })
    }

    const aiData = await aiRes.json()
    const rawText = aiData.content?.[0]?.text || ''

    let judgement = 'gray'
    let reason = 'AI審査結果の解析に失敗したため要確認'
    try {
      const parsed = JSON.parse(rawText)
      if (['ok', 'gray', 'ng'].includes(parsed.judgement)) {
        judgement = parsed.judgement
        reason = parsed.reason || ''
      }
    } catch (parseErr) {
      console.error('AI審査結果のJSON解析に失敗しました', rawText)
    }

    const db = getDb()
    const docRef = db.collection('listingRequests').doc(listingId)

    if (judgement === 'ok') {
      await docRef.update({ status: 'approved', aiScreening: 'ok', aiScreeningReason: '' })
    } else if (judgement === 'ng') {
      await docRef.update({ status: 'rejected', aiScreening: 'ng', aiScreeningReason: reason })
    } else {
      await docRef.update({ aiScreening: 'gray', aiScreeningReason: reason })
    }

    // グレー・NGの場合のみLINE通知を送る
    if (judgement === 'gray' || judgement === 'ng') {
      try {
        await fetch('https://keikamotsu-kyujin.vercel.app/api/notify-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: judgement === 'ng' ? 'ng_flag' : 'gray_flag',
            listingId,
            companyName,
            jobTitle,
            areaLabel,
            reason,
          }),
        })
      } catch (notifyErr) {
        console.error('AI審査結果のLINE通知に失敗しました', notifyErr)
      }
    }

    return res.status(200).json({ judgement, reason })
  } catch (err) {
    console.error('AI審査処理でエラーが発生しました', err)
    return res.status(500).json({ error: 'internal error' })
  }
}
