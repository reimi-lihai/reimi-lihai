# 株式会社麗海 REIMI Co., Ltd. — 民泊予約プラットフォーム

大阪の和モダンな民泊を **サイト内で検索・予約・決済** できる、事業統合型デジタルプラットフォームです。民泊予約をメインに、不動産・内見予約・インバウンド支援・オンライン本人確認（パスポート）・サイト内チャットを一つのアプリに統合しています。

- ブランドコンセプト：**「人と海と未来をつなぐ」**
- デザイン：和モダン × ハイテク／メインカラー = 青・白・黄（ゴールドは少量）／ライト・ダーク両対応
- 基本言語：日本語。**英語・繁体字・簡体字・韓国語へ即時切り替え**（リロード不要・選択を保持）
- PWA 対応（ホーム画面追加・アイコン・マニフェスト）＝ Android / iOS のウェブアプリに適応

---

## 使用技術

| 分類 | 採用 |
| --- | --- |
| フレームワーク | Next.js 14（App Router） |
| 言語 | TypeScript（strict） |
| スタイル | Tailwind CSS（CSS 変数によるデザイントークン） |
| アニメーション | Framer Motion（`prefers-reduced-motion` 尊重） |
| アイコン | lucide-react |
| フォーム検証 | Zod |
| 決済 | Stripe 接続可能な構成（未設定時はデモ決済） |
| 多言語 | 辞書ファイル分離（`src/i18n/dictionaries/`）＋ Context |

---

## セットアップ

```bash
# 1. 依存関係のインストール
npm install

# 2. 環境変数（任意。未設定でもデモモードで全機能動作）
cp .env.example .env.local

# 3. 開発サーバー起動 → http://localhost:3000
npm run dev
```

その他のコマンド：

```bash
npm run build      # 本番ビルド
npm run start      # 本番サーバー
npm run lint       # ESLint
npm run typecheck  # 型チェック（tsc --noEmit）
```

Node.js は 18.18 以上（推奨 20+）を想定しています。

---

## 環境変数（`.env.example` 参照）

