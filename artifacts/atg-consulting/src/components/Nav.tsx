import { useState } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { basePath } from "@/lib/clerk";
import LogoLockup from "./LogoLockup";

const navLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Services",     href: "/#tiers" },
  { label: "What we automate", href: "/#what-we-automate" },
  { label: "About",        href: "/#about" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: "rgba(13,15,18,0.88)", backdropFilter: "blur(12px) saturate(180%)", borderBottom: "1px solid var(--ink-border)" }}
    >
      <div className="max-w-wide mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link to="/" aria-label="ATG Consulting — home">
            <LogoLockup variant="dark" height={32} blink />
          </Link>

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
                style={{ color: "var(--ink-text-2)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--ink-text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ink-text-2)")}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            {isSignedIn ? (
              <Link to="/app">
                <span className="px-3 py-1.5 rounded text-sm font-medium transition-colors" style={{ color: "var(--ink-text-2)" }}>
                  Dashboard
                </span>
              </Link>
            ) : (
              <a href={`${basePath}/sign-in`} className="px-3 py-1.5 rounded text-sm font-medium transition-colors" style={{ color: "var(--ink-text-2)" }}>
                Sign in
              </a>
            )}
            <Link to="/start">
              <span className="btn-primary text-sm" style={{ padding: "8px 16px" }}>
                Get my snapshot
              </span>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-md transition-colors"
            style={{ color: "var(--ink-text-2)" }}
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden px-4 py-4 space-y-1"
          style={{ borderTop: "1px solid var(--ink-border)", background: "var(--ink-1)" }}
        >
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium"
              style={{ color: "var(--ink-text-2)" }}
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            {isSignedIn ? (
              <Link to="/app" onClick={() => setOpen(false)}>
                <span className="btn-secondary-white w-full justify-center">Dashboard</span>
              </Link>
            ) : (
              <a href={`${basePath}/sign-in`} className="btn-secondary-white w-full text-center">Sign in</a>
            )}
            <Link to="/start" onClick={() => setOpen(false)}>
              <span className="btn-primary w-full justify-center">Get my snapshot</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
