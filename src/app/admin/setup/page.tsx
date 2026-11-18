import Link from "next/link";
import { AdminSetupForm } from "@/components/admin/AdminSetupForm";
import { readAdminSetupToken } from "@/lib/admin/invite";
import { ADMIN_PASSWORD_MIN } from "@/lib/admin/password";

export const dynamic = "force-dynamic";

// ご案内メールのリンクから開く、管理ページのパスワード設定画面
export default async function AdminSetupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token;
  const admin = await readAdminSetupToken(token).catch(() => null);
  return (
    <div className="admin-login">
      <div className="admin-card admin-login__card">
        <p className="admin-login__brand">EMORISLINK</p>
        <h1 className="admin-login__title">管理ページ パスワード設定</h1>
        {admin && token ? (
          <>
            <p className="admin-login__note">
              {admin.name ? `${admin.name} さん（${admin.email}）` : admin.email}
              <br />
              ログイン用のパスワードを決めてください。{ADMIN_PASSWORD_MIN}文字以上で、英大文字・英小文字・数字を含めてください。
            </p>
            <AdminSetupForm token={token} min={ADMIN_PASSWORD_MIN} />
          </>
        ) : (
          <>
            <p className="admin-alert is-ng">リンクの有効期限が切れているか、既に使われています。管理ページを使っているほかの方に、ご案内メールの再送を頼んでください。</p>
            <Link href="/admin/login/">ログイン画面へ</Link>
          </>
        )}
      </div>
    </div>
  );
}
