import Link from "next/link";

export function CompanyNav() {
  return (
    <aside className="side-nav" aria-label="企業情報メニュー">
      <Link className="side-nav__title" href="/company/">
        <small>Company</small>
        企業情報
      </Link>
      <ul>
        <li>
          <Link href="/company/message/">ご挨拶</Link>
        </li>
        <li>
          <Link href="/company/philosophy/">企業理念</Link>
        </li>
        <li>
          <Link href="/company/about/">会社概要</Link>
        </li>
        <li>
          <Link href="/company/history/">沿革</Link>
        </li>
        <li>
          <Link href="/company/access/">アクセス</Link>
        </li>
        <li>
          <Link href="/company/group-overview/">グループ概要</Link>
        </li>
      </ul>
    </aside>
  );
}
