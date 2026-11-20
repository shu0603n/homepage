import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FriendDetailPanel } from "@/components/admin/CrmPanels";
import { getCandidate, isLineUserId, listTags } from "@/lib/admin/crm";
import { getAdminSession } from "@/lib/admin/session";
import { listAdmins } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

// 友だち・求職者の詳細（基本情報・タイムライン・タグ・同意履歴）。?view= で表示を切り替える
export default async function FriendDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const { id } = await params;
  if (!isLineUserId(id)) notFound();
  const [c, admins, tags] = await Promise.all([getCandidate(id), listAdmins().catch(() => []), listTags().catch(() => [])]);
  if (!c) notFound();
  const view = (await searchParams).view;
  const tab = view && ["profile", "timeline", "tags", "consent"].includes(view) ? view : "profile";
  return (
    <AdminShell session={session} active="friends" en="Friend" title="友だち・求職者の詳細">
      <FriendDetailPanel
        c={c}
        tab={tab}
        admins={admins.map((a) => ({ id: a.id, label: a.name ?? a.email }))}
        tags={tags.filter((t) => t.is_active).map((t) => ({ id: t.id, name: t.name, color: t.color, manual: t.is_manual_allowed }))}
      />
    </AdminShell>
  );
}
