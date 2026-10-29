// サイト全体の設定
export default {
  siteName: '株式会社エモリスリンク',
  siteUrl: 'https://emorislink.co.jp',
  defaultDescription:
    '株式会社エモリスリンクは、札幌を拠点に人材派遣・人材紹介・SES・システム開発・Web制作を通じて、人と企業をつなぐ架け橋となることを目指しています。',
  tel: '011-590-4888',
  mail: 'info@emorislink.co.jp',

  // お問い合わせフォームの送信先（PHP を使わないため外部フォームサービスを利用）
  // 例: Formspree → 'https://formspree.io/f/xxxxxxxx'
  // 空のままにすると、送信時に利用者のメールソフトが起動し info@ 宛のメールが作成されます。
  formEndpoint: {
    employers: '',
    seekers: '',
  },
};
