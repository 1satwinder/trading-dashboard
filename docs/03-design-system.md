# 03 — Design System

Dark-first. The two semantic price colors (green/red) are reserved **only** for
price movement so they stay meaningful — never use them for generic UI accents.

## Colors

| Token             | Hex                | Usage                                     |
| ----------------- | ------------------ | ----------------------------------------- |
| `bg`              | `#0E1117`          | Page background (near-black)              |
| `surface`         | `#161B22`          | Cards, sidebar, panels                    |
| `border`          | `#262C36`          | Dividers, card borders                    |
| `text-primary`    | `#E6EDF3`          | Primary text                              |
| `text-secondary`  | `#8B949E`          | Secondary / muted text                    |
| `accent`          | `#4F8CFF` (indigo) | Brand, active nav, links, primary actions |
| `up` / positive   | `#16C784` (green)  | Price up, gains, BUY                      |
| `down` / negative | `#EA3943` (red)    | Price down, losses, SELL                  |

> A teal alternative accent (`#00C8A8`) was also considered; indigo is the default.

## Theming & design tokens

We use **PrimeVue (Aura preset) + Tailwind CSS v4** together. Both ship their own
token systems, so the goal is to make them share **one source of truth** rather than
maintaining parallel palettes.

- In this setup we use PrimeVue tokens via preset in src/theme/preset.ts. This is the source of truth for brand + surfaces. Those become vars like --p-primary-400, --p-primary-500, plus semantic aliases like --p-primary-color and --p-text-color.
- Tailwind v4 then generates utilities from these --color-\*: bg-primary, text-primary, bg-primary-500, bg-surface-900, etc.

### How the CSS is wired

```
src/assets/main.css
 ├─ @import 'tailwindcss'          → Tailwind utilities + Tailwind's own theme tokens
 ├─ @import 'tailwindcss-primeui'  → BRIDGE: exposes PrimeVue tokens(--p-) as Tailwind
 │                                    utilities (bg-surface-900, text-primary,
 │                                    text-muted-color, …)
 ├─ @import './base.css'           → reset + app-chrome tokens (--xt-*)
 └─ @custom-variant dark           → aligns Tailwind's `dark:` with PrimeVue's .app-dark

src/main.ts
 └─ app.use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector, cssLayer } } })
      → Aura injects its --p-* CSS variables + component styles into the `primevue` layer
```

`cssLayer.order: 'theme, base, primevue'` places the `primevue` layer **before**
Tailwind's utilities layer, so a Tailwind class always wins over PrimeVue's default
component styles (no `!important` needed).

### The token systems

| System                           | Tokens                                                                     | Drives                                                                 | Dark mode                                              |
| -------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| **PrimeVue / Aura** (customized) | `--p-`\* (e.g. `--p-primary-500`, `--p-surface-900`)                       | Component internals (buttons, tables, inputs); brand accent + surfaces | Switched by `.app-dark` (`darkModeSelector`)           |
| **Tailwind**                     | Tailwind theme + `tailwindcss-primeui` utilities                           | Layout + utilities (`bg-surface-`\*, `text-primary`)                   | `dark:` variant (aligned to `.app-dark`)               |
| **Trading-domain**               | `@theme` in `main.css` (`--color-up/down`, `--color-buy/sell/profit/loss`) | Business meaning PrimeVue lacks (see below)                            | Shared by both themes                                  |
| **App chrome (`--xt-`\*)**       | `base.css` custom props (`--xt-bg`, `--xt-text` only)                      | `<body>` background/text before PrimeVue's runtime vars load           | Light values on `:root`; dark overrides on `.app-dark` |

### Theme switching

- Dark is the default. `useUiStore` owns the `light | dark` preference and persists it
  under `xtrading-theme` in `localStorage`.
- The top-bar sun/moon button toggles `.app-dark` on `<html>`. That one class switches
  PrimeVue (`darkModeSelector`) and Tailwind (`dark:` via `@custom-variant`) together.
- The small inline script in `index.html` applies a saved light preference before the
  app renders, avoiding a dark-to-light flash.
- `--xt-bg` / `--xt-text` paint `<body>` before PrimeVue's runtime variables load;
  their light and dark values intentionally match the corresponding theme surfaces.

### Brand customization (not a new palette)

We don't maintain a separate palette. `src/theme/preset.ts` uses `definePreset(Aura, …)`
to bend Aura's built-in tokens to the brand, so both PrimeVue **and** the Tailwind
bridge produce our colors:

- `semantic.primary` → indigo ramp (accent `#4F8CFF` at `primary.400`, which Aura's
  dark scheme uses as the base color).
- `semantic.colorScheme.dark.surface` → near-black ramp mapped so
  `surface.950 = #0E1117` (bg), `surface.900 = #161B22` (cards),
  `surface.700 = #262C36` (borders), `surface.400 = #8B949E` (muted text).
- `semantic.colorScheme.dark.text.color` → soft white `#E6EDF3`.

### The design token bridge

The `tailwindcss-primeui` plugin is the **bridge**: it makes Tailwind utilities read
from PrimeVue's tokens, so the two systems stay in sync automatically.

**Without a bridge** ❌ — two independent palettes drift apart:

```css
/* PrimeVue */    --p-primary-500: #2563eb;
/* Tailwind */    bg-blue-500;        /* similar, but NOT the same value */
```

Change one and the other doesn't update → dark-mode mismatch, inconsistent UI.

**With the bridge** ✅ — both point to the same source:

```css
:root {
  --p-primary-500: #2563eb;
}
```

```css
/* PrimeVue component */   background: var(--p-primary-500);
/* Tailwind utility */     bg-primary;   /* resolves to the same --p-primary-500 */
```

