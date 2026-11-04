<?php
/**
 * お問い合わせフォームの送信先（このサイトで唯一の PHP）
 *
 * - 企業担当者様向け（for-employers）と求職者様向け（job-seekers）の2フォームを受け付ける
 * - 会社宛（TO_ADDRESS）に内容を送り、入力されたメールアドレスへ受付完了の自動返信を送る
 * - 結果は JSON で返す（画面側は assets/js/main.js が表示を切り替える）
 *
 * 設置先のサーバーで PHP の mail() が使えることが前提。
 * FROM_ADDRESS はサイトと同じドメイン（emorislink.co.jp）のアドレスにすること。
 * 別ドメインにすると迷惑メール扱いや不達になりやすい。
 */

// ===== 設定 =====
const TO_ADDRESS   = 'info@emorislink.co.jp';      // 問い合わせを受け取るアドレス
const FROM_ADDRESS = 'noreply@emorislink.co.jp';   // 送信元（同じドメインのアドレス）
const FROM_NAME    = '株式会社エモリスリンク';
const AUTO_REPLY   = true;                          // 入力者へ自動返信するか
const ALLOWED_HOST = 'emorislink.co.jp';            // このドメインのページからの送信だけ受け付ける
const WAIT_SECONDS = 30;                            // 同じ接続元からの連続送信を止める間隔（秒）

// フォームごとの項目（name => 表示名）。ここにない項目は無視する
const FORMS = [
    'employers' => [
        'subject' => '【企業担当者】HPよりお問い合わせがありました',
        'fields'  => [
            'company' => ['企業名', true],
            'name'    => ['ご担当者様名', true],
            'kana'    => ['ふりがな', true],
            'email'   => ['メール', true],
            'tel'     => ['電話番号', true],
            'address' => ['所在地', true],
            'type'    => ['お問い合わせ内容', false],
            'message' => ['お問い合わせ', true],
        ],
    ],
    'seekers' => [
        'subject' => '【お仕事をお探しの方】HPよりお問い合わせがありました',
        'fields'  => [
            'name'    => ['氏名', true],
            'kana'    => ['ふりがな', true],
            'email'   => ['メールアドレス', true],
            'tel'     => ['電話番号', true],
            'gender'  => ['性別', false],
            'job'     => ['希望職種', false],
            'message' => ['お問い合わせ', true],
        ],
    ],
];

// ===== ここから処理 =====
mb_language('Japanese');
mb_internal_encoding('UTF-8');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function respond(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['ok' => $status === 200, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, 'POST only');
}

// 他サイトからの送信を拒否（Origin / Referer のホストを確認）
$from = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$host = $from !== '' ? (parse_url($from, PHP_URL_HOST) ?: '') : '';
if ($host !== '' && $host !== ALLOWED_HOST && $host !== 'www.' . ALLOWED_HOST) {
    respond(403, 'forbidden');
}

// スパム対策：見えない入力欄に何か入っていたら、成功したふりをして何もしない
if (trim((string)($_POST['_gotcha'] ?? '')) !== '') {
    respond(200, 'ok');
}

$formKey = (string)($_POST['_form'] ?? '');
if (!isset(FORMS[$formKey])) {
    respond(400, 'unknown form');
}
$form = FORMS[$formKey];

// 連続送信の制限（接続元 IP ごと）
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$lock = sys_get_temp_dir() . '/emorislink-contact-' . hash('sha256', $ip);
if (is_file($lock) && time() - filemtime($lock) < WAIT_SECONDS) {
    respond(429, '短時間に続けて送信されました。少し時間をおいてから再度お試しください。');
}

// 入力チェック
$values = [];
foreach ($form['fields'] as $key => [$label, $required]) {
    $v = trim((string)($_POST[$key] ?? ''));
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v) ?? '';
    if ($key !== 'message') {
        $v = str_replace("\n", ' ', $v); // 1行の項目に改行は入れさせない
    }
    $max = $key === 'message' ? 5000 : 200;
    if ($required && $v === '') {
        respond(422, "「{$label}」を入力してください。");
    }
    if (mb_strlen($v) > $max) {
        respond(422, "「{$label}」が長すぎます。");
    }
    $values[$key] = $v;
}
if (!filter_var($values['email'], FILTER_VALIDATE_EMAIL)) {
    respond(422, 'メールアドレスの形式が正しくありません。');
}
if (($_POST['agree'] ?? '') === '') {
    respond(422, '個人情報の取り扱いへの同意が必要です。');
}

// ===== メール本文 =====
// テキスト版（HTML を表示できないメールソフト用）
$lines = [];
foreach ($form['fields'] as $key => [$label]) {
    $lines[] = "【{$label}】\n" . ($values[$key] !== '' ? $values[$key] : '（未選択）') . "\n";
}
$detail = implode("\n", $lines);
$sentAt = date('Y年n月j日 H:i');

function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
}

