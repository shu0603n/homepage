// サイト全体の設定
export default {
  siteName: '株式会社エモリスリンク',
  siteUrl: 'https://emorislink.co.jp',
  defaultDescription:
    '株式会社エモリスリンクは、札幌を拠点に人材派遣・人材紹介・SES・システム開発・Web制作を通じて、人と企業をつなぐ架け橋となることを目指しています。',
  tel: '011-590-4888',
  mail: 'info@emorislink.co.jp',

  // お問い合わせフォームの送信先
  // 標準は同じサーバーの api/contact.php（_src/api/contact.php をビルド時にコピー。宛先などの設定はそのファイル内）
  // PHP が使えないサーバーでは Formspree などの URL（例: 'https://formspree.io/f/xxxxxxxx'）に差し替える
  // 空にすると、送信時に利用者のメールソフトが起動し info@ 宛のメールが作成される
  formEndpoint: {
    employers: '/api/contact.php',
    seekers: '/api/contact.php',
  },
};
