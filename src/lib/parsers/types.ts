import type { HoldingItem } from '@/types/api'

export interface ParseResult {
  holdings: HoldingItem[]
  /** Data snapshot estratta automaticamente dal file (ISO YYYY-MM-DD), se disponibile */
  validFrom?: string
}

export type HoldingsParser = (file: File) => Promise<ParseResult>

export interface IssuerParser {
  label: string
  parse: HoldingsParser
  /** Descrizione del formato atteso, mostrata nell'UI */
  hint: string
}
