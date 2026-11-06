# 株式会社エモリスリンク コーポレートサイト

WordPress から移行したサイトを、Next.js（App Router）+ React（TSX）で構成しています。HTML ファイルは使用していません。

## フォルダ構成

```
src/app/                  ← ページ（フォルダ名＝URL。各フォルダの page.tsx が本文）
  layout.tsx              全ページ共通の枠（ヘッダー・フッター・フォント）
  site.css                サイト全体のスタイルシート
  not-found.tsx           404 ページ
  sitemap.ts / robots.ts  sitemap.xml / robots.txt を自動生成
src/components/site/      ヘッダー・フッター・ページ見出し・トップの地図など共通部品
src/components/partials/  企業情報メニュー・サービスメニュー・個人情報の取扱い など
src/lib/site.ts           電話番号・メールアドレス・フォーム送信先・ナビゲーションの設定
src/lib/schema.ts         検索エンジン向けの構造化データ（JSON-LD）
src/lib/behavior.ts       スクロール連動・メニュー・カルーセル・フォーム送信などの動き
public/assets/            画像・動画・PDF（/assets/... で公開）
public/llms.txt           AI 向けの会社概要
aws/contact/              お問い合わせメールを送る AWS Lambda
```

## 開発

```
npm install
npm run dev      # http://localhost:3000/
npm run build    # 本番ビルド
npm run lint
```

## 更新手順

- ページの文章：`src/app/<URL>/page.tsx` を編集（先頭の `meta` がタイトル・説明文・ページ見出し）
- ヘッダー・フッター・メニュー：`src/components/site/` と `src/lib/site.ts`
- デザイン：`src/app/site.css`

### お知らせを追加する場合

1. `src/app/news/company-established/` をコピーして `src/app/news/<英数字のスラッグ>/` を作成し、`page.tsx` の本文を書き換える
2. `src/app/news/page.tsx`（一覧）と `src/app/page.tsx`（トップの NEWS 欄）にリンクを1行追加
3. `src/app/sitemap.ts` の `ROUTES` に追加

## お問い合わせフォーム

- `src/lib/site.ts` の `formEndpoint` に送信先 URL（AWS Lambda の関数 URL）を設定します。設定手順は `aws/contact/README.md` を参照してください。
- **未設定の場合**は、送信ボタンを押すと閲覧者のメールソフトが起動し、入力内容が入ったメールが info@emorislink.co.jp 宛に作成されます。

## 公開（AWS Amplify）

`amplify.yml` の設定で `npm ci` → `npm run build` を実行します。セキュリティ用のレスポンスヘッダーは `customHttp.yml` で設定しています。

## ログイン・スタッフ登録・案件一覧

- 認証は AWS Cognito（メールアドレス＋パスワード）。ログイン後は署名つき Cookie（30 日）で保持します。設定は `.env`（`.env.example` 参照）。
- `/register/`（スタッフ登録）→ DB の `staff` に保存し、Cognito にアカウントを作成。`/login/`、`/forgot-password/`（確認コードでリセット）、`/mypage/`。
- `/jobs/`（案件一覧・ログイン必須）、`/jobs/<id>/`（詳細と応募）、`/jobs/recruit/<id>/`（人材紹介の案件）。応募は `application` に保存し、`SMTP_*` が設定されていれば通知メールを送ります。
- DB は next-app と同じもの（`postgres`）。構造は next-app 側で管理するため、このリポジトリからマイグレーションは実行しません（`prisma/schema.prisma` は必要なモデルだけ取り込み）。
- **公式LINE から開く場合：** LIFF アプリのエンドポイント URL を `/jobs/` にし、`.env` に `LIFF_ID` / `NEXT_PUBLIC_LIFF_ID` を設定すると、LINE と連携済み（`staff.line_user_id`）のスタッフは自動でログインされます。未ログインなら `/login/` で `src/components/auth/LineAutoLogin.tsx` が処理します。LINE 側を設定するまでは無効です。
