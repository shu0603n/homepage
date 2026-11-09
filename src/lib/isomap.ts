// トップページ「LINK MAP」のアイソメトリック地図（SVG）をビルド時に生成する
// 札幌・大通公園とテレビ塔を中心に、本社から各事業へ「つながり」が伸びる街を描く

const S = 30; // 1グリッドの大きさ(px)
const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
const OX = 522; // 原点のずれ（viewBox 内に収めるため）
const OY = 130;
export const VIEW = { w: 1200, h: 820 };

type Pt = [number, number];
const P = (x: number, y: number, z = 0): Pt => [OX + (x - y) * COS * S, OY + (x + y) * SIN * S - z * S];
const pts = (arr: Pt[]) => arr.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');

// 直方体：top/左面/右面の3色
function box(x: number, y: number, w: number, d: number, h: number, [top, left, right]: readonly string[], z0 = 0, extra = '') {
  const t = [P(x, y, z0 + h), P(x + w, y, z0 + h), P(x + w, y + d, z0 + h), P(x, y + d, z0 + h)];
  const l = [P(x, y + d, z0), P(x + w, y + d, z0), P(x + w, y + d, z0 + h), P(x, y + d, z0 + h)];
  const r = [P(x + w, y, z0), P(x + w, y + d, z0), P(x + w, y + d, z0 + h), P(x + w, y, z0 + h)];
  return `<g${extra}><polygon points="${pts(l)}" fill="${left}"/><polygon points="${pts(r)}" fill="${right}"/><polygon points="${pts(t)}" fill="${top}"/></g>`;
}

// 建物の窓（左面・右面に並べる）
function windows(x: number, y: number, w: number, d: number, h: number, color: string, z0 = 0, gap = 0.9) {
  let out = '';
  for (let z = z0 + 0.6; z < z0 + h - 0.4; z += gap) {
    for (let i = 0.35; i < w - 0.3; i += 0.8) {
      out += `<polygon points="${pts([P(x + i, y + d, z), P(x + i + 0.45, y + d, z), P(x + i + 0.45, y + d, z + 0.45), P(x + i, y + d, z + 0.45)])}" fill="${color}"/>`;
    }
    for (let i = 0.35; i < d - 0.3; i += 0.8) {
      out += `<polygon points="${pts([P(x + w, y + i, z), P(x + w, y + i + 0.45, z), P(x + w, y + i + 0.45, z + 0.45), P(x + w, y + i, z + 0.45)])}" fill="${color}" opacity=".75"/>`;
    }
  }
  return `<g>${out}</g>`;
}

// 平面（道路・公園など）
const flat = (x: number, y: number, w: number, d: number, fill: string, z = 0.6) => `<polygon points="${pts([P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)])}" fill="${fill}"/>`;

function tree(x: number, y: number, z = 0.6, s = 1) {
  const [bx, by] = P(x, y, z);
  return `<g class="map-tree"><rect x="${(bx - 1.5).toFixed(1)}" y="${(by - 10 * s).toFixed(1)}" width="3" height="${(10 * s).toFixed(1)}" fill="#8a6a4f"/><ellipse cx="${bx.toFixed(1)}" cy="${(by - 16 * s).toFixed(1)}" rx="${(10 * s).toFixed(1)}" ry="${(11 * s).toFixed(1)}" fill="#6cbf6a"/><ellipse cx="${(bx - 3 * s).toFixed(1)}" cy="${(by - 19 * s).toFixed(1)}" rx="${(4.5 * s).toFixed(1)}" ry="${(4.5 * s).toFixed(1)}" fill="#9be08e"/></g>`;
}

