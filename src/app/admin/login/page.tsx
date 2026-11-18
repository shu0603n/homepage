import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminSession } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await getAdminSession().catch(() => null)) redirect("/admin/");
  return (
    <div className="admin-login">
      <div className="admin-card admin-login__card">
        <p className="admin-login__brand">EMORISLINK</p>
        <h1 className="admin-login__title">管理ページ ログイン</h1>
        <p className="admin-login__note">内勤スタッフ専用のページです。</p>
        <AdminLoginForm />
        <p className="admin-login__foot">パスワードを忘れたときは、管理ページを使っているほかの方に「ご案内メールを送る」を押してもらい、届いたメールのリンクから決め直してください。</p>
      </div>
    </div>
  );
}
