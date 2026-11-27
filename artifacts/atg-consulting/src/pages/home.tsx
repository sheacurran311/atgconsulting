import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import GrowthWorkflowScroll from "@/components/sections/GrowthWorkflowScroll";
import WhoWeHelp from "@/components/sections/WhoWeHelp";
import HowItWorks from "@/components/sections/HowItWorks";
import SheaOperator from "@/components/sections/SheaOperator";
import Tiers from "@/components/sections/Tiers";
import ChatVsATG from "@/components/sections/ChatVsATG";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/sections/Footer";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Services />
      <GrowthWorkflowScroll />
      <WhoWeHelp />
      <HowItWorks />
      <section className="mx-auto max-w-wide px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="atg-value-heading">
        <div className="grid items-start gap-5 rounded-2xl border border-canvas-border bg-canvas-1 p-6 sm:p-8 md:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <h2 id="atg-value-heading" className="section-heading mb-3">See what changed after implementation</h2>
            <p>We agree on a baseline, measure the outcome with comparable evidence, and review results with you. The ATG Value Realization Framework tracks recovered capacity, operating costs and documented financial value separately.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:flex-col">
            <a className="btn-primary" href="/value-realization">How ATG measures results</a>
            <a className="btn-ghost" href="/seo-aeo">Explore SEO and AEO</a>
          </div>
        </div>
      </section>
      <SheaOperator />
      <Tiers />
      <ChatVsATG />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}
