// LP（/lp/system-engineer/）の Salary セクションの「年収アップの事例」（Aさん：年収○万円 → 年収○万円、Java 保守案件 → 上流工程リーダー）。
// 実際の社員の事例だけを入れる（数字・案件は本人に確認したもの）。空のあいだはセクションごと出さない
export type CareerCase = {
  name: string; // 例 "A.S さん"
  meta: string; // 例 "30代 / 経験8年"
  before: { income: number; work: string }; // 年収（万円）と、入社前の案件・役割
  after: { income: number; work: string }; // 入社後
  note?: string; // 補足（例 "入社2年目"）
};

export const CASES: CareerCase[] = [];
