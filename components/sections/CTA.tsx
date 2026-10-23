import Link from "next/link";

export default function CTA() {
  return (
    <section id="cta" className="py-20 sm:py-28 bg-navy" aria-labelledby="cta-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 id="cta-heading" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
          Spend your time selling,{" "}
          <span className="text-orange">not chasing.</span>
        </h2>
        <p className="mt-5 text-lg text-white/65 max-w-xl mx-auto leading-relaxed">
          Answer a few quick questions and get a free, personalised AI workflow plan for your role and industry — no call required.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/start" className="btn-primary px-8 py-4 text-base">
            Get my free plan
          </Link>
          <Link href="/#tiers" className="btn-secondary-white px-8 py-4 text-base">
            Join the free seminar
          </Link>
        </div>
        <p className="mt-10 text-white/40 text-sm">
          Prefer to read first?{" "}
          <a
            href="/brand/ATG_Consulting_OnePager.pdf"
            download
            className="underline text-white/60 hover:text-white transition-colors"
            aria-label="Download the ATG Consulting one-pager PDF"
          >
            Download the one-pager
          </a>
        </p>
      </div>
    </section>
  );
}
