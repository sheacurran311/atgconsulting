"use client";
import { useState } from "react";
import AuthControls from "./AuthControls";

const navLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Services", href: "/#tiers" },
  { label: "What we automate", href: "/#what-we-automate" },
  { label: "About", href: "/#about" },
  { label: "FAQ", href: "/#faq" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-navy/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex-shrink-0" aria-label="ATG Consulting — home">
            <img
              src="/brand/logos/svg/optionA_lockup_notag.svg"
              alt="ATG Consulting"
              width={160}
              height={36}
            />
          </a>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-navy/70 hover:text-navy transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <AuthControls />
            <a href="/start" className="btn-primary text-sm py-2 px-4">
              Get my plan
            </a>
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-navy hover:bg-navy/5"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-navy/10 bg-white px-4 py-4 space-y-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-base font-medium text-navy/70 hover:text-navy"
            >
              {l.label}
            </a>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <AuthControls onNavigate={() => setOpen(false)} />
            <a href="/#tiers" onClick={() => setOpen(false)} className="btn-secondary text-center">
              Free seminar
            </a>
            <a href="/start" onClick={() => setOpen(false)} className="btn-primary text-center">
              Get my plan
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
