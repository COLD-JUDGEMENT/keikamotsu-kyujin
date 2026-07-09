// api/create-checkout-session.js
// 企業掲載フォームで有料プランが選択されたときに呼び出される。
// Stripe Checkout（Stripeが用意する決済ページ）のURLを発行して返す。
//
// 必要なVercel環境変数：
//   STRIPE_SECRET_KEY … Stripeダッシュボード「開発者」→「APIキー」の sk_test_... / sk_live_...
//
import Stripe from 'stripe'

// 料金体系（確定仕様）：円建て・月額。Stripeは「銭」単位ではなく「円そのもの」を最小単位として扱う設定にする（JPYはゼロ decimal通貨）
const PLAN_PRICES = {
  area: { amount: 10000, label: '軽貨物求人.com エリア有料枠（月額）' },
  premium: { amount: 50000, label: '軽貨物求人.com トップ特別広告（月額・全国1社限定）' },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { plan, listingId, email, companyName } = req.body || {}

    const planInfo = PLAN_PRICES[plan]
    if (!planInfo) {
      return res.status(400).json({ error: '無効なプランです' })
    }
    if (!listingId) {
      return res.status(400).json({ error: 'listingIdが指定されていません' })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const origin = req.headers.origin || `https://${req.headers.host}`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: planInfo.label },
            unit_amount: planInfo.amount,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      metadata: {
        listingId,
        plan,
        companyName: companyName || '',
      },
      success_url: `${origin}/?payment=success&listingId=${encodeURIComponent(listingId)}`,
      cancel_url: `${origin}/?payment=cancelled&listingId=${encodeURIComponent(listingId)}`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripeセッション作成エラー', err)
    return res.status(500).json({ error: '決済セッションの作成に失敗しました' })
  }
}
