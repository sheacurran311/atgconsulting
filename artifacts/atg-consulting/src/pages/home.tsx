import Hero from "@/components/sections/Hero";
import WhoWeHelp from "@/components/sections/WhoWeHelp";
import Services from "@/components/sections/Services";
import OutputGallery from "@/components/sections/OutputGallery";
import Calculator from "@/components/sections/Calculator";
import ChatVsATG from "@/components/sections/ChatVsATG";
import HowItWorks from "@/components/sections/HowItWorks";
import SheaOperator from "@/components/sections/SheaOperator";
import Tiers from "@/components/sections/Tiers";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/sections/Footer";

export default function HomePage() {
  return (
    <>
      <Hero />
      <WhoWeHelp />
      <Services />
      <OutputGallery />
      <Calculator />
      <ChatVsATG />
      <HowItWorks />
      <SheaOperator />
      <Tiers />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}
