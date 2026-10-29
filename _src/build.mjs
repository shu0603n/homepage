// 静的サイトビルド（依存パッケージなし）
//   node _src/build.mjs          … _src/pages から public/ に HTML を生成
//   node _src/build.mjs --serve  … 生成後、http://localhost:8080 でプレビュー
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import config from './config.mjs';
import { isoMap, PINS, pinPos } from './isomap.mjs';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const PAGES = path.join(SRC, 'pages');
const PARTIALS = path.join(SRC, 'partials');
const OUT = path.join(SRC, '..', 'public');
// CSS/JS の読み込みURLにビルドごとの番号を付け、ブラウザに古いファイルを使わせない
const VERSION = Date.now().toString(36);

const SERVICES = [
  ['staffing', '人材派遣'],
  ['recruitment', '人材紹介'],
  ['temp-to-perm', '紹介予定派遣'],
  ['outsourcing', '業務委託'],
  ['ses', 'システムエンジニアリング'],
  ['system-development', 'システム開発'],
  ['web-design', 'WEBデザイン'],
  ['web-marketing', 'WEBマーケティング'],
];
const COMPANY = [
  ['message', 'ご挨拶'],
  ['philosophy', '企業理念'],
  ['about', '会社概要'],
  ['history', '沿革'],
  ['access', 'アクセス'],
  ['group-overview', 'グループ概要'],
];
const RECRUIT = [
  ['system-engineer', 'システムエンジニア'],
  ['coordinator', '人材コーディネーター'],
];

// ナビゲーション定義：[セクションキー, 英語, 日本語, トップのパス, 子ページ[[パス, 名前]]]
const NAV = [
  ['service', 'Service', '事業内容', 'service/', SERVICES.map(([s, ja]) => [`service/${s}/`, ja])],
  ['company', 'Company', '企業情報', 'company/', COMPANY.map(([s, ja]) => [`company/${s}/`, ja])],
  ['recruit', 'Recruit', '採用情報', 'recruit/', RECRUIT.map(([s, ja]) => [`${s}/`, ja])],
  ['news', 'News', 'お知らせ', 'news/', []],
];

const ARROW = '<svg class="ico-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ---------- テンプレート ----------

