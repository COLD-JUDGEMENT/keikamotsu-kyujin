# CHANGELOG.md

日付ごとの変更履歴です。新しい変更は一番上に追記してください（新しい日付が上）。「何を」「なぜ」変えたかが後から分かるように書くこと。

記入形式:
```
## YYYY-MM-DD
### 追加 / 変更 / 修正 / 削除
- 内容（理由や背景があれば一言添える）
```

---

## 2026-07-14

### 追加
- 掲載フォームを大幅拡張：本社所在地・事業内容・車両条件・月収例・日当保証・報酬の支払条件を新設。PR文を【勤務地】【仕事内容】【待遇・福利厚生】【資格・学歴】【必須条件】の5項目に分割
- 業務形態・報酬の支払条件・勤務日数を複数選択可能なチップ型UIに変更
- `api/screen-listing.js` を新規実装：Claude APIによるテキスト審査（OK/グレー/NG判定）。OKは自動承認、グレー/NGはLINE通知
- `api/notify-line.js` をグレー/NG判定の出し分けに対応

### 変更
- 管理画面パスワードを変更
- 管理画面の承認/却下ボタンをスマホでタップしやすいサイズに拡大

### 決定
- AI審査OK判定は自動承認、グレー・NGのみLINE通知する方針に決定
- メール送信サービスはResend（無料枠月3,000通）を採用候補として決定。ただし独自ドメイン未取得のため実装は保留
- **費用が発生するタスク（AI審査APIキー・自動メール用ドメイン・バックアップ・弁護士確認・商標登録）は個別に進めず、まとまったタイミングでまとめて着手する方針に決定。それまでは無料でできるタスクを優先**

### 保留
- AI審査：コードは実装済みだが`ANTHROPIC_API_KEY`未設定のため稼働せず（フォールバックで従来通りグレー扱い＝全件LINE通知される状態）
- 自動メール：独自ドメイン取得後に着手

---

## 2026-07-10

### 追加
- 掲載フォームに「ロイヤリティ・管理費の有無」項目（あり/なし、必須）を追加。Firestore保存・管理画面表示に反映
- LINE公式アカウント（`@343znpdw`）・Messaging APIチャネルを作成
- `api/line-webhook.js`（LINEからのメッセージ・postback受信）、`api/notify-line.js`（LINEへの通知送信）を新規実装
- App.jsxの掲載申込送信処理に、Firestore保存直後のLINE通知呼び出しを追加
- Vercel環境変数 `LINE_CHANNEL_SECRET` `LINE_CHANNEL_ACCESS_TOKEN` `LINE_TARGET_USER_ID` を設定

### 決定
- 中期タスクの着手順を「LINE通知→AI審査→自動メール→マイページ」に確定（グレー判定通知の手戻りを避けるため）

### 既知の不具合（解決済み）
- ~~LINE通知が届かない。`/api/notify-line`へのリクエストが404。~~ → ブラウザキャッシュが原因と判明。強制リロード後に解消。掲載フォーム送信→LINE通知→「承認」ボタンタップ→Firestoreの`status`自動更新→管理画面反映、の一連の流れを確認済み

---

## 2026-07-09

### 修正
- Stripe決済フォーム送信エラーを解消。原因は2段階あった：①`api`フォルダがGitHubに未アップロードで関数が404だった、②アップロードし直す際にGitHub上でファイル名にスラッシュを含めて新規作成すると中身が反映されず1バイトの空ファイルになる問題があった。ルート階層に残っていた正しい中身のファイルを`api/`配下へリネーム移動する形で解決
- `STRIPE_WEBHOOK_SECRET`をStripeダッシュボードでWebhookエンドポイント登録し取得、Vercel環境変数に設定

### 確認
- テスト決済を実施し、フォーム送信→Firestore保存→Stripe Checkout→決済完了→Webhook通知→Firestoreの`paymentStatus`自動更新→管理画面反映、の一連の流れが正常動作することを確認

### 追加
- プロジェクト管理用ドキュメント7点（README/PROJECT_CONTEXT/AI_RULES/DECISIONS/HANDOVER/TODO/CHANGELOG）を新規作成しGitHubへ配置

