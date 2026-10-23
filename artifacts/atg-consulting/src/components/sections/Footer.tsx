import { Link } from "wouter";

export default function Footer() {
  return (
    <footer
      className="py-10"
      style={{ background: "var(--ink)", borderTop: "1px solid var(--ink-border)" }}
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

          {/* Logo (white/inverted for dark background) */}
          <Link to="/" aria-label="ATG Consulting — back to top">
            <img
              src="/brand/logos/svg/optionA_icon.svg"
              alt="ATG Consulting"
              className="h-8 w-auto"
              style={{ filter: "brightness(0) invert(1) opacity(0.7)" }}
              width={32}
              height={32}
            />
          </Link>

          <div className="text-center sm:text-left">
            <p className="text-sm font-medium" style={{ color: "var(--ink-text-2)" }}>
              ATG Consulting — Castle Rock, CO
            </p>
            <a
              href="mailto:shea@atgconsulting.io"
              className="text-sm transition-colors"
              style={{ color: "var(--ink-text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--ink-text-2)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-text-3)")}
            >
              shea@atgconsulting.io
            </a>
          </div>

          <nav className="flex items-center gap-5" aria-label="Footer navigation">
            {[
              { href: import.meta.env.VITE_LINKEDIN_URL ?? "[LinkedIn]", label: "LinkedIn", external: true },
              { href: "/brand/ATG_Consulting_OnePager.pdf", label: "One-pager", download: true },
              { href: "/privacy", label: "Privacy", external: false },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                download={"download" in l && l.download ? true : undefined}
                target={"external" in l && l.external ? "_blank" : undefined}
                rel={"external" in l && l.external ? "noopener noreferrer" : undefined}
                className="text-sm font-medium transition-colors"
                style={{ color: "var(--ink-text-3)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--ink-text-2)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-text-3)")}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <div
          className="mt-8 pt-6 text-center"
          style={{ borderTop: "1px solid var(--ink-border)" }}
        >
          <p className="font-mono text-2xs" style={{ color: "var(--ink-text-3)", letterSpacing: "0.04em" }}>
            &copy; {new Date().getFullYear()} ATG CONSULTING · ALL RIGHTS RESERVED
          </p>
        </div>
      </div>
    </footer>
  );
}
