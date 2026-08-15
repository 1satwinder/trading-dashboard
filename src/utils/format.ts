const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

interface SignOptions {
  /** Prefix positive values with `+` (negatives always get `-`). */
  signed?: boolean
}

export function formatCurrency(value: number, { signed = false }: SignOptions = {}): string {
  const formatted = currencyFmt.format(Math.abs(value))
  if (value < 0) return `-${formatted}`
  return signed ? `+${formatted}` : formatted
}

export function formatPercent(value: number, { signed = false }: SignOptions = {}): string {
  const formatted = `${Math.abs(value).toFixed(2)}%`
  if (value < 0) return `-${formatted}`
  return signed ? `+${formatted}` : formatted
}

export function formatNumber(value: number): string {
  return numberFmt.format(value)
}

const compactFmt = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Compact number for large counts, e.g. `42.1M` (used for volume). */
export function formatCompact(value: number): string {
  return compactFmt.format(value)
}

const compactCurrencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
})

/** Compact currency for large amounts, e.g. `$3.42T` (used for market cap). */
export function formatCompactCurrency(value: number): string {
  return compactCurrencyFmt.format(value)
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

/** Clock time from an ISO timestamp, e.g. `9:30 AM`. Empty when unparseable. */
export function formatTimeOfDay(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : timeFmt.format(date)
}
