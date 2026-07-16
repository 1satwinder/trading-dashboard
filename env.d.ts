/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Finnhub market-data API key (local-dev frontend-direct spike only). */
  readonly VITE_FINNHUB_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
