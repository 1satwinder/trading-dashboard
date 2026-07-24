import type { Trade } from '@/types/market'

/**
 * Real-time trade stream — the streaming half of the market-data boundary
 * (docs/04-architecture.md).
 *
 * Stage 2, like `marketData.ts`: connects **frontend-direct** to Finnhub's
 * WebSocket in local dev only (the key is exposed, so this is never deployed).
 * Consumers (the watchlist store) only see the provider-agnostic `Trade` shape
 * and the `subscribe`/`setSymbols` API below, so Phase 7 can move this behind
 * the BFF without touching stores or components.
 *
 * Responsibilities kept inside this module:
 *   - one shared socket for the whole app,
 *   - reconciling desired vs. actual subscriptions,
 *   - reconnecting with backoff and re-subscribing on reconnect.
 */

const FINNHUB_WS = 'wss://ws.finnhub.io'
const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY

export type StreamStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'

type TradesListener = (trades: Trade[]) => void
type StatusListener = (status: StreamStatus) => void

/** Shape of Finnhub's `trade` frames (also emits `ping`, which we ignore). */
interface FinnhubMessage {
  type: 'trade' | 'ping' | string
  data?: Array<{ s: string; p: number; t: number; v: number }>
}

const MAX_BACKOFF_MS = 30_000

class FinnhubStream {
  private socket: WebSocket | null = null
  private status: StreamStatus = 'idle'

  /** Symbols the app wants to watch (source of truth). */
  private desired = new Set<string>()
  /** Symbols the open socket is actually subscribed to. */
  private subscribed = new Set<string>()

  private tradesListeners = new Set<TradesListener>()
  private statusListeners = new Set<StatusListener>()

  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  /** True when `close()` was called on purpose, so we don't auto-reconnect. */
  private manualClose = false

  // ---- Public API ----------------------------------------------------------

  getStatus(): StreamStatus {
    return this.status
  }

  /** Subscribe to trade batches. Returns an unsubscribe function. */
  onTrades(listener: TradesListener): () => void {
    this.tradesListeners.add(listener)
    return () => this.tradesListeners.delete(listener)
  }

  /** Subscribe to status changes; fires immediately with the current status. */
  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => this.statusListeners.delete(listener)
  }

  /**
   * Declare the full set of symbols to stream. Opens the socket if needed,
   * reconciles subscriptions when open, or closes when the set is empty.
   */
  setSymbols(symbols: Iterable<string>): void {
    this.desired = new Set(symbols)

    if (this.desired.size === 0) {
      this.close()
      return
    }

    this.manualClose = false
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.connect()
    } else if (this.socket.readyState === WebSocket.OPEN) {
      this.reconcile()
    }
    // If CONNECTING, reconciliation runs from the `open` handler.
  }

  /** Tear down the socket and stop reconnecting. */
  close(): void {
    this.manualClose = true
    this.clearReconnect()
    this.subscribed.clear()
    if (this.socket) {
      // Drop handlers first so the `close` event doesn't trigger a reconnect.
      this.socket.onopen = null
      this.socket.onmessage = null
      this.socket.onerror = null
      this.socket.onclose = null
      if (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      ) {
        this.socket.close()
      }
      this.socket = null
    }
    this.setStatus(this.desired.size === 0 ? 'idle' : 'closed')
  }

  // ---- Internals ------------------------------------------------------------

  private connect(): void {
    if (!API_KEY) {
      console.warn('[marketStream] Missing VITE_FINNHUB_API_KEY; streaming disabled.')
      this.setStatus('closed')
      return
    }

    this.clearReconnect()
    this.setStatus(this.reconnectAttempts === 0 ? 'connecting' : 'reconnecting')

    const socket = new WebSocket(`${FINNHUB_WS}?token=${API_KEY}`)
    this.socket = socket

    socket.onopen = () => {
      this.reconnectAttempts = 0
      this.subscribed.clear()
      this.setStatus('open')
      this.reconcile()
    }

    socket.onmessage = (event) => this.handleMessage(event)

    socket.onerror = () => {
      // The `close` event follows and drives reconnection; nothing to do here.
    }

    socket.onclose = () => {
      this.socket = null
      this.subscribed.clear()
      if (!this.manualClose && this.desired.size > 0) {
        this.scheduleReconnect()
      } else {
        this.setStatus('closed')
      }
    }
  }

  private handleMessage(event: MessageEvent): void {
    let msg: FinnhubMessage
    try {
      msg = JSON.parse(event.data as string)
    } catch {
      return
    }
    if (msg.type !== 'trade' || !msg.data?.length) return

    // Collapse a batch to the latest price per symbol — intermediate ticks
    // within one frame add no value on a watchlist row.
    const latest = new Map<string, Trade>()
    for (const t of msg.data) {
      latest.set(t.s, { symbol: t.s, price: t.p, timestamp: t.t })
    }
    const trades = [...latest.values()]
    for (const listener of this.tradesListeners) listener(trades)
  }

  /** Bring the socket's subscriptions in line with `desired`. */
  private reconcile(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return

    for (const symbol of this.subscribed) {
      if (!this.desired.has(symbol)) {
        this.send('unsubscribe', symbol)
        this.subscribed.delete(symbol)
      }
    }
    for (const symbol of this.desired) {
      if (!this.subscribed.has(symbol)) {
        this.send('subscribe', symbol)
        this.subscribed.add(symbol)
      }
    }
  }

  private send(type: 'subscribe' | 'unsubscribe', symbol: string): void {
    this.socket?.send(JSON.stringify({ type, symbol }))
  }

  private scheduleReconnect(): void {
    this.clearReconnect()
    // Exponential backoff: 1s, 2s, 4s … capped at 30s.
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, MAX_BACKOFF_MS)
    this.reconnectAttempts += 1
    this.setStatus('reconnecting')
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private setStatus(status: StreamStatus): void {
    if (status === this.status) return
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }
}

/** Shared, app-wide stream instance. */
export const marketStream = new FinnhubStream()
