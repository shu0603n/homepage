import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";
import { avatarUrl } from "@/components/admin/AdminAvatar";
import { AdminMeMenu } from "@/components/admin/AdminMeMenu";
import type { AdminSession } from "@/lib/admin/session";
import { countUnhandledInquiries, ROLE_NAMES } from "@/lib/admin/store";

// 管理ページの外枠：左にサイトと同じネイビーのメニュー（ロゴ・各ページ・ログイン中の人）、右に本文。
// 本文の見出しは、ホームページと同じ「英字の小見出し＋日本語の大見出し」の形
export type AdminNavKey = "access" | "search" | "tags" | "jobs" | "inquiries" | "users" | "password";

// 「管理者」「パスワード変更」は左のメニューには置かず、ログイン中の人のカードを押すと開く小窓（AdminMeMenu）に入れる。
// superOnly：特級の管理者にだけ出す項目（一般の管理者には、メニューに出さず、開いても見られない）
const NAV: { key: AdminNavKey; href: string; label: string; icon: string; group: "data" | "work"; superOnly?: boolean }[] = [
  { key: "access", href: "/admin/?tab=access", label: "アクセス状況", icon: "bi-graph-up-arrow", group: "data" },
  { key: "search", href: "/admin/?tab=search", label: "検索での見え方", icon: "bi-search", group: "data" },
  { key: "jobs", href: "/admin/?tab=jobs", label: "案件の反応", icon: "bi-bar-chart-line", group: "data" },
  { key: "tags", href: "/admin/?tab=tags", label: "計測タグ", icon: "bi-tags", group: "data", superOnly: true },
  { key: "inquiries", href: "/admin/?tab=inquiries", label: "お問い合わせ", icon: "bi-envelope-paper", group: "work" },
];
// 上から「お仕事」（お問い合わせ）→「データ」（アクセス状況など）の順。よく使うものを上に置く
const GROUPS = [
  ["work", "お仕事"],
  ["data", "データ"],
] as const;

export async function AdminShell({
  session,
  active,
  en,
  title,
  lead,
  unhandled: given,
  children,
}: {
  session: AdminSession;
  active: AdminNavKey;
  en: string;
  title: string;
  lead?: ReactNode;
  unhandled?: number; // 未対応のお問い合わせの件数（ページ側で他の問い合わせと同時に数えた場合に渡す。無ければここで数える）
  children: ReactNode;
}) {
  const unhandled = given ?? (await countUnhandledInquiries().catch(() => 0));
  return (
    <div className="adm">
      <aside className="adm-side">
        <Link className="adm-side__logo" href="/admin/">
          <img src="/assets/img/logo-header-white.png" alt="EMORISLINK" width={341} height={84} />
          <span>ADMIN</span>
        </Link>
        <nav className="adm-nav" aria-label="管理メニュー">
          {GROUPS.map(([group, label]) => (
            <div key={group} className="adm-nav__group">
              <p className="adm-nav__label">{label}</p>
              {NAV.filter((n) => n.group === group && (!n.superOnly || session.role === "super")).map((n) => (
                <Link key={n.key} href={n.href} className={`adm-nav__item${active === n.key ? " is-active" : ""}`} aria-current={active === n.key ? "page" : undefined}>
                  <i className={`bi ${n.icon}`} aria-hidden="true" />
                  <span>{n.label}</span>
                  {n.key === "inquiries" && unhandled > 0 && (
                    <em className="adm-nav__badge" aria-label={`未対応 ${unhandled}件`}>
                      {unhandled}
                    </em>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="adm-side__foot">
          <a className="adm-side__site" href="/" target="_blank" rel="noopener">
            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            サイトを見る
          </a>
          <AdminMeMenu
            name={session.name}
            email={session.email}
            role={session.role}
            roleLabel={ROLE_NAMES[session.role]}
            avatar={avatarUrl(session.id, session.avatarVersion)}
            current={active === "users" || active === "password" ? active : null}
          />
          <AdminLogoutButton />
        </div>
      </aside>

      <div className="adm-body">
        {session.weak && (
          <p className="adm-alert is-warn">
            <i className="bi bi-shield-exclamation" aria-hidden="true" />
            <span>
              <strong>仮のパスワードのままです。</strong>
              <Link href="/admin/password/">パスワード変更</Link>から、12文字以上の新しいパスワードに変えてください。
            </span>
          </p>
        )}
        <header className="adm-head">
          <p className="adm-head__en">{en}</p>
          <h1 className="adm-head__title">{title}</h1>
          {lead && <p className="adm-head__lead">{lead}</p>}
        </header>
        {children}
      </div>
    </div>
  );
}

// ログイン・パスワード設定の画面：ホームページの写真にネイビーを重ねた背景の上に、白いカード
export function AdminAuthFrame({ en, title, children }: { en: string; title: string; children: ReactNode }) {
  return (
    <div className="adm-auth">
      <div className="adm-auth__card">
        <img className="adm-auth__logo" src="/assets/img/logo-footer.png" alt="EMORISLINK" width={261} height={66} />
        <p className="adm-auth__en">{en}</p>
        <h1 className="adm-auth__title">{title}</h1>
        {children}
      </div>
      <p className="adm-auth__copy">© EMORISLINK Co., Ltd.</p>
    </div>
  );
}
