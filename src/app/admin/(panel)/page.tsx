import { redirect } from "next/navigation";
import { Suspense } from "react";
import { avatarUrl } from "@/components/admin/AdminAvatar";
import { AdminShell, type AdminNavKey } from "@/components/admin/AdminShell";
import { AdminPanelSkeleton } from "@/components/admin/AdminSkeleton";
import { Ga4Panel, GtmPanel, InquiriesPanel, ScPanel } from "@/components/admin/panels";
import { JobStatsPanel } from "@/components/admin/JobStatsPanel";
import { getAdminSession } from "@/lib/admin/session";
import { countUnhandledInquiries, listAdmins, listInquiries } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

// 管理ページのトップ。?tab= で表示する内容を切り替える（左のメニューから選ぶ）。何も指定がなければ、いちばん使うお問い合わせを出す
const TABS: Record<Exclude<AdminNavKey, "users" | "password">, { en: string; title: string; lead: string }> = {
  access: { en: "Analytics", title: "アクセス状況", lead: "ホームページに何人が来て、どのページを見ているか（Google アナリティクス）" },
  search: { en: "Search", title: "検索での見え方", lead: "Google の検索結果にどれだけ出て、どんな言葉で見つけてもらえているか（Search Console）" },
  jobs: { en: "Job Insights", title: "案件の反応", lead: "ホームページの案件一覧での表示・クリック・閲覧の回数と、「気になる」・ホームページからの応募の数" },
  tags: { en: "Tags", title: "計測タグ", lead: "サイトで動いている計測用のタグ（Google タグ マネージャー）" },
  inquiries: { en: "Inquiries", title: "お問い合わせ", lead: "ホームページのお問い合わせフォームから届いた内容" },
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; filter?: string; days?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const params = await searchParams;
  // 計測タグは特級の管理者だけ（一般の管理者が URL で開いても、お問い合わせを出す）
  const asked = params.tab && params.tab in TABS ? (params.tab as keyof typeof TABS) : "inquiries";
  const tab = asked === "tags" && session.role !== "super" ? "inquiries" : asked;
  const head = TABS[tab];

  // データベースへの問い合わせは同時に送る（順番に待つより速い）。
  // お問い合わせの一覧と担当者のプルダウン用の管理者は、お問い合わせのタブを開いたときだけ読む
  const [unhandled, inquiries, admins] = await Promise.all([
    countUnhandledInquiries().catch(() => 0),
    tab === "inquiries"
      ? listInquiries().catch((error) => {
          console.error("inquiry list failed:", error);
          return null;
        })
      : null,
    tab === "inquiries" ? listAdmins().catch(() => []) : [],
  ]);

  // Google のデータ（アクセス状況・検索・計測タグ）は時間がかかることがあるため、画面の枠を先に出し、届いたら差し込む
  return (
    <AdminShell session={session} active={tab} en={head.en} title={head.title} lead={head.lead} unhandled={unhandled}>
      {tab === "access" && (
        <Suspense fallback={<AdminPanelSkeleton kpis={5} />}>
          <Ga4Panel />
        </Suspense>
      )}
      {tab === "search" && (
        <Suspense fallback={<AdminPanelSkeleton kpis={4} />}>
          <ScPanel />
        </Suspense>
      )}
      {tab === "jobs" && (
        <Suspense fallback={<AdminPanelSkeleton kpis={5} cards={1} />}>
          <JobStatsPanel days={params.days} />
        </Suspense>
      )}
      {tab === "tags" && (
        <Suspense fallback={<AdminPanelSkeleton kpis={4} cards={1} />}>
          <GtmPanel />
        </Suspense>
      )}
      {tab === "inquiries" && (
        <InquiriesPanel inquiries={inquiries} filter={params.filter} admins={admins.map((a) => ({ id: a.id, label: a.name ?? a.email, email: a.email, avatar: avatarUrl(a.id, a.avatar_version) }))} selfId={session.id} />
      )}
    </AdminShell>
  );
}
