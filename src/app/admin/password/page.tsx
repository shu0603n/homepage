import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";
import { ADMIN_PASSWORD_MIN } from "@/lib/admin/password";
import { getAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function AdminPasswordPage() {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  return (
    <>
      <AdminHeader email={session.email} />
      <main className="admin-main admin-main--narrow">
        <h1 className="admin-h1">パスワードの変更</h1>
        <div className="admin-card">
          <p className="admin-help">
            新しいパスワードは、<strong>{ADMIN_PASSWORD_MIN}文字以上</strong>で、<strong>英大文字・英小文字・数字</strong>をそれぞれ1文字以上含めてください。
            変更すると、ほかのパソコンやスマホでのログインは自動でログアウトされます。
          </p>
          <AdminPasswordForm min={ADMIN_PASSWORD_MIN} />
        </div>
      </main>
    </>
  );
}
