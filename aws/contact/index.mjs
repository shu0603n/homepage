/**
 * お問い合わせフォームの送信先（AWS Lambda／Node.js 20 以上）
 *
 * - 企業担当者様向け（for-employers）と求職者様向け（job-seekers）の2フォームを受け付ける
 * - 会社宛（TO_ADDRESS）に内容を送り、入力されたメールアドレスへ受付完了の自動返信を送る
 * - メールは Google Workspace の SMTP（smtp.gmail.com）から送る
 * - 外部ライブラリは使わない。このファイル1つを Lambda の画面に貼り付ければ動く
 * - 結果は JSON で返す（画面側は public/assets/js/main.js が表示を切り替える）
 *
 * 設定は Lambda の「環境変数」で行う（手順は aws/contact/README.md）
 *   SMTP_USER        送信に使う Google Workspace のアカウント（例: info@emorislink.co.jp）
 *   SMTP_PASS        そのアカウントのアプリパスワード（16文字）
 *   TO_ADDRESS       問い合わせを受け取るアドレス（省略時 info@emorislink.co.jp）
 *   FROM_ADDRESS     送信元アドレス（省略時 SMTP_USER。別にする場合は Gmail の「他のアドレスから送信」に登録が必要）
 *   ALLOWED_ORIGINS  送信を受け付けるサイトの URL をカンマ区切りで（例: https://emorislink.co.jp,https://www.emorislink.co.jp）
 *   AUTO_REPLY       入力者へ自動返信するか（'false' で止める。省略時は送る）
 */
import tls from 'node:tls';
import net from 'node:net';
import crypto from 'node:crypto';

const env = process.env;
const SMTP_HOST = env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(env.SMTP_PORT || 465);
const SMTP_SECURE = env.SMTP_SECURE !== 'false'; // 465 は最初から暗号化（テスト時のみ false）
const SMTP_USER = env.SMTP_USER || '';
const SMTP_PASS = (env.SMTP_PASS || '').replace(/\s+/g, '');
const TO_ADDRESS = env.TO_ADDRESS || 'info@emorislink.co.jp';
const FROM_ADDRESS = env.FROM_ADDRESS || SMTP_USER;
const FROM_NAME = '株式会社エモリスリンク';
const AUTO_REPLY = env.AUTO_REPLY !== 'false';
const ALLOWED_ORIGINS = (env.ALLOWED_ORIGINS || 'https://emorislink.co.jp,https://www.emorislink.co.jp').split(',').map((s) => s.trim()).filter(Boolean);
const WAIT_SECONDS = 30; // 同じ接続元からの連続送信を止める間隔（秒）

// フォームごとの項目 [name, 表示名, 必須]。ここにない項目は無視する
const FORMS = {
  employers: {
    subject: '【企業担当者】HPよりお問い合わせがありました',
    fields: [
      ['company', '企業名', true],
      ['name', 'ご担当者様名', true],
      ['kana', 'ふりがな', true],
      ['email', 'メール', true],
      ['tel', '電話番号', true],
      ['address', '所在地', true],
      ['type', 'お問い合わせ内容', false],
      ['message', 'お問い合わせ', true],
    ],
  },
  seekers: {
    subject: '【お仕事をお探しの方】HPよりお問い合わせがありました',
    fields: [
      ['name', '氏名', true],
      ['kana', 'ふりがな', true],
      ['email', 'メールアドレス', true],
      ['tel', '電話番号', true],
      ['gender', '性別', false],
      ['job', '希望職種', false],
      ['message', 'お問い合わせ', true],
    ],
  },
};

// 連続送信の記録（同じ Lambda の実行環境が使い回されている間だけ有効な、簡易的なもの）
const recent = new Map();

