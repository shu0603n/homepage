import Link from "next/link";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="admin-header">
      <Link className="admin-header__brand" href="/admin/">
        EMORISLINK <span>管理ページ</span>
      </Link>
      <nav className="admin-header__nav" aria-label="管理メニュー">
        <span className="admin-header__user">{email}</span>
        <Link href="/admin/users/">管理者</Link>
        <Link href="/admin/password/">パスワード変更</Link>
        <a href="/" target="_blank" rel="noopener">
          サイトを見る
        </a>
        <AdminLogoutButton />
      </nav>
    </header>
  );
}
