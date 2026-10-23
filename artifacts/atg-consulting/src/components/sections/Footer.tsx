import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-navy border-t border-white/10 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link to="/" aria-label="ATG Consulting — back to top">
            <img
              src="/brand/logos/svg/optionA_icon.svg"
              alt="ATG Consulting"
              className="h-9 w-auto"
              width={36}
              height={36}
            />
          </Link>

          <div className="text-center sm:text-left">
            <p className="text-white/55 text-sm">ATG Consulting — Castle Rock, CO</p>
            <a href="mailto:shea@atgconsulting.io" className="text-white/35 text-sm hover:text-white/60 transition-colors">
              shea@atgconsulting.io
            </a>
          </div>

          <nav className="flex items-center gap-5" aria-label="Footer navigation">
            <a href={import.meta.env.VITE_LINKEDIN_URL ?? "[LinkedIn]"} className="text-white/45 hover:text-white transition-colors text-sm" aria-label="Shea on LinkedIn" target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
            <a href="/brand/ATG_Consulting_OnePager.pdf" download className="text-white/45 hover:text-white transition-colors text-sm">
              One-pager
            </a>
            <Link to="/privacy" className="text-white/45 hover:text-white transition-colors text-sm">
              Privacy
            </Link>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-white/25 text-xs">
            &copy; {new Date().getFullYear()} ATG Consulting. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