// ===== ここから処理 =====
export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || '';
  const headers = lower(event.headers || {});
  const origin = headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);
  const cors = allowed ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
  const respond = (status, message) => ({
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...cors },
    body: JSON.stringify({ ok: status === 200, message }),
  });

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type, Accept', 'Access-Control-Max-Age': '86400' } };
  }
  if (method !== 'POST') return respond(405, 'POST only');
  // 他サイトからの送信を拒否
  if (!allowed) return respond(403, 'forbidden');
  if (!SMTP_USER || !SMTP_PASS) {
    console.error('SMTP_USER / SMTP_PASS が設定されていません');
    return respond(500, '送信に失敗しました。');
  }

  let raw = event.body || '';
  if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  const post = Object.fromEntries(new URLSearchParams(raw));

  // スパム対策：見えない入力欄に何か入っていたら、成功したふりをして何もしない
  if ((post._gotcha || '').trim() !== '') return respond(200, 'ok');

  const form = FORMS[post._form];
  if (!form) return respond(400, 'unknown form');

  // 連続送信の制限（接続元 IP ごと）
  const ip = event.requestContext?.http?.sourceIp || headers['x-forwarded-for']?.split(',')[0]?.trim() || '';
  const last = recent.get(ip);
  if (last && Date.now() - last < WAIT_SECONDS * 1000) {
    return respond(429, '短時間に続けて送信されました。少し時間をおいてから再度お試しください。');
  }

  // 入力チェック
  const values = {};
  for (const [key, label, required] of form.fields) {
    let v = String(post[key] ?? '').trim().replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    if (key !== 'message') v = v.replace(/\n/g, ' '); // 1行の項目に改行は入れさせない
    const max = key === 'message' ? 5000 : 200;
    if (required && v === '') return respond(422, `「${label}」を入力してください。`);
    if ([...v].length > max) return respond(422, `「${label}」が長すぎます。`);
    values[key] = v;
  }
  if (!isEmail(values.email)) return respond(422, 'メールアドレスの形式が正しくありません。');
  if (!post.agree) return respond(422, '個人情報の取り扱いへの同意が必要です。');

  const sentAt = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
  const detail = form.fields.map(([key, label]) => `【${label}】\n${values[key] || '（未選択）'}\n`).join('\n');

  const messages = [{
    to: TO_ADDRESS,
    replyTo: values.email,
    subject: form.subject,
    text: 'ホームページのお問い合わせフォームから送信がありました。\n'
      + 'このメールに返信すると、入力されたメールアドレス宛に返信できます。\n\n'
      + detail
      + '\n----------------------------------------\n'
      + `送信日時：${sentAt}\n`
      + `送信元IP：${ip}\n`,
    html: htmlMail(form.fields, values, '', `送信日時：${h(sentAt)}<br>送信元IP：${h(ip)}<br>このメールに返信すると、入力されたメールアドレス宛に返信できます。`),
  }];
  if (AUTO_REPLY) {
    const company = '株式会社エモリスリンク\n'
      + '〒060-0042 北海道札幌市中央区大通西7丁目1-1 井門札幌パークフロントビル 1F\n'
      + 'TEL：011-590-4888（受付 9:00〜18:00、土日祝を除く）\n'
      + 'https://emorislink.co.jp/\n';
    const notice = '※このメールはお問い合わせの受付時に自動でお送りしています。';
    const intro = 'このたびは株式会社エモリスリンクへお問い合わせいただき、誠にありがとうございます。\n以下の内容で受け付けいたしました。内容を確認のうえ、担当者より順次ご連絡いたします。';
    messages.push({
      to: values.email,
      subject: '【株式会社エモリスリンク】お問い合わせを受け付けました',
      text: `${values.name} 様\n\n${intro}\n\n${notice}\n\n========================================\n${detail}========================================\n\n${company}`,
      html: htmlMail(form.fields, values, `${h(values.name)} 様<br><br>${h(intro).replace(/\n/g, '<br>')}`, `${h(notice)}<br><br>${h(company).replace(/\n/g, '<br>')}`),
      optional: true, // 自動返信が失敗しても、受付自体は成功として扱う
    });
  }

  try {
    await sendAll(messages);
  } catch (err) {
    console.error('メール送信に失敗しました:', err.message);
    return respond(500, '送信に失敗しました。');
  }
  recent.set(ip, Date.now());
  return respond(200, 'ok');
};

