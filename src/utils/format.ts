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
