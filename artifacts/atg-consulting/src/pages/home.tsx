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
      <section className="mx-auto max-w-wide px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="business-guides">
        <h2 id="business-guides" className="section-heading mb-4">Practical guides for your first project</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["/services/ai-readiness", "Assess AI readiness", "Review your tools, data and team before picking a pilot."],
            ["/services/workflow-engineering", "Map a workflow worth improving", "Choose a recurring task and track time, errors and who approves the result."],
            ["/value-realization", "Forecast and measure ROI", "Compare estimated capacity, verified savings and total investment."],
            ["/seo-aeo", "Improve search visibility", "Review what customers can find and how they turn a visit into an inquiry."],
          ].map(([href, title, description]) => <a key={href} href={href}
            className="block rounded-xl border border-canvas-border bg-canvas-1 p-4 hover:border-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue">
            <h3 className="font-semibold">{title}</h3><p className="text-sm">{description}</p>
          </a>)}
        </div>
        <a className="btn-primary mt-5 inline-flex" href="/intake">Start a free assessment</a>
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