function house(x: number, y: number, color: string) {
  const h = 1.1;
  const w = 1.4, d = 1.4;
  const roof = [P(x, y, h), P(x + w, y, h), P(x + w, y + d, h), P(x, y + d, h)];
  const ridgeA = P(x + w / 2, y, h + 0.9);
  const ridgeB = P(x + w / 2, y + d, h + 0.9);
  return `${box(x, y, w, d, h, ['#fff', '#f1f4f6', '#dde4e8'], 0.6)}
  <polygon points="${pts([P(x, y + d, h + 0.6), P(x + w / 2, y + d, h + 1.5), P(x + w, y + d, h + 0.6)])}" fill="#eef2f4"/>
  <polygon points="${pts([P(x + w / 2, y, h + 1.5), P(x + w / 2, y + d, h + 1.5), P(x + w, y + d, h + 0.6), P(x + w, y, h + 0.6)])}" fill="${color}"/>`;
}

// ---------- 動くもの（車・人） ----------
// 原点 (0,0) を中心にした小さな直方体（車の部品用）。w は x 方向、d は y 方向、z0 は地面からの浮き
function localBox(cx: number, cy: number, w: number, d: number, h: number, [top, left, right]: readonly string[], z0 = 0) {
  const Q = (x: number, y: number, z: number): Pt => [(x - y) * COS * S, (x + y) * SIN * S - z * S];
  const x0 = cx - w / 2, y0 = cy - d / 2;
  const t = [Q(x0, y0, z0 + h), Q(x0 + w, y0, z0 + h), Q(x0 + w, y0 + d, z0 + h), Q(x0, y0 + d, z0 + h)];
  const l = [Q(x0, y0 + d, z0), Q(x0 + w, y0 + d, z0), Q(x0 + w, y0 + d, z0 + h), Q(x0, y0 + d, z0 + h)];
  const r = [Q(x0 + w, y0, z0), Q(x0 + w, y0 + d, z0), Q(x0 + w, y0 + d, z0 + h), Q(x0 + w, y0, z0 + h)];
  return `<polygon points="${pts(l)}" fill="${left}"/><polygon points="${pts(r)}" fill="${right}"/><polygon points="${pts(t)}" fill="${top}"/>`;
}

// 車：車体＋客室（客室は進行方向の後ろ寄り）。axis='x' は x 方向の道路、dir は進む向き（+1 / -1）
function carShape(axis: 'x' | 'y', dir: 1 | -1, body: readonly string[]) {
  const L = 0.95, Wd = 0.5;
  const [w, d] = axis === 'x' ? [L, Wd] : [Wd, L];
  const back = -dir * 0.12; // 客室を後ろへずらす
  const [cx, cy] = axis === 'x' ? [back, 0] : [0, back];
  const [cw, cd] = axis === 'x' ? [0.5, 0.42] : [0.42, 0.5];
  const glass = ['#eaf6fb', '#bcd9e6', '#a3c8d8'];
  return `<ellipse cx="0" cy="3" rx="${axis === 'x' ? 17 : 17}" ry="6" fill="#004968" opacity=".12"/>`
    + localBox(0, 0, w, d, 0.3, body, 0.06)
    + localBox(cx, cy, cw, cd, 0.22, glass, 0.36);
}

// 人：影＋体＋頭（いつも正面向きの小さな人形）
function personShape(color: string) {
  return `<ellipse cx="0" cy="0" rx="5" ry="2.2" fill="#004968" opacity=".14"/>`
    + `<rect x="-3" y="-12" width="6" height="10" rx="3" fill="${color}"/>`
    + `<circle cx="0" cy="-15.5" r="3.2" fill="#f2d2b6"/>`;
}

// 端から端へ一方通行で進み、端では消えて反対側から現れる
function mover(shape: string, from: Pt, to: Pt, dur: number, delay: number) {
  const a = P(from[0], from[1], 0.6), b = P(to[0], to[1], 0.6);
  const path = `M${a[0].toFixed(1)},${a[1].toFixed(1)} L${b[0].toFixed(1)},${b[1].toFixed(1)}`;
  return `<g opacity="0">${shape}<animateMotion dur="${dur}s" begin="${delay}s" repeatCount="indefinite" path="${path}"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.06;.94;1" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/></g>`;
}

