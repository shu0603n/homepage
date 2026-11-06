import Link from "next/link";
import { PageShell } from "@/components/site/PageShell";

const meta = {
  title: "ページが見つかりません",
  description: "お探しのページは見つかりませんでした。株式会社エモリスリンクのトップページからお探しください。",
  hero: {
    en: "404",
    ja: "ページが見つかりません",
    img: "hero-company.jpg"
  }
} as const;

export default function NotFound() {
  return (
    <PageShell route="" meta={meta} special>
      <section className="section">
        <div className="container center">
          <p className="lead">
            お探しのページは移動または削除された可能性があります。
            <br />
            お手数ですが、トップページからお探しください。
          </p>
          <p className="mt-40">
            <Link className="btn" href="/">トップページへ</Link>
          </p>
        </div>
      </section>
    </PageShell>
  );
}
