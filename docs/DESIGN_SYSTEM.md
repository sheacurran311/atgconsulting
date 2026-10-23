# ATG Consulting — Design System v3

Monochrome + electric blue. Dark-first marketing canvas; clean neutral light for app/admin.

---

## Fonts

| Role | Family | Source |
|---|---|---|
| **Sans** | **Geist Variable** | `@fontsource-variable/geist` |
| **Mono** | **Geist Mono Variable** | `@fontsource-variable/geist-mono` |

Mono used for: eyebrows, stat labels, step counters, area badges, timestamps, code-like tags.

### Type scale

| Class | Size | Line-height | Tracking |
|---|---|---|---|
| `text-2xs` | 10px | 1.4 | +0.06em |
| `text-xs` | 11px | 1.4 | +0.04em |
| `text-sm` | 13px | 1.5 | −0.005em |
| `text-base` | 15px | 1.6 | −0.01em |
| `text-md` | 17px | 1.55 | −0.01em |
| `text-lg` | 20px | 1.4 | −0.02em |
| `text-xl` | 26px | 1.25 | −0.025em |
| `text-2xl` | 34px | 1.15 | −0.03em |
| `text-3xl` | 44px | 1.1 | −0.04em |
| `text-4xl` | 56px | 1.05 | −0.05em |
| `text-5xl` | 72px | 1.0 | −0.055em |
| `.display-xl` | clamp(40–72px) | 1.03 | −0.055em |
| `.display-lg` | clamp(32–56px) | 1.05 | −0.045em |
| `.section-heading` | clamp(26–40px) | 1.1 | −0.03em |

---

## Colour palette

### Dark canvas (marketing, hero, nav, CTA) — true neutral graphite

| Token | CSS var | Hex | Note |
|---|---|---|---|
| Page bg | `--ink` | **`#0A0A0B`** | Near-pure black |
| Surface 1 | `--ink-1` | **`#111112`** | Cards on dark |
| Surface 2 | `--ink-2` | **`#18181A`** | Elevated cards |
| Surface 3 | `--ink-3` | **`#232325`** | Strong dividers |
| Border | `--ink-border` | **`#2E2E31`** | Hairline, true neutral |
| Text primary | `--ink-text` | **`#FAFAF9`** | Off-white (as specified) |
| Text secondary | `--ink-text-2` | **`#A1A1A4`** | True neutral mid-gray |
| Text muted | `--ink-text-3` | **`#6E6E72`** | True neutral dark-gray |

> All dark surfaces are **true neutral grays** — no navy or blue tint. (Previous `#8890A8` and `#2E3140` are gone.)

### Light canvas (app/admin, body sections) — neutral grays

| Token | CSS var | Hex | Note |
|---|---|---|---|
| Page bg | `--canvas` | **`#FAFAF9`** | Off-white (matches ink-text) |
| Card | `--canvas-1` | **`#FFFFFF`** | |
| Secondary | `--canvas-2` | **`#F2F2F2`** | Hover states |
| Border | `--canvas-border` | **`#E0E0E0`** | True neutral |
| Text primary | `--canvas-text` | **`#0A0A0B`** | Near-black |
| Text secondary | `--canvas-text-2` | **`#6B6B6E`** | Neutral mid-gray |
| Text muted | `--canvas-text-3` | **`#9E9EA1`** | Neutral light-gray |

**WCAG AA contrast (light canvas):**
- `#0A0A0B` on `#FFFFFF` → 21:1 ✅
- `#6B6B6E` on `#FFFFFF` → 5.7:1 ✅
- `#9E9EA1` on `#FFFFFF` → 2.8:1 — muted/placeholder only (not used for body text)

### Electric blue — single accent (no orange anywhere)

