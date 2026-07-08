# CHANGELOG.md

日付ごとの変更履歴です。新しい変更は一番上に追記してください（新しい日付が上）。「何を」「なぜ」変えたかが後から分かるように書くこと。

記入形式:
```
## YYYY-MM-DD
### 追加 / 変更 / 修正 / 削除
- 内容（理由や背景があれば一言添える）
```

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
