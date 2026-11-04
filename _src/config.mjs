// サイト全体の設定
export default {
  siteName: '株式会社エモリスリンク',
  siteUrl: 'https://emorislink.co.jp',
  defaultDescription:
    '株式会社エモリスリンクは、札幌を拠点に人材派遣・人材紹介・SES・システム開発・Web制作を通じて、人と企業をつなぐ架け橋となることを目指しています。',
  tel: '011-590-4888',
  mail: 'info@emorislink.co.jp',

  // 公式SNS（フッターにアイコンで表示。url が空のものは表示しない）
  // 公式LINE を開設したら、line の url に友だち追加用の URL（例: 'https://lin.ee/xxxxxxx'）を入れる
  social: [
    { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/emorislink_info/' },
    { id: 'line', name: '公式LINE', url: '' },
  ],

  // お問い合わせフォームの送信先：AWS Lambda の関数 URL（プログラムは aws/contact/index.mjs、設定手順は aws/contact/README.md）
  // 例: 'https://xxxxxxxxxxxxxxxx.lambda-url.ap-northeast-1.on.aws/'（2つのフォームとも同じ URL でよい）
  // 空のあいだは、送信時に利用者のメールソフトが起動し info@ 宛のメールが作成される（仮の動き）
  formEndpoint: {
    employers: 'https://nfv4wni5hb2eo463fjkuwp25su0wknbq.lambda-url.ap-northeast-1.on.aws/',
    seekers: 'https://nfv4wni5hb2eo463fjkuwp25su0wknbq.lambda-url.ap-northeast-1.on.aws/',
  },
};
