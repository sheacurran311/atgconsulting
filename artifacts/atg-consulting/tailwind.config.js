/** @type {import('tailwindcss').Config} */
// ATG Consulting design system — v2
// Dark-first, product-grade. Tokens match CSS variables in index.css.
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Palette ──────────────────────────────────────────────────────────────
      colors: {
        // Near-black base (dark canvas — marketing, hero, CTA sections)
        ink: {
          DEFAULT: "#0D0F12",   // page background (dark mode)
          1: "#131619",          // layered surface
          2: "#1B1D22",          // elevated card
          3: "#252830",          // higher elevation / strong divider
          border: "#2E3140",     // hairline border on dark
          text: "#E8EAF0",       // primary text on dark
          "text-2": "#8890A8",   // secondary text on dark
          "text-3": "#545A70",   // muted/tertiary on dark
        },
        // Light canvas — app/admin screens
        canvas: {
          DEFAULT: "#F8F9FC",   // page background (light mode)
          1: "#FFFFFF",          // card surface
          2: "#F1F3F7",          // secondary surface / hover
          border: "#DDE0EA",     // borders on light
          text: "#0D0F12",       // primary text on light
          "text-2": "#5A6078",   // secondary
          "text-3": "#9298B0",   // muted/tertiary
        },
        // Accent — vivid orange (single sharp CTA/highlight color)
        accent: {
          DEFAULT: "#F97316",    // display, accents, icons, text on dark
          btn: "#E8650A",        // button bg → 4:1 with white (WCAG AA large text)
          pressed: "#C95600",    // pressed / active state
          "subtle-dark": "rgba(249,115,22,0.12)",  // tinted bg on dark canvas
          "subtle-light": "rgba(249,115,22,0.08)", // tinted bg on light canvas
        },
        // Legacy aliases kept so existing code doesn't break during migration
        navy: {
          DEFAULT: "#0D0F12",
          50: "#E8EAF0",
          100: "#C4C8D8",
          200: "#8890A8",
          300: "#6C7490",
          400: "#545A70",
          500: "#3D4255",
          600: "#2E3140",
          700: "#1B1D22",
          800: "#131619",
          900: "#0D0F12",
        },
        orange: {
          DEFAULT: "#F97316",
          400: "#F97316",
          500: "#E8650A",
          600: "#C95600",
        },
      },

      // ── Typography ───────────────────────────────────────────────────────────
      fontFamily: {
        sans:    ['"Geist Variable"', '"Geist"', 'system-ui', 'sans-serif'],
        mono:    ['"Geist Mono Variable"', '"Geist Mono"', '"JetBrains Mono"', 'monospace'],
        display: ['"Geist Variable"', '"Geist"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }]
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
      fontWeight: {
        light:    "300",
        normal:   "400",
        medium:   "500",
        semibold: "600",
        bold:     "700",
        extrabold:"800",
        black:    "900",
      },

      // ── Spacing ───────────────────────────────────────────────────────────────
      spacing: {
        px: "1px",
        0: "0", 0.5: "2px", 1: "4px", 1.5: "6px", 2: "8px", 2.5: "10px",
        3: "12px", 3.5: "14px", 4: "16px", 5: "20px", 6: "24px",
        7: "28px", 8: "32px", 9: "36px", 10: "40px", 11: "44px",
        12: "48px", 14: "56px", 16: "64px", 18: "72px", 20: "80px",
        24: "96px", 28: "112px", 32: "128px", 36: "144px", 40: "160px",
        48: "192px", 56: "224px", 64: "256px", 72: "288px", 80: "320px",
        96: "384px",
      },

      // ── Radius ────────────────────────────────────────────────────────────────
      borderRadius: {
        none:  "0",
        sm:    "4px",
        DEFAULT:"8px",
        md:    "10px",
        lg:    "12px",
        xl:    "16px",
        "2xl": "20px",
        "3xl": "24px",
        full:  "9999px",
      },

      // ── Borders ───────────────────────────────────────────────────────────────
      borderWidth: {
        DEFAULT: "1px",
        0: "0",
        2: "2px",
      },

      // ── Shadows ───────────────────────────────────────────────────────────────
      boxShadow: {
        none: "none",
        xs:   "0 1px 2px rgba(0,0,0,0.08)",
        sm:   "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
        DEFAULT:"0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)",
        md:   "0 6px 16px -2px rgba(0,0,0,0.1), 0 3px 6px -2px rgba(0,0,0,0.05)",
        lg:   "0 16px 32px -4px rgba(0,0,0,0.12), 0 6px 12px -4px rgba(0,0,0,0.06)",
        xl:   "0 24px 48px -8px rgba(0,0,0,0.16)",
        // Glow effects (dark canvas)
        "glow-accent": "0 0 0 1px rgba(249,115,22,0.3), 0 0 24px rgba(249,115,22,0.12)",
        "glow-sm":     "0 0 0 1px rgba(249,115,22,0.2)",
        // Inset border (card borders on dark)
        "inset-border": "inset 0 0 0 1px rgba(255,255,255,0.08)",
        "inset-border-strong": "inset 0 0 0 1px rgba(255,255,255,0.14)",
      },

      // ── Animation / motion ────────────────────────────────────────────────────
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0, 0, 1)",
        decelerate: "cubic-bezier(0, 0, 0.2, 1)",
        accelerate: "cubic-bezier(0.4, 0, 1, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "360ms",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.2,0,0,1) both",
        "fade-in": "fade-in 0.3s ease both",
      },

      // ── Max widths ────────────────────────────────────────────────────────────
      maxWidth: {
        prose: "65ch",
        content: "720px",
        wide: "1120px",
        full: "100%",
      },
    },
  },
  plugins: [],
};
