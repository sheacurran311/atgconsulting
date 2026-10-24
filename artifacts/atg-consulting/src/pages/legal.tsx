import { Link } from "wouter";
import Footer from "@/components/sections/Footer";

function DraftBanner() {
  return (
    <p className="font-mono text-2xs mb-4" style={{ color: "var(--blue)", letterSpacing: "0.08em" }}>
      DRAFT FOR SHEA&apos;S REVIEW — NOT FINAL LEGAL ADVICE
    </p>
  );
}

export function PrivacyPage() {
  return (
    <div style={{ background: "var(--canvas)", minHeight: "100vh" }}>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <DraftBanner />
        <h1 className="text-3xl font-extrabold mb-4" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>Privacy</h1>
        <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
          <p>
            This page is a draft for Shea Curran to approve before it is treated as the privacy policy of ATG Consulting.
          </p>
          <p>
            When you complete the workflow intake, your answers — including your name, email, business type, and any free text — are stored so Shea can see them in the admin console and so you can save the snapshot to an account.
          </p>
          <p>
            Those answers can be sent to the configured model provider to write your snapshot. The provider is OpenAI-compatible. The key in use may be an OpenAI key or an xAI key. If no key is set, the snapshot is written from a template on our server and is not sent to a model.
          </p>
          <p>
            Follow-up drafts you create in the workbench are handled the same way: the notes you type can be sent to that provider, and the draft is stored on your account. Approving a draft does not send email.
          </p>
          <p>
            For Guided and Done-for-you clients, sessions may be recorded or transcribed where you have given explicit consent. You will be asked for consent before any recording or transcription takes place. Transcripts are stored on ATG Consulting's servers and are visible to Shea in the admin console. A short approved recap of each session may be shared with you in the app; the full transcript is not shared with you by default.
          </p>
          <p>
            If you withdraw consent for recording, please contact Shea directly. Previously recorded transcripts will be deleted on request.
          </p>
          <p>
            Accounts are provided by Clerk. Shea can read intakes, plans, and workbench output for clients on this site.
          </p>
          <p>
            Questions: <a href="mailto:shea@atgconsulting.io" className="underline">shea@atgconsulting.io</a>.
          </p>
        </div>
        <p className="mt-8 text-sm"><Link to="/" className="underline" style={{ color: "var(--blue)" }}>Back home</Link></p>
      </main>
      <Footer />
    </div>
  );
}

export function TermsPage() {
  return (
    <div style={{ background: "var(--canvas)", minHeight: "100vh" }}>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <DraftBanner />
        <h1 className="text-3xl font-extrabold mb-4" style={{ color: "var(--canvas-text)", letterSpacing: "-0.03em" }}>Terms</h1>
        <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--canvas-text-2)" }}>
          <p>
            This page is a draft for Shea Curran to approve before it is treated as the terms of ATG Consulting.
          </p>
          <p>
            The site lets you map a workflow, save a plan, and review drafts in the workbench. Self-serve means you run a ready-made workflow and copy the result yourself. Guided and white-glove work includes time with Shea. Prices on the site are placeholders until Shea publishes them.
          </p>
          <p>
            Drafts are for you to review. The product does not send them to your customers unless a later version says so and you confirm it.
          </p>
          <p>
            Intake text can be processed by the model provider described on the privacy page. Do not submit secrets you would not want stored with your plan.
          </p>
          <p>
            Questions: <a href="mailto:shea@atgconsulting.io" className="underline">shea@atgconsulting.io</a>.
          </p>
        </div>
        <p className="mt-8 text-sm"><Link to="/privacy" className="underline" style={{ color: "var(--blue)" }}>Privacy</Link></p>
      </main>
      <Footer />
    </div>
  );
}
