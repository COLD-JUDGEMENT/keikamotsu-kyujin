# 軽貨物求人.com

全国の軽貨物ドライバー求人を「地方 → 都道府県 → エリア」から探せる専門求人サイト。

- **公開URL**: https://keikamotsu-kyujin.vercel.app
- **管理画面**: https://keikamotsu-kyujin.vercel.app/?admin=1（Firebase Authentication（メール/パスワード）でログイン。認証情報はこのリポジトリのどのファイルにも書かない）
- **GitHub**: COLD-JUDGEMENT/keikamotsu-kyujin（**公開リポジトリ**。パスワード・APIキー・シークレット類は、mdファイルを含めて一切書かないこと）
- **運営者**: T2y（統括・最終判断）

このリポジトリで迷ったら、まず [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) を読んでください。ビジネス背景・料金体系・エリア構造など「なぜこう作られているか」が分かります。直近の状況は [`HANDOVER.md`](./HANDOVER.md) にあります。

---

## このドキュメント群について

このプロジェクトは Claude・ChatGPT・Gemini・T2y の4者で開発しています。AI同士がゼロから説明を受け直さずに作業を引き継げるよう、以下の7ファイルで運用しています。

| ファイル | 役割 |
|---|---|
| `README.md` | このファイル。プロジェクトの入口 |
| `PROJECT_CONTEXT.md` | ビジネス背景・仕様・データ構造など「プロジェクトを理解するための知識」 |
| `AI_RULES.md` | Claude・ChatGPT・Geminiが作業する際の共通ルール |
| `DECISIONS.md` | 変更してはいけない確定事項・設計判断の記録 |
| `HANDOVER.md` | 直近の作業状況・引き継ぎ事項（**最も頻繁に更新される**） |
| `TODO.md` | 優先順位付きの残タスク一覧 |
| `CHANGELOG.md` | 日付ごとの変更履歴 |

**AIが作業を始める前は、必ず `AI_RULES.md` に従って `README.md` → `PROJECT_CONTEXT.md` → `DECISIONS.md` → `HANDOVER.md` → `TODO.md` の順に目を通してください。**

---

## 技術スタック

- **フロントエンド**: React 19 + Vite（単一ファイル構成、`src/` サブディレクトリなし。`App.jsx` に全ロジックを集約）
- **バックエンド**: Firebase Firestore（リージョン: asia-northeast1／東京）、Firebase Authentication（管理画面のログイン）
- **サーバーレス関数**: Vercel Functions（`/api` ディレクトリ。掲載申込の受付、Stripe決済・Webhook処理、LINE通知、AI審査を担当）
- **決済**: Stripe（Checkout / Subscription、テストモードで開発中）
- **通知**: LINE Messaging API（掲載申込の通知と、承認・却下の操作）
- **不正送信対策**: reCAPTCHA
- **AI審査**: Anthropic API（コード実装済み。APIキー未設定のため、現状は未稼働）
- **ホスティング**: Vercel（GitHub連携による自動デプロイ）
- **デプロイ方式**: GitHubのWeb UIでファイルを直接編集・アップロード → Vercelが自動でビルド・反映（ローカル開発環境やgit pushは使用しない運用）

## ディレクトリ構成

```
/
├── App.jsx              # アプリ本体（UI・状態管理・Firestore/Stripe呼び出しすべてを含む単一ファイル）
├── main.jsx              # Reactのエントリーポイント
├── index.html
├── package.json
├── vite.config.js
├── *.md                  # プロジェクト管理用ドキュメント7点（上記）
└── api/                  # Vercelのサーバーレス関数（最新の一覧は api/ フォルダを参照）
    ├── create-listing.js            # 掲載申込を受け付け、reCAPTCHAを検証してFirestoreに保存する関数
    ├── create-checkout-session.js   # Stripe Checkoutセッションを作成する関数
    ├── stripe-webhook.js            # Stripeからの決済完了通知を受け取りFirestoreを更新する関数
    ├── screen-listing.js            # 掲載内容のAI審査（OK/グレー/NG判定）
    ├── notify-line.js               # 運営者へのLINE通知
    └── line-webhook.js              # LINEからの操作（承認・却下ボタンなど）を受け取る関数
```

## 姉妹プロジェクトとの関係

「CarryFlow」（軽貨物ドライバー向け入金管理PWA）とは**完全に別リポジトリ・別Firebaseプロジェクト**です。混同・統合しないでください。このサイトのトップページ最上段にCarryFlowの固定バナー（QRコード付き）を表示していますが、コード・データベースは独立しています。
