// 検索エンジン・AI 向けの構造化データ（JSON-LD）。画面には表示されない
// 内容は各ページに掲載している情報だけを使う。掲載内容を変えたらここも合わせて直すこと
import config from './config.mjs';

const SITE = config.siteUrl;
const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;

const ADDRESS = {
  '@type': 'PostalAddress',
  postalCode: '060-0042',
  addressRegion: '北海道',
  addressLocality: '札幌市中央区',
  streetAddress: '大通西7丁目1-1 井門札幌パークフロントビル1F',
  addressCountry: 'JP',
};

// 会社情報（全ページ共通）
const organization = {
  '@type': ['Organization', 'EmploymentAgency'],
  '@id': ORG_ID,
  name: '株式会社エモリスリンク',
  alternateName: ['EMORISLINK', 'エモリスリンク'],
  url: `${SITE}/`,
  logo: `${SITE}/assets/img/logo-mark.png`,
  image: `${SITE}/assets/img/contact-bg.jpg`,
  description: config.defaultDescription,
  slogan: '人と技術の力で、働くをもっと自由に。',
  telephone: '+81-11-590-4888',
  email: config.mail,
  address: ADDRESS,
  areaServed: { '@type': 'AdministrativeArea', name: '北海道' },
  foundingDate: '2026-02-05',
  founder: { '@type': 'Person', name: '真浦 健人', jobTitle: '代表取締役社長' },
  parentOrganization: { '@type': 'Organization', name: 'メイホーグループ', url: 'https://www.meihogroup.com' },
  identifier: [
    { '@type': 'PropertyValue', name: '労働者派遣事業許可', value: '派01-301612' },
    { '@type': 'PropertyValue', name: '有料職業紹介事業許可', value: '01-ユ-300946' },
  ],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:00',
    closes: '18:00',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+81-11-590-4888',
    contactType: 'customer service',
    areaServed: 'JP',
    availableLanguage: 'Japanese',
  },
  sameAs: (config.social || []).filter((s) => s.url).map((s) => s.url),
  knowsAbout: ['人材派遣', '人材紹介', '紹介予定派遣', '業務委託', 'システムエンジニアリングサービス（SES）', 'システム開発', 'WEBデザイン', 'WEBマーケティング'],
};

const website = {
  '@type': 'WebSite',
  '@id': SITE_ID,
  url: `${SITE}/`,
  name: '株式会社エモリスリンク',
  inLanguage: 'ja',
  publisher: { '@id': ORG_ID },
};

// サービス詳細ページ（サービス名は各ページのタイトルと一致）
const SERVICE_TYPES = {
  'service/staffing/': '人材派遣',
  'service/recruitment/': '人材紹介',
  'service/temp-to-perm/': '紹介予定派遣',
  'service/outsourcing/': '業務委託',
  'service/ses/': 'システムエンジニアリングサービス（SES）',
  'service/system-development/': 'システム開発',
  'service/web-design/': 'WEBデザイン',
  'service/web-marketing/': 'WEBマーケティング',
};

// 求人（各募集ページの掲載内容）
const jobLocation = { '@type': 'Place', address: ADDRESS };
const JOBS = {
  'system-engineer/': {
    title: 'システムエンジニア',
    description: '<p>大手企業のプライム案件を中心に、Java・JavaScriptなどを使ったWeb系システム開発を担当していただきます。要件定義・基本設計などの上流工程から運用保守まで、希望とスキルに合わせて案件を自由に選択できます。</p><p>月給35万円〜55万円（経験・スキルを考慮して決定、固定残業30時間分を含む）。月平均残業5時間以内、年間休日125日、フルリモート相談可、前給保証制度あり。勤務地は自社内または札幌市内（中央区）のクライアント先、転居を伴う転勤なし。</p><p>応募資格：学歴不問。いずれかの言語経験がある方（Java / Python / PHP / JavaScript / C# / Ruby / Go / Swift 等）。第二新卒・ブランクの方も歓迎。</p>',
    minValue: 350000,
    maxValue: 550000,
  },
  'coordinator/': {
    title: '人材コーディネーター',
    description: '<p>派遣コーディネーターとして、クライアント企業とスタッフ双方の間に立ち、企業への人材提案・ヒアリング、スタッフ面談・配属調整、就業後のフォローを行っていただきます。未経験からでも挑戦できます。</p><p>月給23万円〜30万円（経験・スキルにより決定）、想定年収300万円〜390万円。勤務時間9:00〜18:00、月平均残業20時間以下、土日祝休み、年間休日125日。勤務地は北海道札幌市中央区、転勤なし。</p>',
    minValue: 230000,
    maxValue: 300000,
  },
};

function breadcrumb(meta, url) {
  if (!meta.hero) return null;
  const crumbs = [['', 'ホーム'], ...(meta.hero.crumbs || [])];
  const items = crumbs.map(([h, name], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}/${h}` }));
  items.push({ '@type': 'ListItem', position: items.length + 1, name: meta.hero.current || meta.hero.ja, item: url });
  return { '@type': 'BreadcrumbList', itemListElement: items };
}

export function jsonLd({ route, meta, url, title, desc, image, isSpecial, datePosted }) {
  if (isSpecial) return '';
  const graph = [organization, website];
  const page = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description: desc,
    inLanguage: 'ja',
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
    primaryImageOfPage: image,
  };
  if (route === 'company/about/' || route === 'company/') page['@type'] = 'AboutPage';
  if (route === 'contact/' || route === 'for-employers/' || route === 'job-seekers/' || route === 'company/access/') page['@type'] = 'ContactPage';
  graph.push(page);

  const bc = breadcrumb(meta, url);
  if (bc) { graph.push(bc); page.breadcrumb = { '@id': `${url}#breadcrumb` }; bc['@id'] = `${url}#breadcrumb`; }

  if (SERVICE_TYPES[route]) {
    graph.push({
      '@type': 'Service',
      '@id': `${url}#service`,
      name: SERVICE_TYPES[route],
      serviceType: SERVICE_TYPES[route],
      description: desc,
      url,
      image,
      provider: { '@id': ORG_ID },
      areaServed: { '@type': 'AdministrativeArea', name: '北海道' },
    });
  }

  const job = JOBS[route];
  if (job) {
    graph.push({
      '@type': 'JobPosting',
      title: job.title,
      description: job.description,
      datePosted,
      employmentType: 'FULL_TIME',
      hiringOrganization: { '@type': 'Organization', name: '株式会社エモリスリンク', sameAs: `${SITE}/`, logo: `${SITE}/assets/img/logo-mark.png` },
      jobLocation,
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'JPY',
        value: { '@type': 'QuantitativeValue', minValue: job.minValue, maxValue: job.maxValue, unitText: 'MONTH' },
      },
      directApply: true,
      url,
    });
  }

  if (route === 'news/company-established/') {
    graph.push({
      '@type': 'NewsArticle',
      headline: '株式会社エモリスリンクを設立しました。',
      description: desc,
      datePublished: '2026-02-05',
      image,
      inLanguage: 'ja',
      mainEntityOfPage: { '@id': `${url}#webpage` },
      author: { '@id': ORG_ID },
      publisher: { '@id': ORG_ID },
    });
  }

  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}