function header(r, current) {
  const CHEV = '<svg class="ico-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const items = NAV.map(([key, en, ja, href, children]) => `
      <li class="gnav__item${current === key ? ' is-current' : ''}${children.length ? ' has-drop' : ''}">
        <a class="gnav__link" href="${r}${href}">${ja}${children.length ? CHEV : ''}</a>${children.length ? `
        <div class="gnav__drop">
          <div class="gnav__drop-head"><span class="gnav__drop-en">${en}</span><a href="${r}${href}">${ja}トップ${ARROW}</a></div>
          <ul>
            ${children.map(([h, t]) => `<li><a href="${r}${h}">${t}</a></li>`).join('\n            ')}
          </ul>
        </div>` : ''}
      </li>`).join('');

  const menuGroups = [...NAV, ['contact', 'Contact', 'お問い合わせ', 'contact/', [['for-employers/', '企業担当者様'], ['job-seekers/', 'お仕事をお探しの方']]]]
    .map(([, en, ja, href, children], i) => `
      <div class="menu__group" style="--i:${i}">
        <a class="menu__head" href="${r}${href}"><span class="menu__en">${en}</span><span class="menu__ja">${ja}</span></a>
        ${children.length ? `<ul>${children.map(([h, t]) => `<li><a href="${r}${h}">${t}</a></li>`).join('')}</ul>` : ''}
      </div>`).join('');

  return `
<div class="veil" aria-hidden="true"><img src="${r}assets/img/logo-mark.png" alt="" width="120" height="120"></div>

<header class="header" id="header">
  <div class="header__inner">
    <a class="header__logo" href="${r}" aria-label="${config.siteName} トップへ"><img src="${r}assets/img/logo-footer.png" alt="EMORISLINK" width="270" height="66"></a>
    <nav class="gnav" aria-label="グローバルナビゲーション">
      <ul class="gnav__list">${items}
      </ul>
    </nav>
    <div class="header__actions">
      <a class="header__sub" href="${r}job-seekers/">お仕事をお探しの方</a>
      <a class="header__cta" href="${r}contact/">お問い合わせ${ARROW}</a>
    </div>
    <button class="menu-btn" type="button" aria-label="メニューを開く" aria-expanded="false" aria-controls="drawer"><span></span><span></span></button>
  </div>
</header>

<div class="menu" id="drawer" hidden>
  <div class="blobs" aria-hidden="true"><span></span><span></span><span></span></div>
  <nav class="menu__nav" aria-label="スマートフォン用メニュー">${menuGroups}
  </nav>
  <p class="menu__tel">TEL <a href="tel:${config.tel.replace(/-/g, '')}">${config.tel}</a><small>受付 9:00〜18:00（土日祝除く）</small></p>
</div>`;
}

// トップページの事業マップ（ピン・リスト）
function mapPins(r) {
  return PINS.map((p) => {
    const { left, top } = pinPos(p);
    return `<button class="map-pin" type="button" data-pin="${p.id}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;--c:${p.color}" aria-label="${p.no} ${p.title}"><span>${p.no}</span></button>`;
  }).join('\n      ');
}
function mapList(r) {
  return PINS.map((p) => `<li><button class="map__item" type="button" data-pin="${p.id}" data-title="${p.title}" data-en="${p.en}" data-text="${p.text}" data-href="${r}${p.href}" data-link="${p.link}" style="--c:${p.color}"><span class="map__no">${p.no}</span><span class="map__name">${p.title}</span></button></li>`).join('\n        ');
}

function footer(r) {
  const col = (en, href, items) => `
      <div class="footer__col">
        <a class="footer__title" href="${r}${href}">${en}</a>
        ${items.length ? `<ul>${items.map(([h, t]) => `<li><a href="${r}${h}">${t}</a></li>`).join('')}</ul>` : ''}
      </div>`;
  return `
<section class="contact-cta" aria-labelledby="contact-cta-title">
  <div class="blobs" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="contact-cta__inner">
    <p class="eyebrow eyebrow--light">Contact</p>
    <h2 class="contact-cta__title split" id="contact-cta-title">一緒に、未来をつなごう。</h2>
    <p class="contact-cta__lead">人材のこと、ITのこと、これからの働き方のこと。<br class="pc-only">まずはお気軽にご相談ください。</p>
    <div class="contact-cta__cards">
      <a class="cta-card tilt" href="${r}for-employers/">
        <span class="cta-card__en">For Business</span>
        <strong class="cta-card__title">企業のご担当者様</strong>
        <span class="cta-card__text">人材派遣・人材紹介・SES・システム開発・Web制作のご相談</span>
        <span class="cta-card__arrow">${ARROW}</span>
      </a>
      <a class="cta-card tilt" href="${r}job-seekers/">
        <span class="cta-card__en">For Job Seekers</span>
        <strong class="cta-card__title">お仕事をお探しの方</strong>
        <span class="cta-card__text">お仕事探し・ご応募・キャリアのご相談</span>
        <span class="cta-card__arrow">${ARROW}</span>
      </a>
    </div>
    <p class="contact-cta__tel">お電話でのお問い合わせ <a href="tel:${config.tel.replace(/-/g, '')}">${config.tel}</a><small>受付 9:00〜18:00（土日祝除く）</small></p>
  </div>
</section>

<footer class="footer">
  <div class="footer__inner">
    <div class="footer__info">
      <a class="footer__logo" href="${r}"><img src="${r}assets/img/logo-footer.png" alt="EMORISLINK" width="270" height="66" loading="lazy"></a>
      <p class="footer__catch">人と技術の力で、働くをもっと自由に。</p>
      <address class="footer__addr">〒060-0042<br>北海道札幌市中央区大通西7丁目1-1<br>井門札幌パークフロントビル 1F<br>TEL <a href="tel:${config.tel.replace(/-/g, '')}">${config.tel}</a></address>
      <p class="footer__group"><img src="${r}assets/img/logo-meihogroup.png" alt="" loading="lazy">メイホーグループ</p>
    </div>
    <nav class="footer__nav" aria-label="フッターナビゲーション">${col('Service', 'service/', SERVICES.map(([s, ja]) => [`service/${s}/`, ja]))}${col('Company', 'company/', COMPANY.map(([s, ja]) => [`company/${s}/`, ja]))}${col('Recruit', 'recruit/', RECRUIT.map(([s, ja]) => [`${s}/`, ja]))}${col('Contact', 'contact/', [['for-employers/', '企業担当者様'], ['job-seekers/', 'お仕事をお探しの方'], ['news/', 'お知らせ']])}
    </nav>
  </div>
  <div class="footer__bottom">
    <p class="footer__copy">&copy; ${new Date().getFullYear()} EMORISLINK Co., Ltd.</p>
    <p class="footer__license">労働者派遣事業 派01-301612 ／ 有料職業紹介事業 01-ユ-300946</p>
  </div>
  <p class="footer__big" aria-hidden="true">EMORISLINK</p>
</footer>

<a class="floating-banner" href="${r}system-engineer/">
  <img src="${r}assets/img/floating-banner.png" alt="公式HP経由で応募いただいた方限定 入社祝い金20万円 経験者システムエンジニア 詳細・応募はこちら" width="310" height="162">
</a>
<a class="pagetop" href="#top" aria-label="ページの先頭へ">
  <svg viewBox="0 0 56 56" aria-hidden="true"><circle class="pagetop__track" cx="28" cy="28" r="26"/><circle class="pagetop__ring" cx="28" cy="28" r="26"/></svg>
  <span aria-hidden="true">↑</span>
</a>`;
}

function pageHero(r, hero) {
  if (!hero) return '';
  const crumbs = [['', 'HOME'], ...(hero.crumbs || [])];
  const tag = hero.noH1 ? 'p' : 'h1';
  return `
<section class="page-hero">
  <div class="blobs" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="page-hero__inner">
    <div class="page-hero__text">
      <p class="eyebrow eyebrow--load">${hero.en}</p>
      <${tag} class="page-hero__title split split--load">${hero.ja}</${tag}>
      ${hero.catch ? `<p class="page-hero__catch">${hero.catch}</p>` : ''}
    </div>
    ${hero.img ? `<div class="page-hero__visual">
      <div class="link-frame link-frame--sm">
        <div class="link-frame__a"><img src="${r}assets/img/${hero.img}" alt=""></div>
        <span class="link-frame__b"></span>
        <span class="link-frame__pill"></span>
      </div>
    </div>` : ''}
  </div>
</section>
<nav class="breadcrumb" aria-label="パンくずリスト">
  <ol>
    ${crumbs.map(([h, t]) => `<li><a href="${r}${h}">${t}</a></li>`).join('')}
    <li aria-current="page">${hero.current || hero.ja}</li>
  </ol>
</nav>`;
}

function layout({ meta, body, route }) {
  const depth = route ? route.split('/').filter(Boolean).length : 0;
  const r = depth ? '../'.repeat(depth) : './';
  const title = meta.title ? `${meta.title} | ${config.siteName}` : `${config.siteName} | 人材派遣・人材紹介・SES・システム開発・Web制作`;
  const desc = meta.description || config.defaultDescription;
  const url = `${config.siteUrl}/${route}`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${route ? 'article' : 'website'}">
<meta property="og:site_name" content="${config.siteName}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${config.siteUrl}/assets/img/${meta.ogImage || 'banner-1.jpg'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#004968">
<link rel="icon" href="${r}assets/img/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="${r}assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Caveat:wght@600&family=Zen+Kaku+Gothic+New:wght@500;700;900&family=Noto+Sans+JP:wght@400;500;700&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
<link rel="stylesheet" href="${r}assets/css/style.css?v=${VERSION}">
<script>document.documentElement.classList.add('js')</script>
<script src="${r}assets/js/main.js?v=${VERSION}" defer></script>
</head>
<body class="${meta.bodyClass || 'page'}" id="top">
<a class="skip-link" href="#main">本文へスキップ</a>
${header(r, meta.section)}
<main id="main">
${pageHero(r, meta.hero)}
${body.replaceAll('{{root}}', r).replaceAll('{{arrow}}', ARROW).replace('{{isomap}}', () => isoMap()).replace('{{mappins}}', () => mapPins(r)).replace('{{maplist}}', () => mapList(r)).replaceAll(`href="${r}${route}"`, `href="${r}${route}" aria-current="page"`)}
</main>
${footer(r)}
</body>
</html>
`;
}