function movers() {
  const red = ['#ffd0e3', '#ff8fbd', '#f06ea6'];
  const orange = ['#ffe3c4', '#ffbe7d', '#f5a05a'];
  const teal = ['#d6f2f4', '#7fcdd4', '#4fb4be'];
  const blue = ['#d7ecf9', '#6fbbe6', '#3d9bd3'];
  const white = ['#ffffff', '#e3eaee', '#c9d4da'];
  const purple = ['#e4e0fc', '#a99ff5', '#8b7ff0'];
  // 道路の車線：横の道路（y=6.6〜7.8 / 10.8〜12）、縦の道路（x=7.2〜8.4 / 15.2〜16.4）
  const cars = [
    mover(carShape('x', 1, red), [0.3, 6.95], [24.7, 6.95], 18, 0),
    mover(carShape('x', -1, teal), [24.7, 7.45], [0.3, 7.45], 21, -7),
    mover(carShape('x', 1, white), [0.3, 11.15], [24.7, 11.15], 20, -12),
    mover(carShape('x', -1, purple), [24.7, 11.65], [0.3, 11.65], 24, -3),
    mover(carShape('y', 1, orange), [7.55, 0.3], [7.55, 18.7], 16, -5),
    mover(carShape('y', -1, blue), [8.05, 18.7], [8.05, 0.3], 19, -11),
    mover(carShape('y', 1, white), [15.55, 0.3], [15.55, 18.7], 17, -2),
    mover(carShape('y', -1, red), [16.05, 18.7], [16.05, 0.3], 22, -14),
  ];
  // 大通公園を歩く人。木の列（y=8.2 / 10.2）のすぐ奥を歩かせて、手前の木に隠れるのを正しい見え方にする
  // 奥側の列はテレビ塔の土台（x=21.4〜22.8, y=8.6〜10）と重ならないよう、塔の手前で消える
  const people = [
    mover(personShape('#ff6fb1'), [0.6, 7.95], [24.4, 7.95], 60, -10),
    mover(personShape('#3aafb9'), [24.4, 8.02], [0.6, 8.02], 70, -40),
    mover(personShape('#7a6cf0'), [0.6, 9.95], [20.6, 9.95], 54, -25),
    mover(personShape('#ffb36b'), [20.6, 9.9], [0.6, 9.9], 50, -5),
  ];
  return cars.join('') + people.join('');
}

// 地図上のピン（HTML のボタンとして重ねる）
export const PINS = [
  { id: 'hq', no: '01', x: 3.5, y: 13.2, z: 7.4, color: '#004968', title: '本社（札幌・大通）', en: 'Head Office', text: '札幌・大通に本社を構え、地域に根ざしたサービスを提供しています。地下鉄 大通駅から徒歩5分。', href: 'company/access/', link: 'アクセスを見る' },
  { id: 'staffing', no: '02', x: 3.5, y: 3, z: 4.6, color: '#ff6fb1', title: '人材派遣・業務委託', en: 'Staffing / Outsourcing', text: '工場・製造、倉庫・物流、オフィスワークまで。即戦力人材の派遣や業務のお任せで、現場の安定運営を支えます。', href: 'service/staffing/', link: '人材派遣を見る' },
  { id: 'recruitment', no: '03', x: 11, y: 3.4, z: 9.2, color: '#ffb36b', title: '人材紹介・紹介予定派遣', en: 'Recruitment', text: 'スキルだけでなく、企業文化や成長ビジョンとの適合性まで見極めた人材をご紹介します。', href: 'service/recruitment/', link: '人材紹介を見る' },
  { id: 'ses', no: '04', x: 18.5, y: 3.5, z: 6.6, color: '#3aafb9', title: 'システムエンジニアリング', en: 'System Engineering', text: '経験豊富なエンジニアがプロジェクトに参画し、開発・運用・改善までをサポートします。', href: 'service/ses/', link: 'SESを見る' },
  { id: 'dev', no: '05', x: 18.5, y: 13.5, z: 5.4, color: '#1fa0d8', title: 'システム開発', en: 'System Development', text: '企画・設計から開発・運用まで一貫対応。業務に密着したシステムで企業の成長を支えます。', href: 'service/system-development/', link: 'システム開発を見る' },
  { id: 'web', no: '06', x: 10.5, y: 13.5, z: 6.4, color: '#8fd65a', title: 'WEBデザイン・マーケティング', en: 'Web Design / Marketing', text: '伝わるデザインと成果につながる導線設計で、Webからの集客と情報発信を支援します。', href: 'service/web-design/', link: 'WEBデザインを見る' },
  { id: 'seekers', no: '07', x: 22.6, y: 15.6, z: 3.6, color: '#7a6cf0', title: 'お仕事をお探しの方', en: 'For Job Seekers', text: 'あなたのご希望や働き方に合わせて、お仕事探しをサポートします。まずはお気軽にご相談ください。', href: 'job-seekers/', link: '相談・応募する' },
];

