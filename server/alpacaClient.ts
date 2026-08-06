import { ProviderError } from './errors'

/**
 * Shared Alpaca transport for the BFF.
 *
 * Alpaca splits across two hosts that take the same credentials:
 *   - **Market Data** (`data.alpaca.markets`) → bars, snapshots, screeners.
 *   - **Trading** (`paper-api.alpaca.markets`) → account, positions, orders, clock.
 *
 * The keys live only here (server-side); the browser only ever sees our `/api/*`.
 * Consumers are `alpaca.ts` (chart candles + the paper Trading API) and
 * `markets.ts` (the Markets page — ADR-020).
 */

export const ALPACA_DATA_URL = process.env.ALPACA_DATA_URL ?? 'https://data.alpaca.markets'
export const ALPACA_TRADING_URL =
  process.env.ALPACA_TRADING_URL ?? 'https://paper-api.alpaca.markets'

function credentials(): { keyId: string; secretKey: string } {
  const keyId = process.env.ALPACA_API_KEY_ID
  const secretKey = process.env.ALPACA_API_SECRET_KEY
  if (!keyId || !secretKey) {
    throw new ProviderError(
      500,
      'Server is missing ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY (see .env.example).',
    )
  }
  return { keyId, secretKey }
}

/**
 * Call an Alpaca URL with auth headers, mapping failures to `ProviderError`.
 *
 * `403` (insufficient buying power/shares) and `422` (bad params) are *user*
 * errors on the order path, so Alpaca's own message is passed through with the
 * original status instead of being flattened into a generic `502` (ADR-018).
 */
export async function alpacaRequest<T>(
  url: string | URL,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { keyId, secretKey } = credentials()
  const { method = 'GET', body } = init

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: {
        'APCA-API-KEY-ID': keyId,
        'APCA-API-SECRET-KEY': secretKey,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ProviderError(502, 'Upstream network error contacting Alpaca.')
  }

  if (res.status === 429) throw new ProviderError(429, 'Alpaca rate limit reached.')
  if (res.status === 401) {
    throw new ProviderError(502, 'Alpaca rejected the request — check ALPACA API credentials.')
  }
  if (res.status === 403 || res.status === 422) {
    throw new ProviderError(res.status, await upstreamMessage(res))
  }
  if (!res.ok) throw new ProviderError(502, `Alpaca request failed (${res.status}).`)

  // DELETE returns 204 No Content.
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Pull Alpaca's `{ code, message }` error text, falling back to the status. */
async function upstreamMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string }
    if (body?.message) return body.message
  } catch {
    // Non-JSON body — fall through to the generic message.
  }
  return `Alpaca rejected the request (${res.status}).`
}

/** Parse an Alpaca numeric string (they're returned as strings) to a number. */
export function num(value: string | number | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** Optional numeric field: Alpaca sends `null` when it doesn't apply. */
export function optionalNum(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