| 変数 | 用途 | 未設定時 |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | canonical / sitemap / OGP のベース URL | `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | Stripe 秘密鍵（**サーバー専用**） | デモ決済モード |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公開鍵 | 未使用 |
| `STRIPE_WEBHOOK_SECRET` | Webhook 署名検証 | Webhook は no-op |
| `NEXT_PUBLIC_CHAT_MODE` | チャットのモード（`demo`） | デモチャット |

> 秘密鍵はコードに直書きせず、必ず環境変数で管理してください。`STRIPE_SECRET_KEY` はブラウザに露出しません。

---

## 実装ページ

| ルート | 内容 |
| --- | --- |
| `/` | トップ（ヒーローバナー＝提供画像、検索、注目の宿・物件、価値、事業連携、利用の流れ、FAQ、CTA） |
| `/stays` | 宿泊施設一覧（絞り込み・並び替え・空室検索） |
| `/stays/[slug]` | 宿泊施設詳細（写真・設備・料金内訳・プラン選択・予約導線） |
| `/book` | 宿泊予約フロー（お客様情報 → 決済 → 完了） |
| `/booking/confirmation` | 予約確認（予約番号発行） |
| `/payment/result` | 決済結果（成功・失敗・キャンセル） |
| `/properties` | 不動産・物件一覧（売買/賃貸・種別・民泊活用フィルタ） |
| `/properties/[slug]` | 物件詳細（内見予約・管理相談導線） |
| `/viewing` | 内見予約（担当者確認待ちステータス） |
| `/inbound` | インバウンド支援（医療/美容/在留/滞在・安全な表現の免責付き） |
| `/company` | 会社概要（謄本の情報を正確に記載） |
| `/contact` | お問い合わせ |
| `/checkin` | **オンライン本人確認**（パスポート画像・情報アップロード、スマホ対応） |
| `/privacy` `/terms` `/cancellation` | 各ポリシー（差し替え前提のサンプル文面） |

API：`/api/checkout`（サーバー側で料金再計算＋デモ/Stripe）・`/api/webhook`（Stripe Webhook 雛形）・`/api/chat`（チャットのデモ受信）。

---

## 多言語（i18n）

- 対応：日本語 / English / 繁體中文 / 简体中文 / 한국어
- 辞書：`src/i18n/dictionaries/{ja,en,zh-Hant,zh-Hans,ko}.ts`（言語別に分離）
- 仕組み：`src/i18n/I18nProvider.tsx`（Context）＋ `useI18n()` / `useT()`
- 挙動：
  - 選択した瞬間に **リロードなしで全 UI が切り替わる**（ナビ・本文・ボタン・フォーム・エラー・予約・決済・チャット UI）
  - 選択は `localStorage`（キー `reikai.locale`）に保存し、再訪問時も保持
  - `<html lang>` を選択言語に自動更新
  - 未翻訳キーは **日本語へフォールバック**（生の翻訳キーは表示しない）
  - 料金・日付は言語に応じて `Intl` で整形

### 辞書の追加・修正

1. 対象言語のファイル（例 `src/i18n/dictionaries/en.ts`）を編集。基準は `ja.ts`。
2. キー構造は `ja.ts` と同一（`Dictionary` 型により構造の欠落は型エラーで検出）。
3. 言語自体を増やす場合は `src/i18n/config.ts` の `LOCALES` / `LOCALE_META` / `INTL_LOCALE` に追加し、辞書を作成、`dictionaries/index.ts` に登録。

---

## 予約・決済

- 宿泊予約フローは **検索 → 選択 → 予約内容確認 → お客様情報 → 決済 → 完了 → 予約番号発行** をサイト内で完結。
- **料金はサーバー側（`/api/checkout`）で必ず再計算**します。クライアントから送られた金額は信用しません（動作確認済み：改ざんした `amount` は無視されます）。
- 決済成功前に予約を確定扱いにしません。成功／失敗／キャンセルを分けて表示します。
- 予約番号は単純連番ではなく、時刻＋乱数の推測困難な形式（`src/lib/ids.ts`）。
- 内見予約は宿泊予約とデータ型・UI で明確に区別（`/viewing`、`VW-` 参照番号、「担当者確認待ち」）。

### Stripe を本番接続する

1. `npm i stripe`
2. `.env.local` に `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` を設定。
3. `src/app/api/checkout/route.ts` のデモ分岐を、`price.total`（サーバー計算値）で作成する **PaymentIntent** に置き換え、`client_secret` を返却。JPY はゼロ小数通貨なので金額を 100 倍しないこと。
4. フロントのカード欄を Stripe Elements / Payment Element に差し替え、`client_secret` で確定。
5. `src/app/api/webhook/route.ts` で署名検証（`STRIPE_WEBHOOK_SECRET`）を有効化し、`payment_intent.succeeded` で **冪等に** 予約を確定。

Stripe 未設定時はデモ決済（成功/失敗をボタンで確認）で全フローを検証できます。

---

## サイト内チャット（Airbnb 風）

- 全ページ右下に起動ボタン（未読バッジ付き）を固定表示。パネル／サイドシートで開閉。PC・スマホ両対応。
- 問い合わせ種別（チェックイン、鍵・スマートロック、設備、清掃、騒音、予約変更、延泊、内見、不動産、その他）と予約番号を任意で関連付け。
- 送信中・送信済み・失敗（再送）を表示。入力途中の内容・履歴は `localStorage` に保持。ESC で閉じる・ARIA 対応。
- **最重要仕様：チャット本文は自動翻訳しません。** 入力された文字列を変更・翻訳・要約せず、そのまま相手側へ表示します（英→英、中→中、韓→韓、日→日）。サイトの UI 言語を切り替えてもチャット本文には翻訳を適用しません。理由と方針はコードに明記しています（`src/lib/chat/transport.ts` の冒頭コメント、`ChatPanel` のレンダリング箇所）。
- 本文は HTML として描画せず、プレーンテキスト（`whitespace-pre-wrap`）で安全に表示。
- AI 自動応答ではなく、利用者と運営担当のダイレクトコミュニケーションとして設計。デモではローカル／`/api/chat` で送受信を確認できます。

### チャットバックエンドの接続

`src/lib/chat/transport.ts` の `ChatTransport` インターフェース（`sendMessage`）を実装し直すだけで、WebSocket / Supabase Realtime / Firebase 等へ置き換えられます（UI 側は無改修）。**その際も本文へ翻訳処理を入れないこと。** 本番では認証・レート制限・永続化を追加してください。

---

## 宿泊施設・物件データの差し替え

- すべて **デモデータ**（`demo: true`）で、UI 上も「掲載例（デモ）」と明示しています。実在施設として断定していません。
- データ：`src/lib/data/accommodations.ts` / `src/lib/data/properties.ts`
- アクセス層：`src/lib/data/index.ts`（UI からはここ経由のみ）。CMS / DB / REST API へ差し替える際は、この関数群の中身だけを置き換えれば UI は無改修です。
- 型は `src/lib/types.ts`。宿泊・客室・プラン・料金・予約・決済状態・物件・内見・問い合わせ・チャット・翻訳辞書を後から管理システムへ接続できるよう分離しています。
- 画像は差し替え可能なコンポーネント（`src/components/ui/Placeholder.tsx`）。`src` 未指定時は CSS の抽象背景（組子＋水面）を描画し、読み込み失敗時もレイアウトが崩れません。ヒーローバナーは提供画像（`public/images/hero/`）を使用。

---

## デザイン / アクセシビリティ / SEO

- デザイントークンは `src/app/globals.css` の CSS 変数で一元管理（配色・ガラス調・組子背景）。
- ダークモードはヘッダーのトグルで切替（`localStorage` 保持、初回はOS設定に追従、描画前スクリプトでフラッシュ防止）。
- レスポンシブ：スマホ〜ワイドデスクトップ。横スクロールなし、固定ボタンの重なり回避、十分なタップ領域。
- アクセシビリティ：セマンティック HTML、キーボード操作、フォーカストラップ（モーダル/チャット）、ESC で閉じる、ARIA、`prefers-reduced-motion`、色のみに依存しない状態表示、画像 alt、スキップリンク。
- SEO：ページ毎の title/description、Open Graph、`sitemap.xml`、`robots.txt`、正しい見出し構造。多言語 hreflang は将来拡張可能な構成。

---

## ブランド資産（提供画像）

- ヒーローバナー：`public/images/hero/`（マスコット／ファミリー等）
- ロゴ：`public/images/logo.png`
- アプリアイコン：`public/icons/`（`icon-192/256/384/512.png`、`apple-touch-icon.png`）＋ `public/manifest.webmanifest`

> 英語表記はロゴに合わせて **「REIMI Co., Ltd.」** で統一しています。

---

## 本番公開前の確認事項

- [ ] 会社情報・連絡先の最終確認（電話・メール等は未記載＝「準備中／お問い合わせください」表示。捏造していません）
- [ ] プライバシー／利用規約／キャンセルポリシーを専門家の確認のうえ差し替え
- [ ] Stripe 本番キー設定・Webhook 署名検証・決済テスト
- [ ] チャットの本番バックエンド接続（認証・レート制限・永続化）＋ **本文非翻訳の維持**
- [ ] 本人確認画像の安全な保管先（TLS・アクセス制御・ログ非出力）とデモ処理の置き換え
- [ ] 宿泊・物件データを実データ／CMS へ差し替え、画像を実写に差し替え
- [ ] `NEXT_PUBLIC_SITE_URL`・`robots.txt`／`sitemap` の本番ドメイン反映、hreflang 設定

---

## 品質チェック（実施済み）

`npm install` → `npm run typecheck`（0 エラー）→ `npm run lint`（警告・エラーなし）→ `npm run build`（全 33 ルート生成成功）。開発サーバーで主要ページの表示、宿泊予約フロー、デモ決済の成功/失敗、料金のサーバー再計算（改ざん無視）、チャット本文の非翻訳表示を確認済み。

---

© 株式会社麗海（REIMI Co., Ltd.）  —  麗海の品格を、世界と事業の未来へ。

---

## バックエンド / 管理画面（P0 + ゲストキー）

`npm run dev` → http://localhost:3000/admin にアクセスすると、**設定ゼロで**組み込み PostgreSQL（PGlite, `.data/pglite`）が起動し、マイグレーションとデモデータ投入が自動で行われます。

| デモアカウント | 権限 | 表示タイムゾーン |
| --- | --- | --- |
| master@reimi.example | マスター（全権限） | Asia/Tokyo |
| osaka@reimi.example | 通常管理者 | Asia/Tokyo |
| toronto@reimi.example | 通常管理者（予約閲覧・チャット・キー・タスク） | America/Toronto |

パスワードはすべて `reimi-demo-2026`（ログイン画面のボタンでも入れます）。

ゲストキーのデモ：`/key/demo`（姓 Chen）、`/key/demo-upcoming`、`/key/demo-expired`。管理画面の予約詳細から新しいキーを発行すると、QR と URL がその場で作られます。

### 構成

```
src/server/
  db/schema.ts          テーブル定義（Drizzle）
  db/migrations/        SQL マイグレーション（0001 = 二重予約防止の排他制約・監査ログ追記専用トリガー）
  db/client.ts          DATABASE_URL があれば Supabase、なければ組み込みDB
  db/seed.ts            デモデータ
  auth/                 セッション・パスワード・権限（RBAC）
  modules/              keys（ゲストキー）, reservations（清掃タスク連動）, queries（画面用の読み取り）
  audit.ts / time.ts / rateLimit.ts
