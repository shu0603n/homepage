import { redirect } from "next/navigation";
import { AdminShell, type AdminNavKey } from "@/components/admin/AdminShell";
import { Ga4Panel, GtmPanel, InquiriesPanel, ScPanel } from "@/components/admin/panels";
import { getAdminSession } from "@/lib/admin/session";
import { listAdmins, listInquiries } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

// 管理ページのトップ。?tab= で表示する内容を切り替える（左のメニューから選ぶ）
const TABS: Record<Exclude<AdminNavKey, "users" | "password">, { en: string; title: string; lead: string }> = {
  access: { en: "Analytics", title: "アクセス状況", lead: "ホームページに何人が来て、どのページを見ているか（Google アナリティクス）" },
  search: { en: "Search", title: "検索での見え方", lead: "Google の検索結果にどれだけ出て、どんな言葉で見つけてもらえているか（Search Console）" },
  tags: { en: "Tags", title: "計測タグ", lead: "サイトで動いている計測用のタグ（Google タグ マネージャー）" },
  inquiries: { en: "Inquiries", title: "お問い合わせ", lead: "ホームページのお問い合わせフォームから届いた内容" },
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; filter?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const params = await searchParams;
  // 計測タグは特級の管理者だけ（一般の管理者が URL で開いても、アクセス状況を出す）
  const asked = params.tab && params.tab in TABS ? (params.tab as keyof typeof TABS) : "access";
  const tab = asked === "tags" && session.role !== "super" ? "access" : asked;
  const head = TABS[tab];

  const inquiries =
    tab === "inquiries"
      ? await listInquiries().catch((error) => {
          console.error("inquiry list failed:", error);
          return null;
        })
      : null;

  // 担当者のプルダウンに出す管理者（お問い合わせのタブを開いたときだけ読む）
  const admins = tab === "inquiries" ? (await listAdmins().catch(() => [])).map((a) => ({ id: a.id, label: a.name ?? a.email })) : [];

  return (
    <AdminShell session={session} active={tab} en={head.en} title={head.title} lead={head.lead}>
      {tab === "access" && <Ga4Panel />}
      {tab === "search" && <ScPanel />}
      {tab === "tags" && <GtmPanel />}
      {tab === "inquiries" && <InquiriesPanel inquiries={inquiries} filter={params.filter} admins={admins} selfId={session.id} />}
    </AdminShell>
  );
}
