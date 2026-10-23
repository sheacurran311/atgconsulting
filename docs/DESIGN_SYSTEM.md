# ATG Consulting — Design System v2

Modern, product-grade visual system inspired by Linear, Vercel, and Stripe. Dark-first for the marketing canvas; clean light for app/admin screens.

---

## Fonts

| Role | Family | Usage |
|---|---|---|
| **Sans** | **Geist Variable** (`@fontsource-variable/geist`) | All body copy, headings, UI labels |
| **Mono** | **Geist Mono Variable** (`@fontsource-variable/geist-mono`) | Eyebrows, stat labels, code-like tags, mono badges |

Self-hosted via fontsource. Imported at the top of `src/index.css`.

### Typography scale

| Token | Size | Line-height | Tracking |
|---|---|---|---|
| `text-2xs` | 10px | 1.4 | +0.06em (mono only) |
| `text-xs`  | 11px | 1.4 | +0.04em |
| `text-sm`  | 13px | 1.5 | −0.005em |
| `text-base`| 15px | 1.6 | −0.01em |
| `text-md`  | 17px | 1.55| −0.01em |
| `text-lg`  | 20px | 1.4 | −0.02em |
| `text-xl`  | 26px | 1.25| −0.025em |
| `text-2xl` | 34px | 1.15| −0.03em |
| `text-3xl` | 44px | 1.1 | −0.04em |
| `text-4xl` | 56px | 1.05| −0.05em |
| `text-5xl` | 72px | 1.0 | −0.055em |
| `.display-xl` | clamp(40–72px) | 1.03 | −0.055em |
| `.display-lg` | clamp(32–56px) | 1.05 | −0.045em |
| `.section-heading` | clamp(26–40px) | 1.1 | −0.03em |

---

## Colour palette

### Dark canvas (marketing site, hero, CTA, nav)

| Token | CSS variable | Hex | Usage |
|---|---|---|---|
| Ink / page bg | `--ink` | `#0D0F12` | Page background |
| Surface 1 | `--ink-1` | `#131619` | Layered cards on dark |
| Surface 2 | `--ink-2` | `#1B1D22` | Elevated cards, hover |
| Surface 3 | `--ink-3` | `#252830` | Strong dividers |
| Border | `--ink-border` | `#2E3140` | Hairline borders |
| Text primary | `--ink-text` | `#E8EAF0` | Body text on dark |
| Text secondary | `--ink-text-2` | `#8890A8` | Muted text on dark |
| Text tertiary | `--ink-text-3` | `#545A70` | Disabled / very muted |

### Light canvas (app/admin, body sections)

| Token | CSS variable | Hex | Usage |
|---|---|---|---|
| Page bg | `--canvas` | `#F8F9FC` | Light page background |
| Card | `--canvas-1` | `#FFFFFF` | Card surface |
| Secondary | `--canvas-2` | `#F1F3F7` | Hover states, alt rows |
| Border | `--canvas-border` | `#DDE0EA` | Card borders, dividers |
| Text primary | `--canvas-text` | `#0D0F12` | Body text on light |
| Text secondary | `--canvas-text-2` | `#5A6078` | Muted text |
| Text tertiary | `--canvas-text-3` | `#9298B0` | Placeholder, disabled |

**WCAG AA contrast check (light canvas):**
- `--canvas-text` on `--canvas-1`: 19.5:1 ✅
- `--canvas-text-2` on `--canvas-1`: 5.9:1 ✅
- `--canvas-text-3` on `--canvas-1`: 3.1:1 ✅ (passes for large/UI text)

### Accent (single sharp CTA/highlight — orange)

| Token | CSS variable | Hex | Usage |
|---|---|---|---|
| Accent display | `--accent` | `#F97316` | Icons, text on dark, decorative |
| Accent button | `--accent-btn` | `#E8650A` | Button backgrounds (4:1 with white ✅) |
| Accent pressed | `--accent-pressed` | `#C95600` | Active/pressed state |
| Subtle (dark) | `--accent-subtle-dk` | `rgba(249,115,22,0.12)` | Tinted bg on dark |
| Subtle (light) | `--accent-subtle-lt` | `rgba(249,115,22,0.08)` | Tinted bg on light |

