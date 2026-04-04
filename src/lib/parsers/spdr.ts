import * as XLSX from 'xlsx'
import type { IssuerParser } from './types'

// ─── SPDR XLSX format ─────────────────────────────────────────────────────────
// Row 0 : ["Fund Name:", "..."]
// Row 1 : ["ISIN:", "..."]
// Row 2 : ["Ticker Symbol:", "..."]
// Row 3 : ["Holdings As Of:", "02-Apr-2026"]  ← snapshot date (DD-Mon-YYYY)
// Row 4 : Empty
// Row 5 : Headers
// Row 6+: Data
//
// Relevant columns (0-based index):
//   0  ISIN                   → heldAssetIsin  ("Unassigned" = skip)
//   2  Security Name          → heldAssetName
//   5  Percent of Fund        → weightPct  (already %, e.g. 0.994714 = 0.99%)
//   6  Trade Country Name     → countryName
//   8  Sector Classification  → sectorName

const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

/** Parses "02-Apr-2026" → "2026-04-02" */
function parseSPDRDate(raw: string): string | undefined {
  const match = String(raw).match(/(\d{2})-([A-Za-z]{3})-(\d{4})/)
  if (!match) return undefined
  const [, dd, mon, yyyy] = match
  const mm = MONTH_MAP[mon]
  return mm ? `${yyyy}-${mm}-${dd}` : undefined
}

function toOptString(v: unknown): string | undefined {
  const s = String(v ?? '').trim()
  return s === '' || s.toLowerCase() === 'unassigned' || s === 'none' ? undefined : s
}

export const spdrParser: IssuerParser = {
  label: 'SPDR',
  hint: 'File XLSX scaricato dalla pagina prodotto SPDR (State Street). La data snapshot viene estratta automaticamente.',
  parse: (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onerror = () => reject(new Error('Impossibile leggere il file'))

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })

          const ws = wb.Sheets[wb.SheetNames[0]]
          if (!ws) {
            reject(new Error('Foglio non trovato nel file XLSX'))
            return
          }

          const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })

          // Extract date from row 3, col 1
          const validFrom = parseSPDRDate(String((rows[3] as unknown[])?.[1] ?? ''))

          // Data starts at row 6
          const dataRows = rows.slice(6) as unknown[][]

          const holdings = dataRows
            .filter((r) => {
              const isin = String(r[0] ?? '').trim()
              const rawWeight = r[5]
              const weight = rawWeight === '-' || rawWeight === '' ? NaN : Number(rawWeight)
              return isin !== 'Unassigned' && isin !== '' && !isNaN(weight) && weight > 0
            })
            .map((r) => ({
              weightPct: Math.round(Number(r[5]) * 100) / 100,
              heldAssetName: String(r[2]).trim(),
              heldAssetIsin: toOptString(r[0]),
              countryName: toOptString(r[6]),
              sectorName: toOptString(r[8]),
            }))

          if (holdings.length === 0) {
            reject(new Error('Nessuna riga valida trovata nel file SPDR.'))
            return
          }

          resolve({ holdings, validFrom })
        } catch (err) {
          reject(new Error(err instanceof Error ? err.message : 'Errore nel parsing XLSX'))
        }
      }

      reader.readAsArrayBuffer(file)
    }),
}
