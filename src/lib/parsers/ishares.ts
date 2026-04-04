import Papa from 'papaparse'
import type { HoldingItem } from '@/types/api'
import type { IssuerParser } from './types'

// ─── iShares CSV format ───────────────────────────────────────────────────────
// Row 1 : Al,"DD/MM/YYYY"           ← snapshot date
// Row 2 : (empty)
// Row 3 : Header row (Italian labels)
// Row 4+: Data rows
//
// Relevant columns:
//   "Ticker dell'emittente" → heldAssetTicker
//   "Nome"                  → heldAssetName
//   "Settore"               → sectorName
//   "Asset Class"           → used to filter (keep "Azionario" only)
//   "Ponderazione (%)"      → weightPct  (European decimal: "3,83")
//   "Area Geografica"       → countryName

interface ISharesRow {
  "Ticker dell'emittente": string
  'Nome': string
  'Settore': string
  'Asset Class': string
  'Ponderazione (%)': string
  'Area Geografica': string
}

/** Parses "DD/MM/YYYY" → "YYYY-MM-DD" */
function parseISharesDate(raw: string): string | undefined {
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return undefined
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}

function parseWeight(raw: string): number {
  return parseFloat(raw.trim().replace(',', '.'))
}

function mapRow(r: ISharesRow): HoldingItem {
  return {
    weightPct: parseWeight(r['Ponderazione (%)']),
    heldAssetName: r['Nome'].trim(),
    heldAssetTicker: r["Ticker dell'emittente"]?.trim() || undefined,
    countryName: r['Area Geografica']?.trim() || undefined,
    sectorName: r['Settore']?.trim() || undefined,
  }
}

export const iSharesParser: IssuerParser = {
  label: 'iShares',
  hint: 'File CSV scaricato direttamente dalla pagina prodotto iShares. La data snapshot viene estratta automaticamente.',
  parse: (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onerror = () => reject(new Error('Impossibile leggere il file'))

      reader.onload = (e) => {
        const text = e.target?.result as string
        const lines = text.split(/\r?\n/)

        // Extract date from first line: Al,"02/04/2026"
        const validFrom = parseISharesDate(lines[0] ?? '')

        // Remove the 2 metadata lines, keep the rest (header + data)
        const csvBody = lines.slice(2).join('\n')

        Papa.parse<ISharesRow>(csvBody, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          complete: (result) => {
            // Ignore FieldMismatch (e.g. trailing empty lines) — reject only on fatal errors
            const fatalErrors = result.errors.filter((e) => e.type !== 'FieldMismatch')
            if (fatalErrors.length > 0) {
              reject(new Error(fatalErrors[0].message))
              return
            }

            const holdings: HoldingItem[] = result.data
              .filter((r) => {
                const assetClass = r['Asset Class']?.trim()
                const weight = parseWeight(r['Ponderazione (%)'] ?? '0')
                // Keep only equity rows with positive weight
                return assetClass === 'Azionario' && weight > 0
              })
              .map(mapRow)

            if (holdings.length === 0) {
              reject(new Error('Nessuna riga azionaria trovata nel file iShares.'))
              return
            }

            resolve({ holdings, validFrom })
          },
          error: (err: Error) => reject(new Error(err.message)),
        })
      }

      reader.readAsText(file, 'utf-8')
    }),
}
