# 07 — Decision Log (ADRs)

Lightweight Architecture Decision Records. Append a new entry whenever a meaningful
decision is made. Keep them short.

---

## ADR-001 — Front-end framework: Vue 3

- **Status:** Accepted
- **Context:** Need a modern reactive framework for a portfolio SPA.
- **Decision:** Use Vue 3 with the Composition API and `<script setup>`.
- **Consequences:** Pairs with Pinia + Vue Router; great DX and TS support.

## ADR-002 — Language: TypeScript

- **Status:** Accepted
- **Context:** Want type safety and a stronger portfolio signal.
- **Decision:** Use TypeScript throughout.
- **Consequences:** Slightly more setup; better tooling and fewer runtime bugs.

## ADR-003 — State management: Pinia

- **Status:** Accepted
- **Decision:** Use Pinia (official Vue store) for app state.
- **Consequences:** Typed, modular stores; simple DevTools integration.

## ADR-004 — UI: PrimeVue + Tailwind CSS

- **Status:** Accepted
- **Context:** Want rich components (tables, menus) plus flexible responsive layout.
- **Decision:** PrimeVue (Aura dark, styled mode) for components; Tailwind +
  `tailwindcss-primeui` for layout/responsive and shared tokens.
- **Consequences:** Clear division of labor; avoids CSS conflicts.

## ADR-005 — Theme: dark-first

- **Status:** Accepted
- **Context:** Trading apps are typically dark; green/red pop on dark backgrounds.
- **Decision:** Build dark-first; add light theme as a later toggle.
- **Consequences:** Design tokens defined for dark; light variant deferred to Phase 6.

## ADR-006 — Charts: lightweight-charts

- **Status:** Accepted
- **Decision:** Use TradingView's `lightweight-charts` for price/candlestick charts;
  custom SVG `Sparkline` for inline mini-charts.
- **Consequences:** Purpose-built financial charts; small bundle.

## ADR-007 — Data strategy: mock-first

- **Status:** Accepted
- **Context:** UI should be solid before depending on a rate-limited external API.
- **Decision:** Start with mock/static JSON behind a service layer; integrate a real
  provider (e.g. Finnhub/Alpha Vantage) in a later phase.
- **Consequences:** Provider can be swapped without touching views/components.

---

### Open decisions (not yet resolved)

- Dedicated Home/Dashboard landing page vs landing on Watchlist.
- Consistent search placeholder text.
- Logo placement (sidebar vs top bar).
