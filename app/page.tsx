import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import HowItWorks from "@/components/sections/HowItWorks";
import WhatWeAutomate from "@/components/sections/WhatWeAutomate";
import Tiers from "@/components/sections/Tiers";
import CompareTable from "@/components/sections/CompareTable";
import WhoItsFor from "@/components/sections/WhoItsFor";
import Example from "@/components/sections/Example";
import About from "@/components/sections/About";
import FAQ from "@/components/sections/FAQ";
import CTA from "@/components/sections/CTA";
import Footer from "@/components/sections/Footer";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <WhatWeAutomate />
      <Tiers />
      <CompareTable />
      <WhoItsFor />
      <Example />
      <About />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}
