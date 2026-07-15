# 01 — Project Overview

## Vision

`xtrading` is a responsive stock trading dashboard that lets a user search symbols,
manage a watchlist, view a portfolio, place (paper) orders, and explore interactive
price charts. It is a **portfolio project** that has grown from a front-end showcase
into a **full-stack app** backed by real market data and a real paper-trading broker.

## Goals

- Showcase a clean, modern, professional fintech UI (dark-first).
- Be fully **responsive** — usable on both desktop and mobile.
- Demonstrate solid **full-stack** architecture: Vue 3 + TypeScript + Pinia front end,
  with a backend-for-frontend integrating external providers.
- Use **real data**: live market data + symbol search, and **paper trading** via Alpaca.
- Prioritize a polished UX and clean, well-documented code.

## Target users

- Recruiters / hiring managers reviewing the project.
- A hypothetical retail investor tracking stocks and a (paper) portfolio.

## Scope

### Done — front-end MVP (mock data)

- Responsive shell (sidebar ↔ bottom tab bar), design system, routing.
- Watchlist page (stat cards + data table) on mock data.

### Planned — full-stack

- **Symbol search** and **live market data** (quotes, candles, movers, news).
- **Watchlist** persisted (interim: `localStorage`; later: backend + DB).
- **Paper trading** via **Alpaca**: place orders, order status, positions, holdings.
- Portfolio driven by real positions; interactive charts from real candle data.

## Out of scope

- **Real money.** Trading is **paper only** (Alpaca paper account).
- Options/crypto/advanced order types (may revisit later).

## Data & backend approach (summary)

- Alpaca **trading keys are secret** and its trading API is not browser-CORS-friendly
  → all trading goes through **our backend**, never the browser.
- Market data / symbol search may be called **frontend-direct as a local-dev spike**,
  but keys and rate-limit caching push it behind the backend for anything deployed.
- Target: a thin **backend-for-frontend (BFF)** proxy. See `04-architecture.md`.

## Success criteria

- Looks and feels like a real trading app on desktop and mobile.
- Symbol search → watchlist → chart → paper order flow works end to end.
- Secrets never reach the browser; code is clean, typed, and well-documented.