// ---------- ビルド ----------

function readPartial(name) {
  return fs.readFileSync(path.join(PARTIALS, `${name}.html`), 'utf8');
}

function expand(html) {
  return html
    .replace(/<!--#include ([\w-]+)-->/g, (_, n) => expand(readPartial(n)))
    .replaceAll('{{tel}}', config.tel)
    .replaceAll('{{mail}}', config.mail)
    .replace(/\{\{formEndpoint\.(\w+)\}\}/g, (_, k) => config.formEndpoint[k] || '');
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : d.name.endsWith('.html') ? [p] : [];
  });
}

function build() {
  const routes = [];
  for (const file of walk(PAGES)) {
    const rel = path.relative(PAGES, file).replace(/\\/g, '/');
    const src = fs.readFileSync(file, 'utf8');
    const m = src.match(/^<!--(\{[\s\S]*?\})-->\s*/);
    if (!m) throw new Error(`${rel}: 先頭に <!--{...}--> のページ設定がありません`);
    const meta = JSON.parse(m[1]);
    const body = expand(src.slice(m[0].length));
    const isSpecial = rel === '404.html';
    // index.html → /, foo/index.html → /foo/
    const route = isSpecial ? '' : rel.replace(/index\.html$/, '');
    const outFile = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    let html = layout({ meta, body, route });
    // 404 はどの階層からでも表示されるのでルート絶対パスにする
    if (isSpecial) html = html.replaceAll('"./', '"/').replaceAll("'./", "'/");
    fs.writeFileSync(outFile, html);
    if (!isSpecial) routes.push(route);
  }
  routes.sort();
  fs.writeFileSync(
    path.join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
      .map((r) => `  <url><loc>${config.siteUrl}/${r}</loc></url>`)
      .join('\n')}\n</urlset>\n`
  );
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.siteUrl}/sitemap.xml\n`);
  console.log(`built ${routes.length + 1} pages → ${path.relative(process.cwd(), OUT) || OUT}`);
}

function serve(port = 8080) {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mov': 'video/mp4', '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain' };
  http
    .createServer((req, res) => {
      let p = path.join(OUT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(OUT)) return res.writeHead(403).end();
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
      if (!fs.existsSync(p)) {
        res.writeHead(404, { 'Content-Type': types['.html'] });
        return res.end(fs.readFileSync(path.join(OUT, '404.html')));
      }
      res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    })
    .listen(port, () => console.log(`preview: http://localhost:${port}/`));
}

build();
if (process.argv.includes('--serve')) serve();
