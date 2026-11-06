import Link from "next/link";

export function CtaJob() {
  return (
    <section className="section">
      <div className="container">
        <Link className="cta-banner fade" href="/job-seekers/">
          <div className="cta-banner__img">
            <img src="/assets/img/banner-job.jpg" alt="" loading="lazy" />
          </div>
          <div className="cta-banner__body">
            <span className="en">JOB</span>
            <h3>お仕事情報</h3>
            <p>いま募集中のお仕事が確認できます</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
