import Hero from "@/components/sections/Hero";
import Services from "@/components/sections/Services";
import HowItWorks from "@/components/sections/HowItWorks";
import Tiers from "@/components/sections/Tiers";
import About from "@/components/sections/About";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/sections/Footer";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Services />
      <HowItWorks />
      <Tiers />
      <About />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}
