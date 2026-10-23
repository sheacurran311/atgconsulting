/** @type {import('tailwindcss').Config} */
// ATG Consulting design system — v3 (monochrome + electric blue)
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Palette ──────────────────────────────────────────────────────────────
      colors: {
        // Dark canvas — true neutral graphite, no blue tint
        ink: {
          DEFAULT: "#0A0A0B",  // near-pure black page bg
          1: "#111112",         // surface 1
          2: "#18181A",         // elevated card
          3: "#232325",         // strong divider
          border: "#2E2E31",    // hairline border (neutral)
          text: "#FAFAF9",      // primary text (off-white, as specified)
          "text-2": "#A1A1A4",  // secondary (true neutral mid-gray)
          "text-3": "#6E6E72",  // muted/tertiary
        },
        // Light canvas — neutral grays, no slate/blue tint
        canvas: {
          DEFAULT: "#FAFAF9",   // page bg (matches ink-text for symmetry)
          1: "#FFFFFF",          // card surface
          2: "#F2F2F2",          // secondary surface
          border: "#E0E0E0",     // true neutral border
          text: "#0A0A0B",       // primary text
          "text-2": "#6B6B6E",   // secondary (neutral)
          "text-3": "#9E9EA1",   // muted/tertiary
        },
        // Electric blue — single accent
        blue: {
          DEFAULT: "#3B6BFF",   // display, borders, glow, text on dark
          btn: "#2557E8",        // button bg — 4.9:1 with white (WCAG AA ✅)
          pressed: "#1B45CC",    // pressed/active state
          "subtle-dark": "rgba(59,107,255,0.12)",  // tinted bg on dark
          "subtle-light": "rgba(59,107,255,0.08)", // tinted bg on light
        },
        // Legacy aliases so old Tailwind classes don't break at compile time
        // (component files are being migrated to inline CSS vars)
        navy: {
          DEFAULT: "#0A0A0B",
          50: "#FAFAF9",
          100: "#E0E0E0",
          200: "#C4C4C7",
          300: "#A1A1A4",
          400: "#818185",
          500: "#6E6E72",
          600: "#4A4A4E",
          700: "#232325",
          800: "#18181A",
          900: "#111112",
        },
        orange: {
          DEFAULT: "#3B6BFF",  // mapped to blue so old `text-orange` becomes blue
          400: "#3B6BFF",
          500: "#2557E8",
          600: "#1B45CC",
        },
        accent: {
          DEFAULT: "#3B6BFF",
          btn: "#2557E8",
          pressed: "#1B45CC",
        },
      },

      // ── Typography ────────────────────────────────────────────────────────────
      fontFamily: {
        sans:    ['"Geist Variable"', '"Geist"', 'system-ui', 'sans-serif'],
        mono:    ['"Geist Mono Variable"', '"Geist Mono"', '"JetBrains Mono"', 'monospace'],
        display: ['"Geist Variable"', '"Geist"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        "2xs": ["10px",  { lineHeight: "1.4", letterSpacing: "0.06em" }],
        xs:    ["11px",  { lineHeight: "1.4", letterSpacing: "0.04em" }],
        sm:    ["13px",  { lineHeight: "1.5", letterSpacing: "-0.005em" }],
        base:  ["15px",  { lineHeight: "1.6", letterSpacing: "-0.01em" }],
        md:    ["17px",  { lineHeight: "1.55", letterSpacing: "-0.01em" }],
        lg:    ["20px",  { lineHeight: "1.4", letterSpacing: "-0.02em" }],
        xl:    ["26px",  { lineHeight: "1.25", letterSpacing: "-0.025em" }],
        "2xl": ["34px",  { lineHeight: "1.15", letterSpacing: "-0.03em" }],
        "3xl": ["44px",  { lineHeight: "1.1",  letterSpacing: "-0.04em" }],
        "4xl": ["56px",  { lineHeight: "1.05", letterSpacing: "-0.05em" }],
        "5xl": ["72px",  { lineHeight: "1.0",  letterSpacing: "-0.055em" }],
      },

      // ── Spacing ───────────────────────────────────────────────────────────────
      spacing: {
        px: "1px",
        0: "0", 0.5: "2px", 1: "4px", 1.5: "6px", 2: "8px", 2.5: "10px",
        3: "12px", 3.5: "14px", 4: "16px", 5: "20px", 6: "24px",
        7: "28px", 8: "32px", 9: "36px", 10: "40px", 11: "44px",
        12: "#48px", 14: "56px", 16: "64px", 18: "72px", 20: "80px",
        24: "96px", 28: "112px", 32: "128px",
      },

      // ── Radius ────────────────────────────────────────────────────────────────
      borderRadius: {
        none: "0", sm: "4px", DEFAULT: "8px", md: "10px",
        lg: "12px", xl: "16px", "2xl": "20px", "3xl": "24px", full: "9999px",
      },

      // ── Shadows ───────────────────────────────────────────────────────────────
      boxShadow: {
        none: "none",
        xs:   "0 1px 2px rgba(0,0,0,0.09)",
        sm:   "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.07)",
        DEFAULT:"0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)",
        md:   "0 6px 16px -2px rgba(0,0,0,0.1), 0 3px 6px -2px rgba(0,0,0,0.05)",
        lg:   "0 16px 32px -4px rgba(0,0,0,0.13), 0 6px 12px -4px rgba(0,0,0,0.06)",
        xl:   "0 24px 48px -8px rgba(0,0,0,0.18)",
        "glow-blue": "0 0 0 1px rgba(59,107,255,0.35), 0 0 28px rgba(59,107,255,0.14)",
        "glow-sm":   "0 0 0 1px rgba(59,107,255,0.25)",
        "inset-border": "inset 0 0 0 1px rgba(255,255,255,0.07)",
      },

      // ── Motion ────────────────────────────────────────────────────────────────
      transitionTimingFunction: {
        standard:   "cubic-bezier(0.2, 0, 0, 1)",
        decelerate: "cubic-bezier(0, 0, 0.2, 1)",
        spring:     "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: { fast: "120ms", base: "200ms", slow: "360ms" },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.2,0,0,1) both",
        "fade-in": "fade-in 0.3s ease both",
      },
      maxWidth: { prose: "65ch", content: "720px", wide: "1120px", full: "100%" },
    },
  },
  plugins: [],
};