One change updates everything, everywhere.

### Trading-domain tokens

PrimeVue and Tailwind only give us _visual_ / _generic-UI_ meanings:

- PrimeVue → `primary`, `success`, `danger` (UI intent)
- Tailwind → `green-500`, `red-500` (raw colors)

Neither expresses **business meaning** like buy, sell, profit, or loss. So we add a
minimal set of domain tokens in Tailwind's `@theme` (`main.css`), which generate real
utilities (`text-buy`, `bg-sell`, `text-profit`, `text-loss`, `text-up`, `bg-down`):

```css
@theme {
  --color-up: #16c784; /* source of truth: positive / price increase */
  --color-down: #ec4d56; /* source of truth: negative / price decrease */

  --color-buy: var(--color-up);
  --color-sell: var(--color-down);
  --color-profit: var(--color-up);
  --color-loss: var(--color-down);

  /* Label colour for text sitting *on* a bg-buy / bg-sell fill. */
  --color-buy-contrast: #0e1117;
  --color-sell-contrast: #0e1117;
}

/* Light theme re-tones the pair; see "Contrast" below. */
:root:not(.app-dark) {
  --color-up: #0d774f;
  --color-down: #c73039;

  --color-buy-contrast: #ffffff;
  --color-sell-contrast: #ffffff;
}
```

`up` / `down` are the single source of truth; `buy/sell/profit/loss` are **aliases**
so they can never drift apart — change one hex and everything updates. Use these
semantic classes (e.g. `text-profit`) in views instead of raw `text-green-500`.

#### Contrast: why the pair is theme-aware

A green vivid enough for near-black surfaces is unreadable on white. The original single
pair (`#16c784` / `#ea3943`) measured **2.20:1** for green text on a light card — under
half the 4.5:1 AA floor — and the same 2.20:1 for the white label on a `bg-buy` fill. So
each theme gets its own tone, overridden on `:root:not(.app-dark)`:

| Foreground on background                 |   Dark |  Light |
| ---------------------------------------- | -----: | -----: |
| `text-up` on a card                      | 7.86:1 | 5.57:1 |
| `text-down` on a card                    | 4.75:1 | 5.37:1 |
| `text-buy-contrast` on a `bg-buy` fill   | 8.58:1 | 5.57:1 |
| `text-sell-contrast` on a `bg-sell` fill | 5.19:1 | 5.37:1 |

Overriding the **tokens** rather than adding light-mode utilities at each call site buys
three things for free: `buy`/`sell`/`profit`/`loss` follow because they alias `up`/`down`;
the charts follow because they read the tokens through `getComputedStyle` on a `ui.isDark`
watcher; and the sector heatmap follows because its tints are opacity modifiers on the
same tokens.

The `*-contrast` tokens exist because the fill is now theme-dependent, so a fixed label
colour can't work — the dark theme's mint needs a near-black label, the light theme's
forest green needs white. They are deliberately **not** aliased to `up`/`down`: they're
the inverse of the fill, not the same value.

Two related constraints worth knowing before restyling anything:

- **Text on a tinted fill.** `text-muted-color` is only 4.8:1 on a plain light card, so
  any tint underneath drops it below AA. Hence `SectorHeatmap` labels use body text and
  its top shade is capped at 40% opacity, and the order ticket's resting Buy/Sell label
  is `surface-600` rather than muted.
- **Aura's light accent is too light for a tint.** `primary.500` as a label on the
  `bg-primary/15` tint the active nav item uses is 3.74:1, so the preset shifts the light
  scheme's primary/hover/active one step down the ramp (600/700/800).

Colour is also never the sole carrier of meaning — every price is signed or arrowed — so
WCAG 1.4.1 holds independently of these ratios. See ADR-025.

### Convention: single source of truth

- **Component chrome** → PrimeVue/Aura tokens via the bridge (`bg-surface-`\*,
  `text-primary`, `text-muted-color`). Use `severity="success"/"danger"` on PrimeVue
  components for generic UI state.
- **Trading meaning** → the domain utilities (`text-buy`, `text-profit`, …).
- **Layout** → plain Tailwind utilities.
- Never define a color in two places. If PrimeVue already has it, use its token; if
  it's business meaning, use a domain token. `--xt-*` is deliberately reduced to just
  `--xt-bg` / `--xt-text` for the pre-mount `<body>` paint.

## Typography

- **UI text:** Inter — self-hosted via `@fontsource-variable/inter` (imported in
  `main.ts`), with a system sans-serif fallback. Font family is `'Inter Variable'`.
- **Numbers (prices, P/L):** use Tailwind's built-in `tabular-nums` utility so digits
  don't jitter as values update.

## Spacing & shape

- **Spacing scale:** 8px base (4 / 8 / 12 / 16 / 24 / 32).
- **Border radius:** 8–12px on cards.
- **Elevation:** prefer subtle 1px borders over heavy shadows (suits dark theme).

## Responsive breakpoints

| Breakpoint | Width      | Navigation                                   | Layout                          |
| ---------- | ---------- | -------------------------------------------- | ------------------------------- |
| Desktop    | ≥1024px    | Left sidebar (expanded, icon + label)        | Sidebar + multi-column content  |
| Tablet     | 768–1023px | Left sidebar (icons only)                    | Single main column, cards stack |
| Mobile     | <768px     | **Bottom tab bar** (4–5 items) + search icon | Full-width stacked cards        |

## Conventions

- Reserve green/red strictly for price/performance.
- Active nav item: indigo accent bar + subtle highlighted background.
- Search placeholder should be **consistent** across all pages
  (decision pending — e.g. "Search stocks, ETFs...").
