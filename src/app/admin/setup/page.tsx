import Link from "next/link";
import { AdminSetupForm } from "@/components/admin/AdminSetupForm";
import { AdminAuthFrame } from "@/components/admin/AdminShell";
import { readAdminSetupToken } from "@/lib/admin/invite";
import { ADMIN_PASSWORD_MIN } from "@/lib/admin/password";

export const dynamic = "force-dynamic";

// ご案内メールのリンクから開く、管理ページのパスワード設定画面
export default async function AdminSetupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token;
  const admin = await readAdminSetupToken(token).catch(() => null);
  return (
    <AdminAuthFrame en="Set Password" title="パスワードの設定">
      {admin && token ? (
        <>
          <p className="adm-auth__note">
            <strong>{admin.name ? `${admin.name} さん` : admin.email}</strong>
            <br />
            ログイン用のパスワードを決めてください。{ADMIN_PASSWORD_MIN}文字以上で、英大文字・英小文字・数字を含めてください。
          </p>
          <AdminSetupForm token={token} min={ADMIN_PASSWORD_MIN} />
        </>
      ) : (
        <>
          <p className="adm-alert is-ng">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            <span>リンクの有効期限が切れているか、既に使われています。管理ページを使っているほかの方に、ご案内メールの再送を頼んでください。</span>
          </p>
          <Link className="adm-btn adm-btn--block" href="/admin/login/">
            ログイン画面へ
          </Link>
        </>
      )}
    </AdminAuthFrame>
  );
}
