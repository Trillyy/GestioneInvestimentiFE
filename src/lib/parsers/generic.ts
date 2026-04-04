import Papa from 'papaparse'
import type { HoldingItem } from '@/types/api'
import type { IssuerParser } from './types'

interface GenericCsvRow {
  weightPct: string
  heldAssetName: string
  heldAssetIsin?: string
  heldAssetTicker?: string
  heldAssetId?: string
  countryName?: string
  sectorName?: string
}

function parseWeight(raw: string): number {
  return parseFloat(raw.trim().replace('%', '').replace(',', '.'))
}

function parseRows(rows: GenericCsvRow[]): HoldingItem[] {
  return rows
    .filter((r) => r.heldAssetName && r.weightPct)
    .map((r) => ({
      weightPct: parseWeight(r.weightPct),
      heldAssetName: r.heldAssetName.trim(),
      heldAssetIsin: r.heldAssetIsin?.trim() || undefined,
      heldAssetTicker: r.heldAssetTicker?.trim() || undefined,
      heldAssetId: r.heldAssetId ? Number(r.heldAssetId) : undefined,
      countryName: r.countryName?.trim() || undefined,
      sectorName: r.sectorName?.trim() || undefined,
    }))
}

export const genericParser: IssuerParser = {
  label: 'Generico',
  hint: 'CSV con colonne: weightPct, heldAssetName, heldAssetIsin, heldAssetTicker, heldAssetId, countryName, sectorName',
  parse: (file) =>
    new Promise((resolve, reject) => {
      Papa.parse<GenericCsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (result) => {
          if (result.errors.length > 0) {
            reject(new Error(result.errors[0].message))
            return
          }
          const holdings = parseRows(result.data)
          if (holdings.length === 0) {
            reject(new Error('Nessuna riga valida trovata. Controlla le colonne del CSV.'))
            return
          }
          resolve({ holdings })
        },
        error: (err) => reject(new Error(err.message)),
      })
    }),
}
