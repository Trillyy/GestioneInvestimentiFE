import * as XLSX from 'xlsx'
import type { IssuerParser } from './types'

// ─── Amundi XLSX format ───────────────────────────────────────────────────────
// Rows 0-18 : Metadata / disclaimer
// Row 14    : "Attivi in gestione nel fondo al DD/MM/YYYY"  ← snapshot date
// Row 19    : Headers
// Row 20+   : Data (ends with empty rows + footer)
//
// Relevant columns (0-based index):
//   1  Codice ISIN  → heldAssetIsin
//   2  Nome         → heldAssetName
//   3  Asset class  → filter (keep "EQUITY" only)
//   5  Peso         → weightPct  (decimal 0–1, multiply × 100)
//   6  Settore      → sectorName
//   7  Paese        → countryName

/** Extracts date from "Attivi in gestione nel fondo al DD/MM/YYYY" → "YYYY-MM-DD" */
function parseDateFromCell(raw: string): string | undefined {
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return undefined
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}

function toOptString(v: unknown): string | undefined {
  const s = String(v ?? '').trim()
  return s === '' ? undefined : s
}

export const amundiParser: IssuerParser = {
  label: 'Amundi',
  hint: 'File XLSX scaricato dalla pagina prodotto Amundi. La data snapshot viene estratta automaticamente.',
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

          // Extract date from row 14, col 1
          const validFrom = parseDateFromCell(String((rows[14] as unknown[])?.[1] ?? ''))

          // Data starts at row 20
          const dataRows = rows.slice(20) as unknown[][]

          const holdings = dataRows
            .filter((r) => {
              const assetClass = String(r[3] ?? '').trim().toUpperCase()
              const weight = Number(r[5])
              return assetClass === 'EQUITY' && weight > 0
            })
            .map((r) => ({
              weightPct: Math.round(Number(r[5]) * 10000) / 100,
              heldAssetName: String(r[2]).trim(),
              heldAssetIsin: toOptString(r[1]),
              sectorName: toOptString(r[6]),
              countryName: toOptString(r[7]),
            }))

          if (holdings.length === 0) {
            reject(new Error('Nessuna riga EQUITY trovata nel file Amundi.'))
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
