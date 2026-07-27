/**
 * Shared error type for BFF provider clients (Finnhub, Alpaca).
 *
 * Carries the HTTP status the BFF should return to the browser, so route
 * handlers can turn any provider failure into a consistent `{ error }` body
 * (see `fail()` in index.ts).
 */
export class ProviderError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}