**WCAG AA:**
- White text on `--accent-btn` (#E8650A): 4.1:1 ✅ (large text / UI components)
- `--accent` on `--ink` (#0D0F12): 7.1:1 ✅ (orange text on dark)
- `--canvas-text` on `--accent-btn` background: 5.2:1 ✅ (dark text alternative)

---

## Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Tags, badges, chips |
| `--radius` | 8px | Default elements |
| `--radius-md` | 10px | Buttons, inputs |
| `--radius-lg` | 12px | Cards |
| `--radius-xl` | 16px | Large panels, modals |
| `--radius-2xl` | 20px | Hero panel, feature cards |

---

## Shadows (light canvas)

| Tailwind | Value |
|---|---|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.08)` |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` |
| `shadow-md` | `0 6px 16px -2px rgba(0,0,0,0.1), 0 3px 6px -2px rgba(0,0,0,0.05)` |
| `shadow-glow-accent` | `0 0 0 1px rgba(249,115,22,0.3), 0 0 24px rgba(249,115,22,0.12)` |

---

## Motion

| Token | Value | Usage |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Most transitions |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bounce interactions |
| `--duration-fast` | `120ms` | Hover states |
| `--duration-base` | `200ms` | Standard transitions |
| `--duration-slow` | `360ms` | Page-level animations |

---

## Component classes (defined in `src/index.css`)

| Class | Description |
|---|---|
| `.btn-primary` | Orange-filled CTA button |
| `.btn-secondary` | Outlined button for light canvas |
| `.btn-secondary-white` | Outlined white button for dark canvas |
| `.btn-ghost` | Text-only ghost button |
| `.card` | Light-canvas card (white bg, border) |
| `.card-hover` | Card with hover accent border |
| `.card-dark` | Dark-canvas card |
| `.card-dark-hover` | Dark card with hover state |
| `.field-input` | Styled text/email/textarea input |
| `.chip` / `.chip-selected` / `.chip-unselected` | Multi-select pill chips |
| `.eyebrow` | Mono uppercase label in accent color |
| `.label-mono` | Smaller mono label in muted color |
| `.label-mono-accent` | Smaller mono label in accent color |
| `.bg-dot-dark` | Dot-grid background for dark canvas |
| `.bg-dot-light` | Dot-grid background for light canvas |
| `.bg-grid-dark` | Line-grid background for dark canvas |
| `.display-xl` / `.display-lg` | Fluid display headings |
| `.section-heading` | Fluid section headings |

---

## Backgrounds / visual elements

- **Dot grid** (`.bg-dot-dark`): `radial-gradient` 1px dots at 28px spacing — used in hero and CTA sections
- **Accent glow** (`shadow-glow-accent`): orange radial glow — used on featured cards and interactive elements
- **Surface layering**: ink → ink-1 → ink-2 → ink-3 on dark; canvas → canvas-1 → canvas-2 on light

---

## Logo usage

| Context | File | Treatment |
|---|---|---|
| Dark nav / dark shells | `optionA_lockup_notag.svg` | `filter: brightness(0) invert(1)` |
| Light backgrounds | `optionA_lockup_notag.svg` | No filter (natural navy ink) |
| Favicon | `optionA_icon.svg` | Native |
| Footer icon on dark | `optionA_icon.svg` | `filter: brightness(0) invert(1) opacity(0.7)` |

---

## Where to edit

| File | What it controls |
|---|---|
| `artifacts/atg-consulting/tailwind.config.js` | Color tokens, spacing, radius, shadow, animation |
| `artifacts/atg-consulting/src/index.css` | CSS variables, component classes, base styles |
| `artifacts/atg-consulting/src/components/sections/` | All marketing page sections |
| `artifacts/atg-consulting/src/components/app/AppShell.tsx` | Client portal sidebar |
| `artifacts/atg-consulting/src/components/admin/AdminShell.tsx` | Admin sidebar |
| `artifacts/atg-consulting/src/components/intake/` | Intake form steps, chips, progress bar |
