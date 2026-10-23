"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
          <Link href="/" className="flex-shrink-0" aria-label="ATG Consulting — home">
            <Image
              src="/brand/logos/svg/optionA_lockup_notag.svg"
              alt="ATG Consulting"
              width={160}
              height={36}
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-navy/70 hover:text-navy transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/#tiers" className="text-sm font-semibold text-orange hover:text-orange-500 transition-colors">
              Free seminar
            </Link>
            <Link href="/start" className="btn-primary text-sm py-2 px-4">
              Get my plan
            </Link>
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
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-base font-medium text-navy/70 hover:text-navy"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link href="/#tiers" onClick={() => setOpen(false)} className="btn-secondary text-center">
              Free seminar
            </Link>
            <Link href="/start" onClick={() => setOpen(false)} className="btn-primary text-center">
              Get my plan
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
