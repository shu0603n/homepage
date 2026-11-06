// スタッフ登録フォームの選択肢（next-app の staff-register と同じ）

export const GENDER_OPTIONS = ["男", "女", "その他"];

export const PREFECTURE_OPTIONS = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県", "海外",
];

export const DAYS_OF_WEEK = ["月", "火", "水", "木", "金", "土", "日"];

export const JOB_TYPE_OPTIONS = [
  "コールセンター（受信）",
  "コールセンター（発信）",
  "システムエンジニア",
  "ヘルプデスク",
  "事務・データ入力",
  "軽作業",
  "物流・倉庫",
  "食品加工",
  "製造",
  "販売・接客",
  "その他",
];

export const PERIOD_OPTIONS = ["特になし", "3ヶ月程度", "半年程度", "1年程度", "長期希望"];
export const WEEKLY_OPTIONS = ["週1", "週2", "週3", "週4", "週5"];
export const HISTORY_COUNT_OPTIONS = ["なし", "1社", "2社", "3社以上"];
export const HISTORY_COUNT_MAP: Record<string, number> = { なし: 0, "1社": 1, "2社": 2, "3社以上": 3 };
export const EMPLOYMENT_TYPE_OPTIONS = ["正社員", "契約社員", "派遣社員", "パート・アルバイト", "業務委託", "その他"];
export const WORK_JOB_TYPE_OPTIONS = ["オペレーター", "事務", "軽作業", "製造", "販売・接客", "物流", "その他"];
export const MAX_HISTORIES = 5;
