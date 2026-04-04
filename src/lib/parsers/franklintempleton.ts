import * as XLSX from 'xlsx'
import type { HoldingItem } from '@/types/api'
import type { IssuerParser } from './types'

// ─── Franklin Templeton XLSX format ──────────────────────────────────────────
// Row 0-4 : Disclaimer text
// Row 5   : Empty
// Row 6   : ["Fund Name", "Al", "DD.MM.YYYY", ...]   ← snapshot date (col 2)
// Row 7   : Empty
// Row 8   : Headers
// Row 9+  : Data
//
// Relevant columns (0-based index):
//   0  Nome del Titolo     → heldAssetName
//   1  Il peso (%)         → weightPct  (already numeric)
//   5  Ticker              → heldAssetTicker
//   6  Codice ISIN         → heldAssetIsin
//   9  Categoria del Fondo → used to filter out cash/currency/futures

const SKIP_CATEGORIES = ['CURRENCY', 'CASH', 'FUTURE', 'FUTURE - NEW']

/** Parses "DD.MM.YYYY" → "YYYY-MM-DD" */
function parseFTDate(raw: string): string | undefined {
  const match = String(raw).match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (!match) return undefined
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}

function isDash(v: unknown): boolean {
  return v === '—' || v === '-' || v === '' || v == null
}

export const franklinTempletonParser: IssuerParser = {
  label: 'Franklin Templeton',
  hint: 'File XLSX scaricato dalla pagina prodotto Franklin Templeton. La data snapshot viene estratta automaticamente.',
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

          // Use raw: false to get formatted strings, but header:1 for array rows
          const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })

          // Extract date from row 6, col 2
          const dateRow = rows[6] as unknown[]
          const validFrom = parseFTDate(String(dateRow?.[2] ?? ''))

          // Data rows start at index 9 (after 2 header/meta rows + 1 header row)
          const dataRows = rows.slice(9) as unknown[][]

          const holdings: HoldingItem[] = dataRows
            .filter((r) => {
              const category = String(r[9] ?? '').trim().toUpperCase()
              const weight = Number(r[1])
              return (
                !SKIP_CATEGORIES.some((s) => category.includes(s)) &&
                weight > 0
              )
            })
            .map((r) => ({
              weightPct: Number(r[1]),
              heldAssetName: String(r[0]).trim(),
              heldAssetTicker: isDash(r[5]) ? undefined : String(r[5]).trim(),
              heldAssetIsin: isDash(r[6]) ? undefined : String(r[6]).trim(),
            }))

          if (holdings.length === 0) {
            reject(new Error('Nessuna riga valida trovata nel file Franklin Templeton.'))
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
