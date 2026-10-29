import { type MouseEvent } from "react";
import { Link } from "wouter";
import LogoMark from "@/components/LogoMark";

export default function Footer() {
  return (
    <footer
      className="py-10"
      style={{ background: "var(--ink)", borderTop: "1px solid var(--ink-border)" }}
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

          <Link to="/" aria-label="ATG Consulting — back to top">
            <LogoMark variant="dark" size={36} aria-hidden={false} />
          </Link>

          <div className="text-center sm:text-left">
            <p className="text-sm font-medium" style={{ color: "var(--ink-text-2)" }}>
              ATG Consulting — Colorado, USA
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
              ...(typeof import.meta.env.VITE_LINKEDIN_URL === "string" && /^https?:\/\//.test(import.meta.env.VITE_LINKEDIN_URL)
                ? [{ href: import.meta.env.VITE_LINKEDIN_URL, label: "LinkedIn", external: true }]
                : []),
              { href: "/brand/ATG_Consulting_OnePager.pdf", label: "One-pager", download: true },
              { href: "/blog", label: "Blog", external: false },
              { href: "/privacy", label: "Privacy", external: false },
              { href: "/terms", label: "Terms", external: false },
              { href: "/refunds", label: "Refunds", external: false },
            ].map((l) => {
              const style = { color: "var(--ink-text-3)" };
              const onEnter = (e: MouseEvent<HTMLElement>) => { e.currentTarget.style.color = "var(--ink-text-2)"; };
              const onLeave = (e: MouseEvent<HTMLElement>) => { e.currentTarget.style.color = "var(--ink-text-3)"; };
              if (!l.external && !("download" in l && l.download)) {
                return (
                  <Link
                    key={l.label}
                    to={l.href}
                    className="text-sm font-medium transition-colors"
                    style={style}
                    onMouseEnter={onEnter}
                    onMouseLeave={onLeave}
                  >
                    {l.label}
                  </Link>
                );
              }
              return (
              <a
                key={l.label}
                href={l.href}
                download={"download" in l && l.download ? true : undefined}
                target={"external" in l && l.external ? "_blank" : undefined}
                rel={"external" in l && l.external ? "noopener noreferrer" : undefined}
                className="text-sm font-medium transition-colors"
                style={style}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
              >
                {l.label}
              </a>
              );
            })}
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
