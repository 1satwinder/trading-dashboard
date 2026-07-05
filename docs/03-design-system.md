# 03 — Design System

Dark-first. The two semantic price colors (green/red) are reserved **only** for
price movement so they stay meaningful — never use them for generic UI accents.

## Colors

| Token | Hex | Usage |
| --- | --- | --- |
| `bg` | `#0E1117` | Page background (near-black) |
| `surface` | `#161B22` | Cards, sidebar, panels |
| `border` | `#262C36` | Dividers, card borders |
| `text-primary` | `#E6EDF3` | Primary text |
| `text-secondary` | `#8B949E` | Secondary / muted text |
| `accent` | `#4F8CFF` (indigo) | Brand, active nav, links, primary actions |
| `up` / positive | `#16C784` (green) | Price up, gains, BUY |
| `down` / negative | `#EA3943` (red) | Price down, losses, SELL |

> A teal alternative accent (`#00C8A8`) was also considered; indigo is the default.

## Typography

- **UI text:** Inter (or system sans-serif fallback).
- **Numbers (prices, P/L):** tabular numerals — `font-variant-numeric: tabular-nums`
  (or a monospaced/tabular font) so digits don't jitter as values update.

## Spacing & shape

- **Spacing scale:** 8px base (4 / 8 / 12 / 16 / 24 / 32).
- **Border radius:** 8–12px on cards.
- **Elevation:** prefer subtle 1px borders over heavy shadows (suits dark theme).

## Responsive breakpoints

| Breakpoint | Width | Navigation | Layout |
| --- | --- | --- | --- |
| Desktop | ≥1024px | Left sidebar (expanded, icon + label) | Sidebar + multi-column content |
| Tablet | 768–1023px | Left sidebar (icons only) | Single main column, cards stack |
| Mobile | <768px | **Bottom tab bar** (4–5 items) + search icon | Full-width stacked cards |

## Conventions

- Reserve green/red strictly for price/performance.
- Active nav item: indigo accent bar + subtle highlighted background.
- Search placeholder should be **consistent** across all pages
  (decision pending — e.g. "Search stocks, ETFs...").
