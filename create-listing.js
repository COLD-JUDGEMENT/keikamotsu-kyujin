// api/create-listing.js
// 掲載申込フォームの送信を受け取り、reCAPTCHA v3で人間による送信かを検証した上で
// Firestoreに掲載申込ドキュメントを作成するサーバーレス関数。
//
// これまではブラウザから直接Firestoreへ書き込んでいたが、不正送信対策（reCAPTCHA検証）を
// サーバー側で行う必要があるため、書き込み処理自体をこのAPI経由に変更した。
// これに伴い、Firestoreセキュリティルールの `listingRequests` への `create` 権限は
// クライアントから直接は不可（false）にし、このAPI（firebase-adminでルールを回避して書き込む）
// からのみ新規作成できるようにしている（DECISIONS.md D-008参照）。
//
// 必要なVercel環境変数：
//   RECAPTCHA_SECRET_KEY         … https://www.google.com/recaptcha/admin で発行したシークレットキー
//   FIREBASE_SERVICE_ACCOUNT_KEY … 既存のFirebase Admin用サービスアカウントキー（他のapi関数と共通）
//
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const RECAPTCHA_SCORE_THRESHOLD = 0.5

function getDb() {
  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    initializeApp({ credential: cert(serviceAccount) })
  }
  return getFirestore()
}

async function verifyRecaptcha(token) {
  if (!token) return { success: false, score: 0 }
  try {
    const params = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: token,
    })
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const data = await res.json()
    return { success: !!data.success, score: typeof data.score === 'number' ? data.score : 0 }
  } catch (err) {
    console.error('reCAPTCHA検証の呼び出しに失敗しました', err)
    return { success: false, score: 0 }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const body = req.body || {}
    const { recaptchaToken, ...form } = body

    if (!form.companyName || !form.email) {
      return res.status(400).json({ error: '必要な情報が不足しています' })
    }

    const { success, score } = await verifyRecaptcha(recaptchaToken)
    if (!success || score < RECAPTCHA_SCORE_THRESHOLD) {
      console.warn('reCAPTCHA検証で不正送信の疑いと判定されました', { success, score })
      return res.status(400).json({ error: 'suspicious_submission' })
    }

    const db = getDb()
    const docRef = await db.collection('listingRequests').add({
      companyName: form.companyName,
      companyAddress: form.companyAddress || '',
      contactName: form.contactName || '',
      phone: form.phone || '',
      email: form.email,
      businessDescription: form.businessDescription || '',
      regionId: form.regionId || '',
      prefId: form.prefId || '',
      areaId: form.areaId || null,
      jobTitle: form.jobTitle || '',
      jobTypes: form.jobTypes || [],
      jobTypeOther: form.jobTypeOther || '',
      vehicleCondition: form.vehicleCondition || '',
      vehicleConditionDetail: form.vehicleConditionDetail || '',
      payRate: form.payRate || '',
      monthlyIncomeExample: form.monthlyIncomeExample || '',
      dailyGuarantee: form.dailyGuarantee || '',
      paymentTermsList: form.paymentTermsList || [],
      paymentTermsOther: form.paymentTermsOther || '',
      workDays: form.workDays || [],
      hasRoyalty: form.hasRoyalty || '',
      workLocation: form.workLocation || '',
      jobDescription: form.jobDescription || '',
      benefits: form.benefits || '',
      qualifications: form.qualifications || '',
      requirements: form.requirements || '',
      plan: form.plan,
      status: 'pending_review',
      paymentStatus: form.plan === 'free' ? 'not_required' : 'unpaid',
      createdAt: FieldValue.serverTimestamp(),
    })

    return res.status(200).json({ listingId: docRef.id })
  } catch (err) {
    console.error('掲載申込の作成処理でエラーが発生しました', err)
    return res.status(500).json({ error: 'internal error' })
  }
}
