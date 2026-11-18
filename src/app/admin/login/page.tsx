import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminAuthFrame } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdminSession().catch(() => null)) redirect("/admin/");
  return (
    <AdminAuthFrame en="Admin Login" title="管理ページ ログイン">
      <p className="adm-auth__note">内勤スタッフ専用のページです。</p>
      <AdminLoginForm />
      <p className="adm-auth__foot">
        <i className="bi bi-info-circle" aria-hidden="true" />
        パスワードを忘れたときは、管理ページを使っているほかの方に「ご案内メール」を送ってもらい、届いたメールのリンクから決め直してください。
      </p>
    </AdminAuthFrame>
  );
}