### 気づき・ナレッジ
- Vercelの環境変数は保存しただけでは稼働中のサーバーに反映されない。変更時は必ず手動Redeployが必要
- VercelのUIは頻繁に変わる（Environment Variables→Environments、Functionsタブ→Resourcesタブ、等）。過去の案内をそのまま信用せず、都度実際の画面で確認すること
- GitHubで新規ファイルを`フォルダ名/ファイル名.js`のように作成すると、貼り付けた中身が反映されず空ファイルになることがある。作成直後はファイルサイズを必ず確認する

---

## 2026-07-08（進行中）

### 追加
- `api/create-checkout-session.js` を追加。Stripe Checkoutセッション（サブスクリプションモード、JPY月額）を発行するサーバーレス関数
- `api/stripe-webhook.js` を追加。Stripeの決済完了通知を受け取り、Firebase Admin SDK経由でFirestoreの `listingRequests` を更新
- `package.json` に `stripe`・`firebase-admin` を追加
- App.jsxの `handlePostSubmit` を拡張：有料プラン選択時はFirestore保存後にStripe Checkoutへリダイレクトする流れに変更
- 決済結果バナー（`?payment=success` / `?payment=cancelled`）をトップページに追加
- ドキュメント基盤（README/PROJECT_CONTEXT/AI_RULES/DECISIONS/HANDOVER/TODO/CHANGELOG）を新規整備

### 変更
- Firestoreセキュリティルールを一時的に `allow read, write: if true;` に変更（決済テストのブロッカー解消のため。本番前に要修正、`DECISIONS.md` D-008参照）

### 既知の不具合
- 掲載フォームから有料プランで送信すると、1〜2秒で送信エラーになりStripe決済ページに到達しない。原因未特定、次回はVercel Functionsログの確認から着手（詳細は `HANDOVER.md`）

---

## 2026-07-07

### 追加
- 管理画面を実装。`?admin=1` でアクセスする隠しページ、暫定パスワード認証、掲載申込一覧のリアルタイム表示（Firestore `onSnapshot`）、承認/却下/審査待ちに戻す操作
- 管理画面の暫定パスワードを設定（本番公開前にFirebase Authへ置き換え予定）

---

## 2026-07-05〜07-06

### 追加
- 企業掲載フォームをReactで実装。会社名・担当者名・電話番号・メール・掲載エリア（地方→都道府県→エリアの連動セレクト）・求人タイトル・業務形態・単価・勤務日数・PR文・掲載プランの入力項目
- 利用規約・プライバシーポリシーへの同意チェックボックス（必須）を実装（Gemini指摘対応）
- Firestore書き込みが無応答のまま固まらないよう、15秒タイムアウト処理を追加

### 修正
- 都道府県／エリアクリック時の案件一覧ページへの遷移ロジックを実装（サブエリアの有無で遷移タイミングを分岐）

---

## 2026-07-04

### 追加
- 日本地図を47都道府県の実座標データでSVG化。地方ごとの色分け、都道府県クリックで地方＋都道府県を自動選択する連動UIを実装
- 3AI（Claude/ChatGPT/Gemini）+ T2yのレビュー運用フロー・役割分担を確定

### 変更
- 地図データを amCharts geodata（帰属表示必須のリンクウェア）から **Natural Earth**（完全パブリックドメイン）へ差し替え。座標変換・SVG再生成・動作再検証まで実施（`DECISIONS.md` D-004参照）

---

## それ以前（初期構築フェーズ）

### 追加
- GitHubリポジトリ作成（COLD-JUDGEMENT/keikamotsu-kyujin）
- Firebaseプロジェクト作成、Firestore有効化（asia-northeast1）
- Vercelデプロイ・公開
- トップページ基本構成（ヘッダー・CarryFlow固定バナー・プレミアム広告枠・ナビ・検索ボックス・フッター）
- 全国エリアデータ構造（地方→都道府県→エリアの3階層）の設計・実装
- 料金体系・有料申込フローの確定
- 企業掲載フォーム（HTML版たたき台）・開発仕様書の作成
