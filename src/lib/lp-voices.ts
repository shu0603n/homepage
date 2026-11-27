// LP（/lp/system-engineer/）の「社員の声」。
// 実際の社員に聞いた声（2026-11-27 受け取り）。差し替えるときも、実際の社員に聞いた内容（または本人に確認した内容）だけを入れる。
// 本物でない声を入れるときは VOICES_ARE_REAL を false にすると、「入社後のイメージ」の見出しと注記を付けて出す
export const SHOW_VOICES = true;
export const VOICES_ARE_REAL = true;

export type Voice = { initial: string; name: string; meta: string; before: string; title: string; text: string; color: "pink" | "green" | "blue" | "purple"; avatar?: string };

export const VOICES: Voice[] = [
  {
    initial: "K",
    name: "K.I さん",
    meta: "30代",
    before: "前職：SES企業",
    title: "会社に決められるキャリアから、自分で選ぶキャリアへ。",
    text: "前職では会社都合で案件が決まり、自分の伸ばしたいスキルや今後のキャリアについて考える機会がほとんどありませんでした。エモリスリンクでは、自分の希望を伝えたうえで案件を選べるため、念願だった上流工程にも挑戦できるように。今は将来のキャリアを見据えながら、前向きに仕事に取り組めています。",
    color: "pink",
  },
  {
    initial: "R",
    name: "R.T さん",
    meta: "20代",
    before: "前職：受託開発企業",
    title: "自分のスキルに見合った給与を、実感できるようになった。",
    text: "経験を積み、任される仕事が増えても、給与にはなかなか反映されないことに悩んでいました。転職で給与が下がる不安もありましたが、前給保証制度があったことで応募を決意。入社後はこれまでの経験やスキルを評価してもらい、年収もアップしました。今では、さらにスキルを磨こうというモチベーションにもつながっています。",
    color: "green",
  },
  {
    initial: "R",
    name: "R.K さん",
    meta: "30代",
    before: "前職：社内SE",
    title: "仕事も、家族との時間も。どちらも諦めなくてよかった。",
    text: "前職では残業が多く、家族と過ごす時間や自分の勉強時間を確保することが難しい状況でした。エモリスリンクに入社してからは、働き方の希望も踏まえて案件を選べるようになり、生活にゆとりが生まれました。空いた時間で新しい技術を学びながら、エンジニアとしての成長も続けられています。",
    color: "blue",
  },
];
