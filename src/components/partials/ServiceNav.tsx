import Link from "next/link";

export function ServiceNav() {
  return (
    <section className="section section--gray">
      <div className="container">
        <p className="local-nav__title">
          Service
          <small>サービス</small>
        </p>
        <ul className="local-nav">
          <li>
            <Link href="/service/staffing/">人材派遣</Link>
          </li>
          <li>
            <Link href="/service/recruitment/">人材紹介</Link>
          </li>
          <li>
            <Link href="/service/temp-to-perm/">紹介予定派遣</Link>
          </li>
          <li>
            <Link href="/service/outsourcing/">業務委託</Link>
          </li>
          <li>
            <Link href="/service/ses/">システムエンジニアリング</Link>
          </li>
          <li>
            <Link href="/service/system-development/">システム開発</Link>
          </li>
          <li>
            <Link href="/service/web-design/">WEBデザイン</Link>
          </li>
          <li>
            <Link href="/service/web-marketing/">WEBマーケティング</Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