| Token | CSS var | Hex | WCAG with white |
|---|---|---|---|
| Brand / display | `--blue` | **`#3B6BFF`** | 4.5:1 ≈ AA (large text ✅) |
| **Button background** | `--blue-btn` | **`#2557E8`** | **4.9:1 — WCAG AA ✅** |
| Pressed / active | `--blue-pressed` | **`#1B45CC`** | 6.5:1 ✅ |
| Subtle bg (dark) | `--blue-subtle-dk` | `rgba(59,107,255,0.12)` | — |
| Subtle bg (light) | `--blue-subtle-lt` | `rgba(59,107,255,0.08)` | — |
| Glow | `--blue-glow` | `0 0 0 1px rgba(59,107,255,0.3), 0 0 28px rgba(59,107,255,0.12)` | — |

> **Button contrast:** White text on `--blue-btn` (`#2557E8`) = **4.9:1**. WCAG AA requires 4.5:1 for normal text and 3:1 for large text — both are met. `--blue` (`#3B6BFF`) at 4.5:1 is on the exact threshold; buttons always use `--blue-btn` to guarantee headroom.

> `--accent` / `--accent-btn` / `--accent-pressed` are kept as aliases pointing to the blue vars for backward compatibility during migration.

---

## Logo

All four SVG logos updated — the orange dot (`#F2994A`) is now **`#3B6BFF`** (electric blue):

| File | Use | Treatment on dark bg |
|---|---|---|
| `optionA_icon.svg` | Favicon, footer icon | `filter: brightness(0) invert(1) opacity(0.7)` |
| `optionA_lockup_notag.svg` | Nav | `filter: brightness(0) invert(1)` |
| `optionA_lockup_white.svg` | Dark surfaces | Native (already white/blue) |
| `optionA_lockup.svg` | Light surfaces | Native (dark text, blue dot) |

---

## Radius

| Token | Value |
|---|---|
| `--radius-sm` | 4px — chips, badges |
| `--radius` | 8px — default |
| `--radius-md` | 10px — buttons, inputs |
| `--radius-lg` | 12px — cards |
| `--radius-xl` | 16px — panels |

## Shadows

| Class | Value |
|---|---|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.09)` |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.12)` |
| `shadow-glow-blue` | `0 0 0 1px rgba(59,107,255,0.35), 0 0 28px rgba(59,107,255,0.14)` |

## Motion

| Token | Value |
|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--duration-fast` | 120ms |
| `--duration-base` | 200ms |
| `--duration-slow` | 360ms |

---

## Component classes (`src/index.css`)

| Class | Description |
|---|---|
| `.btn-primary` | Blue-btn fill, white text, WCAG AA |
| `.btn-secondary` | Outlined, light canvas |
| `.btn-secondary-white` | Outlined white, dark canvas |
| `.btn-ghost` | Text-only, light canvas |
| `.btn-ghost-dark` | Text-only, dark canvas |
| `.eyebrow` / `.section-eyebrow` | Mono uppercase in `--blue` |
| `.label-mono` | Mono uppercase, muted |
| `.label-mono-blue` | Mono uppercase, blue |
| `.card` / `.card-hover` | Light canvas card |
| `.card-dark` / `.card-dark-hover` | Dark canvas card |
| `.field-input` | Styled input, blue focus ring |
| `.chip` / `.chip-selected` / `.chip-unselected` | Multi-select pills, blue when active |
| `.bg-dot-dark` | Dot-grid, dark canvas |
| `.bg-dot-light` | Dot-grid, light canvas |
| `.display-xl` / `.display-lg` / `.section-heading` | Fluid headings |

---

## Where to edit

| File | Controls |
|---|---|
| `artifacts/atg-consulting/tailwind.config.js` | Colour tokens, scale, radius, shadow |
| `artifacts/atg-consulting/src/index.css` | CSS variables, component classes |
| `artifacts/atg-consulting/public/brand/logos/svg/*.svg` | Logo files (blue accent dot) |
| `artifacts/atg-consulting/src/components/sections/` | Marketing page sections |
| `artifacts/atg-consulting/src/components/app/AppShell.tsx` | Client portal sidebar |
| `artifacts/atg-consulting/src/components/admin/AdminShell.tsx` | Admin sidebar |
| `artifacts/atg-consulting/src/components/intake/` | Form components |
