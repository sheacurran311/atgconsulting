/**
 * LegalPage — renders a legal markdown document with brand styling.
 *
 * Draft mode (VITE_LEGAL_PUBLISHED !== "true"):
 *   - Shows a "Draft — not yet published" banner
 *   - Adds <meta name="robots" content="noindex"> via <title> side-effect
 *   - Renders [PLACEHOLDER] items highlighted in amber
 *
 * Published mode (VITE_LEGAL_PUBLISHED === "true"):
 *   - No draft banner; no noindex meta
 *
 * The HTML draft comment at the top of each file is stripped before rendering.
 */
import { useEffect } from "react";
import LogoLockup from "@/components/LogoLockup";
import { Link } from "wouter";

const IS_PUBLISHED = import.meta.env.VITE_LEGAL_PUBLISHED === "true";

function mdToHtml(md: string): string {
  return md
    // Strip top-level HTML comments (<!-- ... -->)
    .replace(/<!--[\s\S]*?-->/g, "")
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // List items
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*?<\/li>\n?)+/gs, "<ul>$&</ul>")
    // Highlight [PLACEHOLDER...] items
    .replace(/(\[PLACEHOLDER[^\]]*\])/g, '<mark class="legal-placeholder">$1</mark>')
    // Paragraphs: double newlines
    .replace(/\n\n(?!<[hul])/g, "<br /><br />")
    .trim();
}

interface Props {
  title: string;
  markdown: string;
}

export default function LegalPage({ title, markdown }: Props) {
  // Inject noindex when in draft mode
  useEffect(() => {
    if (!IS_PUBLISHED) {
      const meta = document.createElement("meta");
      meta.name = "robots";
      meta.content = "noindex";
      document.head.appendChild(meta);
      return () => { document.head.removeChild(meta); };
    }
    return undefined;
  }, []);

  const html = mdToHtml(markdown);
  const hasPlaceholders = html.includes("legal-placeholder");

  return (
    <div className="min-h-screen" style={{ background: "var(--canvas)", color: "var(--canvas-text)", fontFamily: "var(--font-sans)" }}>
      {/* Minimal nav */}
      <header style={{ borderBottom: "1px solid var(--canvas-border)", background: "var(--canvas-1)" }}>
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/">
            <LogoLockup variant="light" height={24} aria-label="ATG Consulting — home" />
          </Link>
          <Link to="/"><span className="text-sm" style={{ color: "var(--canvas-text-2)" }}>← Back to site</span></Link>
        </div>
      </header>

      <main className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Draft banner */}
        {!IS_PUBLISHED && (
          <div
            className="rounded-xl p-4 mb-8"
            style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)" }}
            role="status"
            aria-label="Draft notice"
          >
            <p className="font-semibold text-sm mb-1" style={{ color: "#D97706" }}>
              Draft — not yet published
            </p>
            <p className="text-xs" style={{ color: "var(--canvas-text-2)" }}>
              This page is not indexed by search engines and should not be shared externally.
              Set <code style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>VITE_LEGAL_PUBLISHED=true</code> in Replit Secrets after all{" "}
              <mark className="legal-placeholder">[PLACEHOLDER]</mark> items are filled in and the document has been reviewed by an attorney.
            </p>
          </div>
        )}

        {/* Placeholder summary */}
        {hasPlaceholders && (
          <div
            className="rounded-xl p-4 mb-8"
            style={{ background: "rgba(234,179,8,0.05)", border: "1px dashed rgba(234,179,8,0.3)" }}
          >
            <p className="text-xs font-medium mb-0.5" style={{ color: "#D97706" }}>
              Items highlighted in amber need to be filled in by Shea before publishing.
            </p>
            <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
              These are marked <mark className="legal-placeholder">[PLACEHOLDER]</mark> in the text below.
            </p>
          </div>
        )}

        {/* Document body */}
        <article
          className="legal-content"
          style={{ maxWidth: "700px" }}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--canvas-border)", background: "var(--canvas-1)", marginTop: "64px" }}>
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap gap-4 items-center justify-between">
          <p className="text-xs" style={{ color: "var(--canvas-text-3)" }}>
            © ATG Consulting LTD · Colorado, USA
          </p>
          <div className="flex gap-4">
            <Link to="/terms"><span className="text-xs hover:underline" style={{ color: "var(--canvas-text-3)" }}>Terms</span></Link>
            <Link to="/privacy"><span className="text-xs hover:underline" style={{ color: "var(--canvas-text-3)" }}>Privacy</span></Link>
            <Link to="/refunds"><span className="text-xs hover:underline" style={{ color: "var(--canvas-text-3)" }}>Refunds</span></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
