import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Ga4Panel, GtmPanel, InquiriesPanel, ScPanel } from "@/components/admin/panels";
import { getAdminSession } from "@/lib/admin/session";
import { listInquiries } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

const TABS = [
  ["access", "アクセス状況", "GA4"],
  ["search", "検索での見え方", "Search Console"],
  ["tags", "計測タグ", "タグ マネージャー"],
  ["inquiries", "お問い合わせ", ""],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; filter?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const params = await searchParams;
  const tab: Tab = TABS.some(([t]) => t === params.tab) ? (params.tab as Tab) : "access";

  // 未対応の問い合わせ件数（タブに出す）
  const inquiries = await listInquiries().catch((error) => {
    console.error("inquiry list failed:", error);
    return null;
  });
  const unhandled = inquiries?.filter((i) => !i.handled).length ?? 0;

  return (
    <>
      <AdminHeader email={session.email} />
      <main className="admin-main">
        {session.weak && (
          <p className="admin-alert is-warn">
            <strong>仮のパスワードのままです。</strong>
            <Link href="/admin/password/">パスワード変更</Link>から、12文字以上の新しいパスワードに変えてください。
          </p>
        )}
        <nav className="admin-tabs" aria-label="表示する内容">
          {TABS.map(([key, label, sub]) => (
            <Link key={key} href={`/admin/?tab=${key}`} className={`admin-tab${tab === key ? " is-active" : ""}`} aria-current={tab === key ? "page" : undefined}>
              {label}
              {sub && <small>{sub}</small>}
              {key === "inquiries" && unhandled > 0 && <span className="admin-badge">{unhandled}</span>}
            </Link>
          ))}
        </nav>
        {tab === "access" && <Ga4Panel />}
        {tab === "search" && <ScPanel />}
        {tab === "tags" && <GtmPanel />}
        {tab === "inquiries" && <InquiriesPanel inquiries={inquiries} filter={params.filter} />}
      </main>
    </>
  );
}