// ===== メール本文 =====
function h(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// HTML 版：グレーの背景に白いカード、「項目名（太字）＋入力内容」を区切り線で並べる
function htmlMail(fields, values, intro, foot) {
  const rows = fields.map(([key, label], i) => {
    const v = values[key] ? h(values[key]).replace(/\n/g, '<br>') : '<span style="color:#999999;">（未選択）</span>';
    const border = i < fields.length - 1 ? 'border-bottom:1px solid #e5e5e5;' : '';
    return `<tr><td style="padding:26px 0;${border}"><div style="font-size:15px;font-weight:bold;color:#333333;margin:0 0 10px;">${h(label)}</div><div style="font-size:15px;line-height:1.7;color:#333333;">${v}</div></td></tr>`;
  }).join('');
  const font = "'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,'Yu Gothic',sans-serif";
  return '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
    + '<body style="margin:0;padding:0;background:#e8e9eb;">'
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8e9eb;font-family:${font};">`
    + '<tr><td align="center" style="padding:40px 12px;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #cccccc;">'
    + '<tr><td style="padding:24px 38px 12px;">'
    + (intro ? `<div style="font-size:14px;line-height:1.8;color:#555555;padding:16px 0 6px;">${intro}</div>` : '')
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
    + '</td></tr>'
    + (foot ? `<tr><td style="padding:0 38px 30px;"><div style="border-top:1px solid #e5e5e5;padding-top:20px;font-size:12px;line-height:1.8;color:#888888;">${foot}</div></td></tr>` : '')
    + '</table></td></tr></table></body></html>';
}

// ===== SMTP 送信（外部ライブラリなし） =====
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
// 日本語の件名・差出人名は 75 文字以内の区切りに分けて、折り返し行でつなぐ（メールの規格）
const encodeWord = (s) => {
  const chunks = [];
  let cur = '';
  for (const ch of s) {
    if (Buffer.byteLength(cur + ch) > 42) { chunks.push(cur); cur = ''; }
    cur += ch;
  }
  if (cur) chunks.push(cur);
  return chunks.map((c) => `=?UTF-8?B?${b64(c)}?=`).join('\r\n ');
};
const wrap76 = (s) => s.replace(/.{1,76}/g, '$&\r\n');

function isEmail(s) {
  return /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(s) && s.length <= 254;
}

function lower(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

function buildMessage({ to, replyTo, subject, text, html }) {
  const boundary = `emorislink-${crypto.randomBytes(12).toString('hex')}`;
  const domain = FROM_ADDRESS.split('@')[1] || 'localhost';
  const head = [
    `From: ${encodeWord(FROM_NAME)} <${FROM_ADDRESS}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: ${encodeWord(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean).join('\r\n');
  const part = (type, body) => `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(b64(body))}`;
  return `${head}\r\n\r\n${part('text/plain', text)}${part('text/html', html)}--${boundary}--\r\n`;
}

// 1回の接続でまとめて送る
async function sendAll(messages) {
  const socket = await new Promise((resolve, reject) => {
    const s = SMTP_SECURE
      ? tls.connect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST }, () => resolve(s))
      : net.connect({ host: SMTP_HOST, port: SMTP_PORT }, () => resolve(s));
    s.once('error', reject);
    s.setTimeout(15000, () => s.destroy(new Error('SMTP timeout')));
  });
  let buf = '';
  const waiters = [];
  let failure = null;
  socket.on('data', (d) => {
    buf += d.toString('utf8');
    // 応答は「コード-…」の行が続き、「コード …」の行で終わる
    while (waiters.length) {
      const lines = buf.split('\r\n');
      const complete = lines.slice(0, -1); // 最後の要素は改行まで届いていない途中の行
      const endIdx = complete.findIndex((l) => /^\d{3} /.test(l) || /^\d{3}$/.test(l));
      if (endIdx < 0) break;
      const reply = complete.slice(0, endIdx + 1);
      buf = lines.slice(endIdx + 1).join('\r\n');
      waiters.shift().resolve({ code: Number(reply[endIdx].slice(0, 3)), text: reply.join('\n') });
    }
  });
  socket.on('error', (e) => { failure = e; while (waiters.length) waiters.shift().reject(e); });
  socket.on('close', () => { const e = failure || new Error('SMTP connection closed'); while (waiters.length) waiters.shift().reject(e); });
  const read = () => new Promise((resolve, reject) => { waiters.push({ resolve, reject }); socket.emit('data', Buffer.alloc(0)); });
  // label はエラー時にログへ出す名前。送った内容（パスワードや本文）はログに出さない
  const cmd = async (line, expect, label) => {
    if (line !== null) socket.write(`${line}\r\n`);
    const r = await read();
    if (!expect.includes(r.code)) throw new Error(`SMTP ${label}: ${r.text}`);
    return r;
  };

  try {
    await cmd(null, [220], 'greeting');
    await cmd('EHLO emorislink.co.jp', [250], 'EHLO');
    await cmd('AUTH LOGIN', [334], 'AUTH');
    await cmd(b64(SMTP_USER), [334], 'AUTH user');
    await cmd(b64(SMTP_PASS), [235], 'AUTH password');
    for (const msg of messages) {
      try {
        await cmd(`MAIL FROM:<${SMTP_USER}>`, [250], 'MAIL FROM');
        await cmd(`RCPT TO:<${msg.to}>`, [250, 251], 'RCPT TO');
        await cmd('DATA', [354], 'DATA');
        // 行頭の「.」は「..」にする（SMTP の決まり）
        await cmd(buildMessage(msg).replace(/\r\n\./g, '\r\n..') + '\r\n.', [250], 'message');
      } catch (err) {
        if (!msg.optional) throw err;
        console.error('自動返信の送信に失敗しました:', err.message);
        await cmd('RSET', [250], 'RSET').catch(() => {});
      }
    }
    await cmd('QUIT', [221], 'QUIT').catch(() => {});
  } finally {
    socket.end();
  }
}
