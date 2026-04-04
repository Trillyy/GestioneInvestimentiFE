import * as XLSX from 'xlsx'
import type { HoldingItem } from '@/types/api'
import type { IssuerParser } from './types'

// ─── Xtrackers XLSX format ────────────────────────────────────────────────────
// Sheet name : "YYYY-MM-DD"           ← snapshot date (already ISO)
// Row 0      : Disclaimer (merged)
// Row 1      : Empty
// Row 2      : Headers
// Row 3+     : Data
//
// Relevant columns (0-based index):
//   1   Name                    → heldAssetName
//   2   ISIN                    → heldAssetIsin
//   3   Country                 → countryName
//   6   Type of Security        → used to filter (keep equity only)
//   9   Industry Classification → sectorName
//   10  Weighting               → weightPct  (decimal 0–1, multiply × 100)

const KEEP_TYPES = ['azioni', 'preferred stock']

function isDash(v: unknown): boolean {
  return v === '-' || v === '—' || v === '' || v == null
}

function toOptString(v: unknown): string | undefined {
  return isDash(v) ? undefined : String(v).trim()
}

export const xtrackersParser: IssuerParser = {
  label: 'Xtrackers',
  hint: 'File XLSX scaricato dalla pagina prodotto Xtrackers. La data snapshot viene estratta automaticamente dal nome del foglio.',
  parse: (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onerror = () => reject(new Error('Impossibile leggere il file'))

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer)
          const wb = XLSX.read(data, { type: 'array' })

          const sheetName = wb.SheetNames[0]
          const ws = wb.Sheets[sheetName]
          if (!ws) {
            reject(new Error('Foglio non trovato nel file XLSX'))
            return
          }

          // Sheet name is already "YYYY-MM-DD"
          const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(sheetName)
            ? sheetName
            : undefined

          const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })

          // Data starts at row 3 (index 3)
          const dataRows = rows.slice(3) as unknown[][]

          const holdings: HoldingItem[] = dataRows
            .filter((r) => {
              const type = String(r[6] ?? '').trim().toLowerCase()
              const rawWeight = r[10]
              const weight = rawWeight === 'N/A' ? 0 : Number(rawWeight)
              return KEEP_TYPES.includes(type) && weight > 0
            })
            .map((r) => ({
              weightPct: Math.round(Number(r[10]) * 10000) / 100, // decimal → percentage, 2 decimals
              heldAssetName: String(r[1]).trim(),
              heldAssetIsin: toOptString(r[2]),
              countryName: toOptString(r[3]),
              sectorName: toOptString(r[9]),
            }))

          if (holdings.length === 0) {
            reject(new Error('Nessuna riga azionaria trovata nel file Xtrackers.'))
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
