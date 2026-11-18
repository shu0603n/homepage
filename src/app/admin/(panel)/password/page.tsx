import { redirect } from "next/navigation";
import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_PASSWORD_MIN } from "@/lib/admin/password";
import { getAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function AdminPasswordPage() {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login/");
  return (
    <AdminShell session={session} active="password" en="Password" title="パスワード変更">
      <section className="adm-card adm-card--narrow">
        <ul className="adm-rules">
          <li>
            <i className="bi bi-check2-circle" aria-hidden="true" />
            {ADMIN_PASSWORD_MIN}文字以上
          </li>
          <li>
            <i className="bi bi-check2-circle" aria-hidden="true" />
            英大文字・英小文字・数字をそれぞれ1文字以上
          </li>
          <li>
            <i className="bi bi-check2-circle" aria-hidden="true" />
            変更すると、ほかのパソコンやスマホでのログインは自動でログアウトされます
          </li>
        </ul>
        <AdminPasswordForm min={ADMIN_PASSWORD_MIN} />
      </section>
    </AdminShell>
  );
}
