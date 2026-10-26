import { useSearch } from "wouter";
import IntakeForm from "@/components/intake/IntakeForm";
import Footer from "@/components/sections/Footer";
import LogoMark from "@/components/LogoMark";

export default function StartPage() {
  // ?tier=done_for_you preselects the Done-for-you option in the form
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedTier = params.get("tier") as "done_for_you" | "guided" | "self_serve" | null;

  return (
    <div style={{ background: "var(--canvas)", minHeight: "100vh" }}>
      <main>
        <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          {/* Header */}
          <div className="mb-10 flex items-start gap-4">
            <LogoMark variant="light" size={36} className="flex-shrink-0 mt-1" />
            <div>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
                {preselectedTier === "done_for_you" ? "APPLY FOR DONE-FOR-YOU" : "FREE · NO ACCOUNT NEEDED"}
              </p>
              <h1 className="display-lg" style={{ color: "var(--canvas-text)" }}>
                {preselectedTier === "done_for_you" ? "Apply for Done-for-you." : "Map my workflow."}
              </h1>
              <p className="mt-2 text-base" style={{ color: "var(--canvas-text-2)" }}>
                {preselectedTier === "done_for_you"
                  ? "Tell us about your business. Shea reviews applications personally — spots are very limited."
                  : "Answer a few questions. Shea reviews your intake and sends your snapshot."}
              </p>
            </div>
          </div>

          {/* Form */}
          <div
            className="rounded-2xl p-6 sm:p-10"
            style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)" }}
          >
            <IntakeForm preselectedTier={preselectedTier} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
