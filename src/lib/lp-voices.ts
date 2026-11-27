// LP（/lp/system-engineer/）の「社員の声」。
// 実際の社員に聞いた声（2026-11-27 受け取り）。差し替えるときも、実際の社員に聞いた内容（または本人に確認した内容）だけを入れる。
// 本物でない声を入れるときは VOICES_ARE_REAL を false にすると、「入社後のイメージ」の見出しと注記を付けて出す
export const SHOW_VOICES = true;
export const VOICES_ARE_REAL = true;
// 顔写真が本人の写真でない（イメージ写真）ときは true。「※写真はイメージです」を添える
export const PHOTOS_ARE_IMAGES = true;

export type Voice = { initial: string; name: string; meta: string; before: string; title: string; text: string; color: "pink" | "green" | "blue" | "purple"; avatar?: string };

export const VOICES: Voice[] = [
  {
    initial: "K",
    name: "K.I さん",
    avatar: "lp/voice-1.webp",
    meta: "30代",
    before: "前職：SES企業",
    title: "会社に決められるキャリアから、自分で選ぶキャリアへ。",
    text: "前職では会社都合で案件が決まり、自分の伸ばしたいスキルや今後のキャリアについて考える機会がほとんどありませんでした。エモリスリンクでは、自分の希望を伝えたうえで案件を選べるため、念願だった上流工程にも挑戦できるように。今は将来のキャリアを見据えながら、前向きに仕事に取り組めています。",
    color: "pink",
  },
  {
    initial: "R",
    name: "R.T さん",
    avatar: "lp/voice-2.webp",
    meta: "20代",
    before: "前職：受託開発企業",
    title: "一人で悩むことが減り、自分の成長に自信が持てるようになった。",
    text: "前職では、今後どのようにスキルを伸ばしていけばよいのか分からず、不安を感じることがありました。エモリスリンクでは気軽に相談できる環境があり、自分の成長につながるよう、改善点や今後の方向性について親身にアドバイスしてもらえます。ただ案件に参画するだけではなく、一緒にキャリアを考えてくれる環境があることが、日々のモチベーションにつながっています。",
    color: "green",
  },
  {
    initial: "R",
    name: "R.K さん",
    avatar: "lp/voice-3.webp",
    meta: "30代",
    before: "前職：社内SE",
    title: "仕事も、家族との時間も。どちらも諦めなくてよかった。",
    text: "前職では残業が多く、家族と過ごす時間や自分の勉強時間を確保することが難しい状況でした。エモリスリンクに入社してからは、働き方の希望も踏まえて案件を選べるようになり、生活にゆとりが生まれました。空いた時間で新しい技術を学びながら、エンジニアとしての成長も続けられています。",
    color: "blue",
  },
];
