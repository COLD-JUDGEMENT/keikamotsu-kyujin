// api/notify-line.js
// 新規掲載申込・AI審査グレー/NG判定の際に、LINEへ通知を送る。
// フロントエンド（App.jsx）やAI審査（api/screen-listing.js）から呼び出される想定。
//
// 必要なVercel環境変数：
//   LINE_CHANNEL_ACCESS_TOKEN … LINE Developersコンソールで発行したチャネルアクセストークン
//   LINE_TARGET_USER_ID       … 通知を受け取るT2yさんのLINEユーザーID
//
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { type, listingId, companyName, jobTitle, areaLabel, reason } = req.body || {}

    if (!listingId || !companyName) {
      return res.status(400).json({ error: '必要な情報が不足しています' })
    }

    const isGray = type === 'gray_flag'
    const isNg = type === 'ng_flag'

    let headline = '📩 新しい掲載申込があります'
    if (isGray) headline = '⚠️ AI審査でグレー判定の申込があります'
    if (isNg) headline = '🚫 AI審査でNG判定・自動却下しました'

    const bodyLines = [
      `会社名：${companyName}`,
      `求人：${jobTitle || '(未入力)'}`,
    ]
    if (isGray || isNg) {
      bodyLines.push(`エリア：${areaLabel || '(不明)'}`)
      if (reason) bodyLines.push(`理由：${reason}`)
    } else {
      bodyLines.push(`エリア：${areaLabel || '(不明)'}`)
    }

    // 判定タイプごとにボタンを出し分け
    let actions
    if (isNg) {
      // NGは既に自動却下済みなので、「誤判定だった場合に承認へ戻す」ボタンを用意
      actions = [
        { type: 'postback', label: 'やはり承認する', data: `action=approve&listingId=${listingId}` },
        { type: 'uri', label: '管理画面を開く', uri: 'https://keikamotsu-kyujin.vercel.app/?admin=1' },
      ]
    } else {
      actions = [
        { type: 'postback', label: '承認', data: `action=approve&listingId=${listingId}` },
        { type: 'postback', label: '却下', data: `action=reject&listingId=${listingId}` },
        { type: 'uri', label: '管理画面を開く', uri: 'https://keikamotsu-kyujin.vercel.app/?admin=1' },
      ]
    }

    const message = {
      type: 'template',
      altText: `${headline}\n${companyName}`,
      template: {
        type: 'buttons',
        title: headline,
        text: bodyLines.join('\n').slice(0, 60), // LINEボタンテンプレートのtextは60文字制限
        actions,
      },
    }

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: process.env.LINE_TARGET_USER_ID,
        messages: [message],
      }),
    })

    if (!lineRes.ok) {
      const errText = await lineRes.text()
      console.error('LINE通知の送信に失敗しました', errText)
      return res.status(500).json({ error: 'LINE通知の送信に失敗しました' })
    }

    return res.status(200).json({ sent: true })
  } catch (err) {
    console.error('LINE通知処理でエラーが発生しました', err)
    return res.status(500).json({ error: 'internal error' })
  }
}
