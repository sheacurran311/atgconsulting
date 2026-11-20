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
      <SheaOperator />
      <Tiers />
      <ChatVsATG />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}
