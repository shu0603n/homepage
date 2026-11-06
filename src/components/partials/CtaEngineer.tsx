import Link from "next/link";

export function CtaEngineer() {
  return (
    <section className="section">
      <div className="container">
        <Link className="cta-banner fade" href="/system-engineer/">
          <div className="cta-banner__img">
            <img src="/assets/img/banner-engineer.png" alt="" loading="lazy" />
          </div>
          <div className="cta-banner__body">
            <span className="en">RECRUIT</span>
            <h3>採用情報</h3>
            <p>システムエンジニア募集中！</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
