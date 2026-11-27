// LP（/lp/system-engineer/）の「社員の声」。
// いま入っている声は【下書き】（実際の社員の声ではない）。求人の広告に作った声を本物として載せると、応募する人を誤解させてしまうため、
// 実際の社員に聞いた内容（または本人に確認した内容）に差し替えてから SHOW_VOICES を true にして公開する。
// アイコンは写真の代わりに、名前の頭文字と色で出す（写真やイラストを使う場合は avatar に /assets/img/ 以下のファイル名を入れる）
export const SHOW_VOICES = false;

export type Voice = { initial: string; name: string; meta: string; before: string; title: string; text: string; color: "pink" | "green" | "blue" | "purple"; avatar?: string };

export const VOICES: Voice[] = [
  {
    initial: "K",
    name: "K.S さん",
    meta: "30代・入社2年目・Java",
    before: "前職：SES企業",
    title: "案件を自分で選べるようになって、仕事が面白くなった",
    text: "前職では案件を選べず、テストばかりの日々でした。入社後は希望を伝えて上流工程のある案件に参画。設計から関われるようになり、年収も上がりました。",
    color: "pink",
  },
  {
    initial: "M",
    name: "M.T さん",
    meta: "20代・入社1年目・PHP / Vue.js",
    before: "前職：受託開発",
    title: "前給保証があったから、思い切って転職できた",
    text: "給与が下がるのが不安で転職に踏み切れずにいましたが、前給保証制度があると聞いて応募しました。月1回の面談で次のキャリアを相談できるのも心強いです。",
    color: "green",
  },
  {
    initial: "Y",
    name: "Y.H さん",
    meta: "30代・入社3年目・Python",
    before: "前職：社内SE",
    title: "残業が減って、勉強と家族の時間が増えた",
    text: "残業が少ないので、平日の夜に資格の勉強ができるようになりました。技術書の購入補助も使いながら、生成AIの案件にも挑戦しています。",
    color: "blue",
  },
];
