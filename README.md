# 株式会社麗海 公式民泊予約Webアプリ

株式会社麗海（REIKAI Co., Ltd.）の公式サイトとして、会社説明よりも民泊予約を主役にした静的PWAです。GitHub Pagesへそのまま公開できるよう、外部依存なしのHTML/CSS/JavaScriptで実装しています。

## 実装内容

- トップページ、宿泊施設一覧、宿泊施設詳細、宿泊予約
- 不動産・物件一覧、物件詳細、内見予約
- インバウンド支援、会社概要、お問い合わせ
- 予約確認、決済結果、プライバシーポリシー、利用規約、キャンセルポリシー
- 日本語、English、繁體中文、简体中文、한국어の即時切り替え
- `localStorage` による言語、予約下書き、チャット下書き、デモ予約の保持
- デモ宿泊予約、料金再計算、予約番号発行
- Stripe接続前提のデモ決済成功、失敗、キャンセル画面
- サイト内チャット、ESCクローズ、ARIA、下書き保存
- Android / iOS向けPWA manifest、Service Worker、safe-area対応
- GitHub ActionsによるGitHub Pages自動公開

## 重要な仕様

- 宿泊施設と物件は実データ未提供のため、すべて「掲載例」「デモ」と分かる表示にしています。
- 会社情報は指定された正式情報のみを掲載し、電話番号、メールアドレス、実績、物件数は捏造していません。
- チャット本文は自動翻訳しません。入力された文字列を `textContent` でそのまま表示します。
- 決済はデモモードです。実際の課金は行われません。

## ローカル確認

Node.js 20以上があれば依存関係のインストールなしで確認できます。

```bash
npm test
npm run build
npm start
```

表示URL:

```text
http://127.0.0.1:4174/
```

ポートを変える場合:

```bash
PORT=4175 npm start
```

## GitHubへアップする手順

1. GitHubで新しいリポジトリを作成します。
2. このフォルダで以下を実行します。

```bash
git init
git add .
git commit -m "feat: build reikai booking pwa"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

3. GitHubリポジトリの `Settings > Pages` を開きます。
4. `Build and deployment` の Source を `GitHub Actions` にします。
5. `.github/workflows/pages.yml` が `npm test` と `npm run build` を実行し、`dist/` を公開します。

## 本番公開前に差し替えるもの

- `sitemap.xml` と `robots.txt` の `https://your-domain.example/`
- 宿泊施設、料金、清掃費、画像、キャンセル条件
- 物件情報、価格または賃料、所在地の公開範囲
- お問い合わせ先の正式な電話番号またはメールアドレス
- プライバシーポリシー、利用規約、キャンセルポリシーの法務確認済み文面

## Stripe接続方法

現在は静的サイトのため、Stripe秘密鍵を置けません。本番では Vercel Functions、Cloudflare Workers、Supabase Edge Functions などのサーバー側APIを追加してください。

必要な方針:

- `STRIPE_SECRET_KEY` はサーバー側だけに置く
- フロントから送られた金額を信用せず、サーバー側で `src/booking-service.mjs` と同等の料金再計算を行う
- PaymentIntent または Checkout Session をサーバーで作成する
- Webhook署名を検証してから予約確定にする
- 二重決済防止のため idempotency key を使う

## チャットバックエンド接続方法

現在はブラウザ内の `localStorage` を使うデモです。本番では WebSocket、Supabase Realtime、Firebase、独自APIなどへ置き換えてください。

守るべき仕様:

- チャット本文を翻訳、要約、改変しない
- HTMLとして描画しない
- 個人情報を過剰にログへ出さない
- 送信中、送信済み、失敗状態をAPI応答に合わせて更新する

## 多言語辞書の編集

翻訳は `src/dictionaries/` 配下に言語別ファイルとして分離しています。`src/i18n.mjs` は読み込み、フォールバック、日付、通貨表示だけを担当します。UIキーが見つからない場合は日本語へフォールバックします。

## データ差し替え

宿泊施設、物件、会社情報、問い合わせ分類は `src/data.mjs` に分離しています。将来CMSやAPIに接続する場合は、このファイルの配列をAPI取得処理へ置き換える構成です。

## 技術構成

- HTML
- CSS custom properties
- JavaScript ES Modules
- Node.js built-in test runner
- GitHub Pages
- PWA manifest / Service Worker

Next.js化する場合は、十分な空き容量を確保してから App Router 構成へ移植してください。この版は、まずGitHub Pagesで確実に公開できることを優先しています。
