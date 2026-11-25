import { redirect } from "next/navigation";

// 朝礼は管理ページのタブ（/admin/?tab=morning）に移った。前の URL で開いたときは、そちらへ移す
export default async function MorningPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const month = (await searchParams).month;
  redirect(`/admin/?tab=morning${month && /^\d{4}-\d{2}$/.test(month) ? `&month=${month}` : ""}`);
}