// HTML 版：グレーの背景に白いカード、「項目名（太字）＋入力内容」を区切り線で並べる
function html_mail(array $fields, array $values, string $intro, string $foot): string
{
    $rows = '';
    $keys = array_keys($fields);
    foreach ($keys as $i => $key) {
        $label = $fields[$key][0];
        $v = $values[$key] !== '' ? nl2br(h($values[$key]), false) : '<span style="color:#999999;">（未選択）</span>';
        $border = $i < count($keys) - 1 ? 'border-bottom:1px solid #e5e5e5;' : '';
        $rows .= '<tr><td style="padding:26px 0;' . $border . '">'
            . '<div style="font-size:15px;font-weight:bold;color:#333333;margin:0 0 10px;">' . h($label) . '</div>'
            . '<div style="font-size:15px;line-height:1.7;color:#333333;">' . $v . '</div>'
            . '</td></tr>';
    }
    $font = "'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,'Yu Gothic',sans-serif";
    return '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
        . '<body style="margin:0;padding:0;background:#e8e9eb;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8e9eb;font-family:' . $font . ';">'
        . '<tr><td align="center" style="padding:40px 12px;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #cccccc;">'
        . '<tr><td style="padding:24px 38px 12px;">'
        . ($intro !== '' ? '<div style="font-size:14px;line-height:1.8;color:#555555;padding:16px 0 6px;">' . $intro . '</div>' : '')
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $rows . '</table>'
        . '</td></tr>'
        . ($foot !== '' ? '<tr><td style="padding:0 38px 30px;"><div style="border-top:1px solid #e5e5e5;padding-top:20px;font-size:12px;line-height:1.8;color:#888888;">' . $foot . '</div></td></tr>' : '')
        . '</table></td></tr></table></body></html>';
}

// テキスト版と HTML 版をまとめて送る
function send_mail(string $to, string $subject, string $text, string $html, array $headers): bool
{
    $boundary = 'emorislink-' . bin2hex(random_bytes(12));
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';
    $part = fn (string $type, string $body) => "--{$boundary}\r\n"
        . "Content-Type: {$type}; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($body)) . "\r\n";
    $body = $part('text/plain', $text) . $part('text/html', $html) . "--{$boundary}--\r\n";
    return mail($to, mb_encode_mimeheader($subject, 'UTF-8', 'B'), $body, implode("\r\n", $headers), '-f' . FROM_ADDRESS);
}

$fromHeader = 'From: ' . mb_encode_mimeheader(FROM_NAME, 'UTF-8', 'B') . ' <' . FROM_ADDRESS . '>';

// 会社宛
$adminText = "ホームページのお問い合わせフォームから送信がありました。\n"
    . "このメールに返信すると、入力されたメールアドレス宛に返信できます。\n\n"
    . $detail
    . "\n----------------------------------------\n"
    . "送信日時：{$sentAt}\n"
    . "送信元IP：{$ip}\n";
$adminHtml = html_mail(
    $form['fields'],
    $values,
    '',
    '送信日時：' . h($sentAt) . '<br>送信元IP：' . h($ip) . '<br>このメールに返信すると、入力されたメールアドレス宛に返信できます。'
);
if (!send_mail(TO_ADDRESS, $form['subject'], $adminText, $adminHtml, [$fromHeader, 'Reply-To: ' . $values['email']])) {
    respond(500, '送信に失敗しました。');
}
@touch($lock);

// 入力者への自動返信（失敗しても受付自体は成功として扱う）
if (AUTO_REPLY) {
    $name = $values['name'];
    $company = "株式会社エモリスリンク\n"
        . "〒060-0042 北海道札幌市中央区大通西7丁目1-1 井門札幌パークフロントビル 1F\n"
        . "TEL：011-590-4888（受付 9:00〜18:00、土日祝を除く）\n"
        . "https://emorislink.co.jp/\n";
    $notice = '※このメールは送信専用アドレスから自動でお送りしています。ご返信いただいてもお答えできませんので、ご了承ください。';
    $replyText = "{$name} 様\n\n"
        . "このたびは株式会社エモリスリンクへお問い合わせいただき、誠にありがとうございます。\n"
        . "以下の内容で受け付けいたしました。内容を確認のうえ、担当者より順次ご連絡いたします。\n\n"
        . "{$notice}\n\n"
        . "========================================\n"
        . $detail
        . "========================================\n\n"
        . $company;
    $replyHtml = html_mail(
        $form['fields'],
        $values,
        h($name) . ' 様<br><br>このたびは株式会社エモリスリンクへお問い合わせいただき、誠にありがとうございます。<br>以下の内容で受け付けいたしました。内容を確認のうえ、担当者より順次ご連絡いたします。',
        h($notice) . '<br><br>' . nl2br(h($company), false)
    );
    @send_mail($values['email'], '【株式会社エモリスリンク】お問い合わせを受け付けました', $replyText, $replyHtml, [$fromHeader]);
}

respond(200, 'ok');
