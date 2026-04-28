// ─── Number formatters ────────────────────────────────────────────────────────

export function fmtNum(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—'
  return value.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function fmtCurrency(value: number, currency = 'EUR'): string {
  return value.toLocaleString('it-IT', { style: 'currency', currency, minimumFractionDigits: 2 })
}

/** Formats a decimal fraction as percentage (e.g. 0.0020 → "0.20%") */
export function formatPct(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${(value * 100).toFixed(2)}%`
}

/** Formats a signed currency amount (e.g. 12.5, 'EUR' → "+12.50 EUR") */
export function formatSignedAmount(value: number | null | undefined, currency: string): string {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${fmtNum(value)} ${currency}`
}

/** Formats a signed value already in percent form (e.g. 10.5 → "+10.50%") */
export function formatSignedPct(value: number | null | undefined): string {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// ─── Date formatters ──────────────────────────────────────────────────────────

export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT')
}

// ─── Date utilities ───────────────────────────────────────────────────────────

export const TODAY = new Date().toISOString().slice(0, 10)

/** Returns true if the date is within the last 7 days. */
export function isDateRecent(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const diff = (new Date(TODAY).getTime() - new Date(dateStr).getTime()) / 86_400_000
  return diff <= 7
}

// ─── Chart window ─────────────────────────────────────────────────────────────

export type ChartWindow = 'week' | 'month' | 'year' | 'ytd' | 'alltime' | 'custom'

export const WINDOW_LABELS: Record<ChartWindow, string> = {
  week: 'Sett.',
  month: 'Mese',
  year: 'Anno',
  ytd: 'YTD',
  alltime: 'Tutto',
  custom: 'Personalizzato',
}

// ─── Chart window dates ───────────────────────────────────────────────────────

export function getWindowDates(w: Exclude<ChartWindow, 'custom'>): { from: string; to: string } {
  const today = new Date()
  const to = today.toISOString().slice(0, 10)
  if (w === 'ytd') return { from: `${today.getFullYear()}-01-01`, to }
  if (w === 'alltime') return { from: '1900-01-01', to }
  const from = new Date(today)
  if (w === 'week') from.setDate(from.getDate() - 7)
  else if (w === 'month') from.setMonth(from.getMonth() - 1)
  else from.setFullYear(from.getFullYear() - 1)
  return { from: from.toISOString().slice(0, 10), to }
}

// ─── P&L styling ──────────────────────────────────────────────────────────────

/** Returns a Tailwind CSS text-color class based on the sign of a P&L value. */
export function pnlColorClass(val: number | null | undefined): string {
  if (val == null || val === 0) return ''
  return val > 0 ? 'text-emerald-600' : 'text-red-500'
}
