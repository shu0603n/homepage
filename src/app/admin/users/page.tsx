import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { SETUP_HOURS } from "@/lib/admin/invite";
import { getAdminSession } from "@/lib/admin/session";
import { listAdmins } from "@/lib/admin/store";

export const dynamic = "force-dynamic";

const dateTime = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d) : null;

export default async function AdminUsersPage() {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  const admins = await listAdmins();
  return (
    <AdminShell
      session={session}
      active="users"
      en="Members"
      title="管理者"
      lead={`管理ページを使える人の一覧です。特級の管理者が追加すると「パスワード設定のご案内」メールが届き、本人がリンクからパスワードを決めます（有効期限${SETUP_HOURS}時間）。パスワードを忘れた人がいたら「ご案内メール」を押してください。`}
    >
      <AdminUsers
        selfId={session.id}
        selfRole={session.role}
        admins={admins.map((a) => ({ id: a.id, email: a.email, name: a.name, role: a.role, active: a.has_password, lastLogin: dateTime(a.last_login_at) }))}
      />
    </AdminShell>
  );
}
