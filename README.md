# 株式会社エモリスリンク コーポレートサイト

WordPress から移行した静的サイトです。PHP・データベースは使用していません。

## フォルダ構成

```
public/            ← 公開用ファイル一式（サーバーにはこの中身だけをアップロード）
  assets/css/      スタイルシート
  assets/js/       スクリプト
  assets/img/      画像
  assets/video/    トップページの動画
  assets/docs/     PDF
_src/              ← 編集用のソース（アップロード不要）
  pages/           各ページの本文（URL と同じ階層）
  partials/        共通パーツ（企業情報メニュー、個人情報の取扱い など）
  build.mjs        ページ本文に共通ヘッダー・フッターを付けて public/ に HTML を書き出す
  config.mjs       電話番号・メールアドレス・フォーム送信先などの設定
```

## 更新手順

1. `_src/pages/` のページ、または `_src/partials/` の共通パーツを編集
   - ヘッダー・フッター・メニューは `_src/build.mjs` 内で一括管理しています
   - デザインは `public/assets/css/style.css` を直接編集します
2. ビルド（Node.js 18 以上が必要、追加パッケージ不要）

   ```
   node _src/build.mjs
   ```

3. 確認：`node _src/build.mjs --serve` → http://localhost:8080/
4. `public/` の中身をサーバーへアップロード

### お知らせを追加する場合

1. `_src/pages/news/company-established/index.html` をコピーして `_src/pages/news/<英数字のスラッグ>/index.html` を作成し、本文を書き換える
2. `_src/pages/news/index.html`（一覧）と `_src/pages/index.html`（トップの NEWS 欄）にリンクを1行追加
3. ビルド

## お問い合わせフォーム

PHP を使わないため、フォームの送信は外部のフォーム受付サービスを利用します。

- `_src/config.mjs` の `formEndpoint` に送信先 URL を設定してビルドしてください
  （例：Formspree でフォームを作成し `https://formspree.io/f/xxxxxxxx` を設定。企業向け・求職者向けで別々に設定可能）
- **未設定の場合**は、送信ボタンを押すと閲覧者のメールソフトが起動し、入力内容が入ったメールが info@emorislink.co.jp 宛に作成されます。

## サーバー設定

- 404 ページは `public/404.html` です。Apache 用の `public/.htaccess` を同梱しています（Apache 以外のサーバーでは不要）。
- `sitemap.xml` と `robots.txt` はビルド時に自動生成されます。