export function pinPos(p: { x: number; y: number; z: number }) {
  const [x, y] = P(p.x, p.y, p.z);
  return { left: (x / VIEW.w) * 100, top: (y / VIEW.h) * 100, x, y };
}

export function isoMap() {
  const W = 25, D = 19;
  const parts = [];

  // 地面
  parts.push(box(0, 0, W, D, 0.6, ['#eaf5f2', '#cfe4e0', '#b8d3d0']));
  // 道路
  const road = '#dfe7ea';
  parts.push(flat(0, 6.6, W, 1.2, road), flat(0, 10.8, W, 1.2, road), flat(7.2, 0, 1.2, D, road), flat(15.2, 0, 1.2, D, road));
  // 横断歩道の白線
  for (let i = 0; i < 5; i++) parts.push(flat(7.25 + i * 0.24, 6.65, 0.12, 1.1, '#fff', 0.61));
  // 大通公園
  parts.push(flat(0, 7.8, W, 3, '#c8ebb8'));
  parts.push(flat(0.4, 8.9, W - 0.8, 0.8, '#b5e0a3', 0.62));
  // 噴水
  const [fx, fy] = P(11.8, 9.3, 0.62);
  parts.push(`<ellipse cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" rx="22" ry="12" fill="#bfe8f2"/><ellipse class="map-fountain" cx="${fx.toFixed(1)}" cy="${(fy - 4).toFixed(1)}" rx="6" ry="8" fill="#e8fbff" opacity=".9"/>`);

  // 道路を走る車・公園を歩く人。建物より先に描くので、建物の陰に入ると自然に隠れる
  parts.push(`<g class="map-movers">${movers()}</g>`);

  // ---------- 地面に立つもの（建物・木）----------
  // 敷地（x0〜x1, y0〜y1）を持たせて、奥にあるものから順に描く（手前のものが奥のものを隠す）
  type Obj = { x0: number; y0: number; x1: number; y1: number; svg: string };
  const objs: Obj[] = [];
  const add = (x0: number, y0: number, x1: number, y1: number, ...svg: string[]) => objs.push({ x0, y0, x1, y1, svg: svg.join('') });

  // 工場・倉庫（人材派遣）
  const factory = [box(1, 1, 5, 4, 2.2, ['#ffe1ee', '#ffc3dc', '#f6a2c6'], 0.6)];
  for (let i = 0; i < 3; i++) factory.push(box(1.3 + i * 1.6, 1.4, 1.2, 3.2, 0.5, ['#fff3f8', '#ffd7e8', '#f8bcd6'], 2.8));
  factory.push(box(1.4, 1.3, 0.5, 0.5, 2.4, ['#c9d3d8', '#b3c0c6', '#9aa9b0'], 2.8));
  factory.push(`<circle class="map-smoke" cx="${P(1.65, 1.55, 5.6)[0].toFixed(1)}" cy="${P(1.65, 1.55, 5.6)[1].toFixed(1)}" r="7" fill="#fff" opacity=".8"/>`);
  add(1, 1, 6, 5, ...factory);
  add(2.2, 5.2, 4.4, 6.1, box(2.2, 5.2, 2.2, 0.9, 0.9, ['#fff', '#e6ecef', '#cfd8dd'], 0.6)); // トラック荷台
  add(4.4, 5.3, 5.2, 6.1, box(4.4, 5.3, 0.8, 0.8, 0.7, ['#ff9bc4', '#f17aae', '#e05f97'], 0.6));

  // オフィスタワー（人材紹介）
  add(9.6, 2.2, 12.2, 4.8, box(9.6, 2.2, 2.6, 2.6, 7.8, ['#fff1df', '#ffd9b0', '#f6bf86'], 0.6), windows(9.6, 2.2, 2.6, 2.6, 7.8, '#fff8ee', 0.6));
  add(12.6, 3.4, 14.4, 5.2, box(12.6, 3.4, 1.8, 1.8, 4.6, ['#ffeedd', '#ffdcb8', '#f4c493'], 0.6), windows(12.6, 3.4, 1.8, 1.8, 4.6, '#fff8ee', 0.6));

  // ITビル（SES）
  add(17.2, 2, 20.2, 5, box(17.2, 2, 3, 3, 5, ['#e3f6f7', '#b9e4e8', '#8fd0d6'], 0.6), windows(17.2, 2, 3, 3, 5, '#3aafb9', 0.6, 0.8), box(18.4, 3.2, 0.25, 0.25, 1.4, ['#9aa9b0', '#8796a0', '#76858f'], 5.6));
  add(20.6, 2.4, 22.8, 4.6, box(20.6, 2.4, 2.2, 2.2, 2.6, ['#eef9fa', '#cdeef1', '#ade0e5'], 0.6));

  // 本社（EMORISLINK）＋屋上のロゴ（ひし形）
  const [lx, ly] = P(3.7, 13.4, 6.95);
  add(2, 11.9, 5.4, 14.9,
    box(2, 11.9, 3.4, 3, 6, ['#d7ecf3', '#5d8fa6', '#004968'], 0.6),
    windows(2, 11.9, 3.4, 3, 6, '#9fd9e2', 0.6, 0.85),
    box(2.2, 12.1, 3, 2.6, 0.3, ['#ffffff', '#e6eef2', '#cfdde4'], 6.6),
    `<g class="map-logo"><rect x="${(lx - 10).toFixed(1)}" y="${(ly - 22).toFixed(1)}" width="20" height="20" rx="5" transform="rotate(45 ${lx.toFixed(1)} ${(ly - 12).toFixed(1)})" fill="url(#mapGrad)"/></g>`);

  // Webスタジオ（ビルボード付き）
  add(9.2, 12.4, 12.2, 15.2, box(9.2, 12.4, 3, 2.8, 3.4, ['#eefae7', '#d1efc2', '#b4e29f'], 0.6), windows(9.2, 12.4, 3, 2.8, 3.4, '#ffffff', 0.6), box(9.6, 13.4, 2.4, 0.2, 1.6, ['#fff', 'url(#mapGrad)', '#c7d3d9'], 4.2));

  // 開発ラボ（システム開発）＋屋上のドーム
  const [dx, dy] = P(18.7, 13.7, 3.8);
  add(17.2, 12.2, 20.2, 15.2, box(17.2, 12.2, 3, 3, 3.2, ['#e1f2fb', '#b5def3', '#86c6e8'], 0.6), windows(17.2, 12.2, 3, 3, 3.2, '#1fa0d8', 0.6, 0.8),
    `<ellipse cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" rx="26" ry="15" fill="#d6f0fb"/><path d="M${(dx - 26).toFixed(1)},${dy.toFixed(1)} a26,22 0 0 1 52,0" fill="#eaf8ff" stroke="#b5def3"/>`);

  // 住宅（求職者）
  const roofs = ['#7a6cf0', '#9b90f5', '#6b5fe0', '#b0a8f7', '#8a7ef3'];
  [[20.8, 13.2], [22.8, 13.2], [20.8, 15.6], [22.8, 15.6], [21.8, 17.4]].forEach(([x, y], i) => add(x, y, x + 1.4, y + 1.4, house(x, y, roofs[i])));

  // テレビ塔（大通公園の東端）
  // 赤い柱は展望台（白い箱）の下と上で分けて描く：下の柱 → 展望台 → 上の柱 → アンテナ
  // 1本で描くと展望台の上面が上の柱の根元を塗りつぶし、箱だけが浮いて見えるため
  const towerRed = ['#ff9a6b', '#ff7b47', '#e86533'];
  add(21.4, 8.6, 22.8, 10,
    box(21.4, 8.6, 1.4, 1.4, 0.5, ['#ffd2b8', '#ffb38c', '#f39a6d'], 0.6),
    box(21.85, 9.05, 0.5, 0.5, 4.1, towerRed, 1.1), // 下の柱（土台〜展望台の底）
    box(21.55, 8.75, 1.1, 1.1, 0.8, ['#fff', '#e8eef1', '#cfd8dd'], 5.2), // 展望台
    box(21.85, 9.05, 0.5, 0.5, 1.5, towerRed, 6.0), // 上の柱（展望台の上〜塔の先）
    box(22.02, 9.22, 0.16, 0.16, 2.2, towerRed, 7.5));

  // 木（公園・街角）。幹の位置を小さな敷地として扱う
  const T = 0.15;
  [[1, 8.2], [2.6, 10.2], [4.2, 8.2], [5.6, 10.2], [9, 8.2], [10.4, 10.2], [13.6, 8.2], [14.4, 10.2], [17.4, 8.2], [18.8, 10.2], [20.2, 8.4], [24, 10.2]].forEach(([x, y]) => add(x - T, y - T, x + T, y + T, tree(x, y)));
  [[6.6, 1.2], [14.8, 1.2], [6.6, 17.6], [14.6, 17.4], [24.2, 1.4]].forEach(([x, y]) => add(x - T, y - T, x + T, y + T, tree(x, y, 0.6, 0.8)));

  // 奥→手前の順に並べる。a が b の奥にあるのは、x か y のどちらかで a が b より手前側にはみ出していないとき
  const behind = (a: Obj, b: Obj) => (a.x1 <= b.x0 && a.y0 < b.y1) || (a.y1 <= b.y0 && a.x0 < b.x1);
  const rest = objs.slice().sort((a, b) => a.x1 + a.y1 - (b.x1 + b.y1));
  while (rest.length) {
    const i = rest.findIndex((o) => !rest.some((p) => p !== o && behind(p, o)));
    parts.push(rest.splice(i < 0 ? 0 : i, 1)[0].svg);
  }

  // 本社から各拠点へのつながり
  const [hx, hy] = P(3.5, 13.2, 7.4);
  const links = PINS.filter((p) => p.id !== 'hq').map((p) => {
    const [px, py] = P(p.x, p.y, p.z);
    const mx = (hx + px) / 2;
    const my = Math.min(hy, py) - 70;
    return `<path class="map-link" d="M${hx.toFixed(1)},${hy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}" stroke="${p.color}"/>`;
  }).join('');

  return `<svg class="map__svg" viewBox="0 0 ${VIEW.w} ${VIEW.h}" role="img" aria-label="札幌・大通を舞台にしたエモリスリンクの事業マップ。本社から人材派遣、人材紹介、システムエンジニアリング、システム開発、Web、求職者へと線でつながっています。">
  <defs>
    <linearGradient id="mapGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6fb1"/><stop offset=".35" stop-color="#ffb36b"/><stop offset=".65" stop-color="#8fd65a"/><stop offset="1" stop-color="#1fa0d8"/></linearGradient>
  </defs>
  <ellipse cx="${(VIEW.w / 2 + 10).toFixed(0)}" cy="${(VIEW.h - 40).toFixed(0)}" rx="560" ry="60" fill="#004968" opacity=".06"/>
  ${parts.join('\n  ')}
  <g class="map-links" fill="none">${links}</g>
</svg>`;
}
