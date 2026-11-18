import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
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
    <>
      <AdminHeader email={session.email} />
      <main className="admin-main">
        <h1 className="admin-h1">管理者</h1>
        <div className="admin-card">
          <p className="admin-help">
            管理ページを使える人の一覧です。追加すると、その人に「パスワード設定のご案内」メールが届き、本人がリンクからパスワードを決めます（リンクの有効期限は{SETUP_HOURS}時間）。
            パスワードを忘れた人がいたら「ご案内メールを送る」を押してください。
          </p>
          <AdminUsers
            selfId={session.id}
            admins={admins.map((a) => ({ id: a.id, email: a.email, name: a.name, active: a.has_password, lastLogin: dateTime(a.last_login_at) }))}
          />
        </div>
      </main>
    </>
  );
}