src/app/api/admin/*     管理 REST API（すべて権限チェック＋監査ログ）
src/app/api/guest/key/* ゲストキー API
src/app/admin/*         管理画面
```

### 本番（Supabase）へ切り替える

手順の詳細は [`supabase/README.md`](supabase/README.md)。概要：

1. Supabase で東京リージョンのプロジェクトを作成
2. SQL Editor に `supabase/setup.sql` を貼り付けて Run（テーブル・制約・RLS を作成）
3. Vercel の環境変数に `DATABASE_URL`（Transaction pooler の URI）・`KEY_SESSION_SECRET`・`ADMIN_BOOTSTRAP_EMAIL`・`ADMIN_BOOTSTRAP_PASSWORD` を設定して再デプロイ
4. 最初のマスターでログインしたら `ADMIN_BOOTSTRAP_PASSWORD` を削除
5. （今後）管理者ログインを Supabase Auth ＋ TOTP に差し替え（`src/server/auth/session.ts` のみ）

スキーマを変更したら `npm run db:generate` → `npm run db:supabase-sql` で setup.sql を再生成するか、`npm run db:migrate` で差分だけ適用します。

| コマンド | 内容 |
| --- | --- |
| `npm run db:generate` | schema.ts の変更からマイグレーション生成 |
| `npm run db:migrate` | DATABASE_URL の DB に適用 |
| `npm run db:reset` | 組み込みDBを消去（次回起動時にデモデータ再投入） |

---

## 予約・料金・決済（P1）

| 機能 | 場所 |
| --- | --- |
| 料金エンジン（曜日・シーズン・期間・連泊・直前/早割・人数のルール＋日別の個別料金・販売停止） | `src/server/modules/pricing-engine.ts`（単体テスト `npm test`） |
| 見積もり・空室・仮押さえ→決済→確定、キャンセル料計算、返金 | `src/server/modules/booking.ts` |
| 公開 API | `POST /api/v1/quotes`、`GET /api/v1/stays/:id/calendar`、`POST /api/v1/reservations`、`GET /api/v1/reservations/status` |
| Stripe Webhook（署名検証・重複受信は無視） | `POST /api/webhooks/stripe` |
| 期限切れ仮押さえの解放（毎日＋空室確認のたび） | `GET /api/cron/expire-holds`（`vercel.json`） |
| 管理画面 | 料金カレンダー `/admin/pricing`、売上・CSV `/admin/sales`、予約詳細のキャンセル・返金 |

- 予約の流れ：空室と料金をサーバーで再計算 → 30分の仮押さえ → Stripe でカード決済 → Webhook で確定＋清掃タスク自動作成
- 同じ部屋・同じ日程への同時予約は DB の排他制約で1件だけが通ります
- キャンセル料（既定値）：14日前まで無料／7〜13日前 30%／2〜6日前 60%／前日・当日 100%。管理画面「設定」でマスターが変更でき、公開サイトのキャンセルポリシーページにも自動反映されます
- 公開サイトの物件情報はまだ静的データです。本番DBに物件が無い間、その物件の予約ボタンは「オンライン予約を受け付けていません」と表示されます（物件の登録は P2 の CMS で対応）
