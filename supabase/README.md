# Supabase セットアップ手順

所要 10〜15 分。ターミナル不要（ブラウザだけで完了）。

## 1. プロジェクト作成

1. https://supabase.com/dashboard → **New project**
2. Region：**Northeast Asia (Tokyo)**
3. Database Password を決めて控えておく（後で接続文字列に使います）

## 2. テーブル作成

1. 左メニュー **SQL Editor** → **New query**
2. このフォルダの `setup.sql` の中身をすべて貼り付け → **Run**
3. 最後に `COMMIT` と表示されれば成功。**Table Editor** に `reservations` などが並びます

> 新しいプロジェクトで1回だけ実行してください。2回目はエラーになります（既にテーブルがあるため）。

### すでに setup.sql を実行済みの場合（アップデート）

`upgrades/` フォルダのファイルを**番号順に、まだ実行していないものだけ**実行します。

| ファイル | 内容 |
| --- | --- |
| `upgrades/0002_booking_payments.sql` | 日別料金・販売停止、Stripe Webhook 記録、返金履歴、予約の追加項目 |
| `upgrades/0003_site_settings.sql` | 管理画面から変更できる設定（キャンセルポリシーなど） |

実行済みのファイルをもう一度流しても `already applied` と表示されて何も変わりません。
> RLS（行レベルセキュリティ）を全テーブルで有効にしているので、Supabase の公開 API キーからはデータを読めません。アプリはサーバー側の接続文字列だけで DB にアクセスします。

## 3. 接続文字列を取得

1. 画面上部の **Connect** ボタン
2. **Transaction pooler**（ポート 6543）の URI をコピー
3. `[YOUR-PASSWORD]` を手順 1 のパスワードに置き換える

## 4. Vercel の環境変数

Vercel → Project → **Settings → Environment Variables** に追加して **Redeploy**：

| 変数 | 値 | 備考 |
| --- | --- | --- |
| `DATABASE_URL` | 手順 3 の URI | 必須 |
| `KEY_SESSION_SECRET` | 32文字以上のランダム文字列 | 必須。ゲストキーのセッション署名用 |
| `ADMIN_BOOTSTRAP_EMAIL` | 最初のマスターのメール | DB が空のときだけ使われます |
| `ADMIN_BOOTSTRAP_PASSWORD` | 12文字以上 | ログイン確認後に**削除** |
| `ADMIN_BOOTSTRAP_NAME` | 表示名（任意） | |
| `NEXT_PUBLIC_SITE_URL` | `https://あなたのドメイン` | ゲストキーの URL / QR に使われます |

ランダム文字列は https://generate-secret.vercel.app/32 などで作れます。

### Stripe（カード決済）

| 変数 | 取得場所 |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe ダッシュボード → 開発者 → API キー → シークレットキー（まずは `sk_test_…`） |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 同じ画面の公開可能キー（`pk_test_…`） |
| `STRIPE_WEBHOOK_SECRET` | 下の Webhook を作成したあとに表示される署名シークレット（`whsec_…`） |
| `CRON_SECRET` | ランダム文字列。毎日の「期限切れ仮押さえ解放」ジョブの認証に使います |

Webhook の設定：Stripe ダッシュボード → 開発者 → Webhook → **エンドポイントを追加**

- URL：`https://あなたのドメイン/api/webhooks/stripe`
- イベント：`payment_intent.succeeded` / `payment_intent.payment_failed` / `payment_intent.canceled` / `charge.refunded`

予約はこの Webhook を受け取った時点で「確定」になります。Stripe の鍵を設定しない間は、サイトはデモ決済（カード入力なし）で動きます。

## 5. 確認

1. `https://あなたのドメイン/admin` を開く → 手順 4 のメール・パスワードでログイン
2. 管理者・権限 → 自分の表示タイムゾーンを確認
3. Vercel から `ADMIN_BOOTSTRAP_PASSWORD` を削除して Redeploy

## ステージング用にデモデータを入れたい場合

**別の** Supabase プロジェクトで、環境変数 `SEED_DEMO_DATA=true` を追加して Redeploy すると、空の DB にデモデータ（予約・チャット・デモ管理者）が入ります。
デモ管理者のパスワードは公開されている値なので、**本番プロジェクトでは絶対に設定しないでください**。

## DATABASE_URL を設定しない場合

Vercel 上では一時的な組み込み DB（デモデータ入り）で動きます。画面確認用で、データは再デプロイやサーバー切替のたびに消え、ログインが時々切れることがあります。
