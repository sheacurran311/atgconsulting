import IntakeForm from "@/components/intake/IntakeForm";
import Footer from "@/components/sections/Footer";
import LogoMark from "@/components/LogoMark";

export default function StartPage() {
  return (
    <div style={{ background: "var(--canvas)", minHeight: "100vh" }}>
      <main>
        <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          {/* Header */}
          <div className="mb-10 flex items-start gap-4">
            <LogoMark variant="light" size={36} className="flex-shrink-0 mt-1" />
            <div>
              <p className="font-mono text-2xs mb-1" style={{ color: "var(--blue)", letterSpacing: "0.1em" }}>
                FREE · NO ACCOUNT NEEDED
              </p>
              <h1 className="display-lg" style={{ color: "var(--canvas-text)" }}>
                Map my workflow.
              </h1>
              <p className="mt-2 text-base" style={{ color: "var(--canvas-text-2)" }}>
                Answer a few questions. Shea reviews your intake and sends your snapshot.
              </p>
            </div>
          </div>

          {/* Form */}
          <div
            className="rounded-2xl p-6 sm:p-10"
            style={{ background: "var(--canvas-1)", border: "1px solid var(--canvas-border)" }}
          >
            <IntakeForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
