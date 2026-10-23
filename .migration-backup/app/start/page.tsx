import type { Metadata } from "next";
import IntakeForm from "@/components/intake/IntakeForm";
import Footer from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Get my free plan",
  description:
    "Answer a few quick questions and get a personalised AI workflow plan for your role and industry. Free, no signup required.",
  robots: { index: false, follow: false }, // keep the intake page out of search results
};

export default function StartPage() {
  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-navy/[0.03] to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          {/* Page header */}
          <div className="text-center mb-12">
            <p className="section-eyebrow mb-3">Free · No account needed</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-navy leading-tight">
              Get your personalised AI plan.
            </h1>
            <p className="mt-4 text-lg text-navy/60 max-w-xl mx-auto leading-relaxed">
              Tell us about your role and biggest time drains. We&apos;ll generate starter workflows,
              a quick win for this week, and a tier recommendation — instantly.
            </p>
            <p className="mt-2 text-sm text-navy/40">
              Under 2 minutes · Mostly taps · 3 short steps
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-3xl shadow-sm border border-navy/10 p-6 sm:p-10">
            <IntakeForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
