# お問い合わせフォームのメール送信（AWS Lambda）

> 現在の設置状況：東京リージョンに関数 `emorislink-contact`（ロール `emorislink-contact-role`）を作成済み。
> 関数 URL：`https://nfv4wni5hb2eo463fjkuwp25su0wknbq.lambda-url.ap-northeast-1.on.aws/`（`_src/config.mjs` に設定済み）

ホームページのお問い合わせフォーム（企業担当者様向け・お仕事をお探しの方向け）の内容を、Google Workspace のメールで info@ に届け、入力した人に受付完了の自動返信を送るプログラムです。

- プログラム：`index.mjs`（このファイル1つだけ。外部ライブラリは使っていません）
- サイトは Amplify、メール送信だけ Lambda が担当します

## 1. Google Workspace：送信用アカウントのアプリパスワードを作る

Lambda から Gmail のサーバー（smtp.gmail.com）にログインするため、送信に使うアカウントの「アプリパスワード」を作ります。

1. 送信に使うアカウント（例：info@emorislink.co.jp）で Google にログインする
2. 「Google アカウント」→「セキュリティ」で **2段階認証プロセス** をオンにする
3. https://myaccount.google.com/apppasswords を開き、名前（例：「ホームページ」）を入れて作成する
4. 表示された **16文字のパスワード** を控える（後で Lambda に設定します）

> アプリパスワードの画面が出ない場合は、Google Workspace の管理者が2段階認証を許可していない可能性があります。管理コンソール →「セキュリティ」→「認証」→「2段階認証プロセス」で、ユーザーによる有効化を許可してください。

## 2. AWS：Lambda 関数を作る

AWS マネジメントコンソールで、リージョンは **東京（ap-northeast-1）** を選びます。

1. 「Lambda」→「関数の作成」
   - 一から作成
   - 関数名：`emorislink-contact`
   - ランタイム：**Node.js 22.x**（20.x 以上なら可）
   - アーキテクチャ：どちらでも可
2. 作成後、「コード」タブで `index.mjs` の中身をすべて消し、このリポジトリの `aws/contact/index.mjs` の中身を貼り付けて **Deploy**
3. 「設定」→「一般設定」→ 編集 → **タイムアウトを 20 秒** にする（初期値の 3 秒ではメール送信が間に合わないことがあります）
4. 「設定」→「環境変数」→ 編集 → 次を追加

   | キー | 値 |
   |---|---|
   | `SMTP_USER` | 送信に使うアカウント（例：`info@emorislink.co.jp`） |
   | `SMTP_PASS` | 手順1で作った16文字のアプリパスワード |
   | `TO_ADDRESS` | 問い合わせを受け取るアドレス（例：`info@emorislink.co.jp`） |
   | `ALLOWED_ORIGINS` | 送信を受け付けるサイトの URL をカンマ区切りで。例：`https://emorislink.co.jp,https://www.emorislink.co.jp,https://main.xxxxxxxx.amplifyapp.com` |

   - `ALLOWED_ORIGINS` に入っていないサイトからの送信は拒否します。Amplify の確認用 URL（`https://main.〜.amplifyapp.com`）でもテストする場合は、それも入れてください。URL の最後に `/` は付けません
   - 自動返信を止めたいときは `AUTO_REPLY` = `false` を追加
   - 送信元を info@ 以外（例：noreply@）にしたいときは `FROM_ADDRESS` を追加。ただし、そのアドレスを Gmail の「他のアドレスからメールを送信」に登録しておく必要があります

5. 「設定」→「関数 URL」→「関数 URL を作成」
   - 認証タイプ：**NONE**
   - 「追加設定」の **CORS は設定しない**（プログラム側で対応しています）
6. 表示された **関数 URL**（`https://xxxxxxxx.lambda-url.ap-northeast-1.on.aws/`）を控える
7. 「設定」→「アクセス権限」→「リソースベースのポリシーステートメント」に、次の **2つ** があることを確認する（どちらかが欠けると、呼び出しが `Forbidden` になります）
   - `lambda:InvokeFunctionUrl`（関数 URL 作成時に自動で追加される）
   - `lambda:InvokeFunction`（条件 `lambda:InvokedViaFunctionUrl = true`）。無い場合は CLI で追加：

   ```sh
   aws lambda add-permission --region ap-northeast-1 --function-name emorislink-contact      --statement-id FunctionURLInvokeAllowPublicAccess --action lambda:InvokeFunction      --principal '*' --invoked-via-function-url
   ```

## 3. サイトに関数 URL を設定する

`_src/config.mjs` の `formEndpoint` に、手順2で控えた関数 URL を入れてビルドし、プッシュします（Amplify が自動で再デプロイします）。

```js
formEndpoint: {
  employers: 'https://xxxxxxxx.lambda-url.ap-northeast-1.on.aws/',
  seekers: 'https://xxxxxxxx.lambda-url.ap-northeast-1.on.aws/',
},
```

## 4. 動作確認

1. 公開されたサイトの「企業担当者様」「お仕事をお探しの方」の両フォームから1回ずつ送信する
2. info@ に「【企業担当者】HPよりお問い合わせがありました」「【お仕事をお探しの方】HPよりお問い合わせがありました」が届くこと
3. 入力したメールアドレスに「【株式会社エモリスリンク】お問い合わせを受け付けました」が届くこと

届かないときは、Lambda の「モニタリング」→「CloudWatch ログを表示」でエラー内容を確認できます。

| ログの内容 | 主な原因 |
|---|---|
| `SMTP_USER / SMTP_PASS が設定されていません` | 環境変数の入れ忘れ |
| `SMTP AUTH password: 535 ...` | アプリパスワードの誤り（通常のログインパスワードでは送れません） |
| `SMTP timeout` | タイムアウトが短い（手順2-3）。または一時的な通信障害 |
| 画面に「送信に失敗しました」、ログに何も出ない | `ALLOWED_ORIGINS` にサイトの URL が入っていない（403） |

## 補足

- Google Workspace の送信上限は1アカウントあたり1日 2,000 通程度なので、お問い合わせの用途では十分です
- Lambda の料金は、この用途（月に数百件程度）ではほぼ無料の範囲に収まります
- プログラムの内容（件名・項目・自動返信の文面）を変えたときは、手順2-2の貼り付けをやり直してください
