// LP（/lp/system-engineer/）の Projects セクションの案件例。
// detail（仕事の中身）・phases（担当工程）・price（単金）は、実際の案件の内容を入れたものだけ表示する（空なら出さない）
export type LpProject = {
  cat: string; // 業界
  title: string;
  tech: string[];
  detail?: string; // 例 "既存の COBOL 基盤を Java へ移行。チーム5名で、設計から担当"
  phases?: string[]; // 例 ["基本設計", "詳細設計", "製造"]
  price?: string; // 単金。例 "60〜75万円/月"
};

export const PROJECTS: LpProject[] = [
  { cat: "保険・金融", title: "保険会社向け契約管理システムの再構築", tech: ["Java", "Spring", "Oracle"] },
  { cat: "製造・IoT", title: "製造業向け IoT デバイス管理プラットフォーム開発", tech: ["Python", "FastAPI", "React", "AWS"] },
  { cat: "公共・自治体", title: "自治体向け電子申請ポータルの開発", tech: ["PHP", "Laravel", "MySQL"] },
  { cat: "Web サービス", title: "Web サービスの運用・改修", tech: ["PHP", "Laravel", "Vue.js"] },
  { cat: "モビリティ", title: "車載系アプリの設計・開発", tech: ["Python", "React", "PostgreSQL"] },
  { cat: "AI・最先端", title: "生成 AI サービス開発", tech: ["AI / LLM", "Python", "Vue.js", "Azure"] },
];
