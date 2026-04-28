import type { BenchmarkType, PensionOperationStatus, PensionOperationType } from '@/types/api.ts'

export const BENCHMARK_TYPE_LABELS: Record<BenchmarkType, string> = {
  EQUITY: 'Azionario',
  BOND: 'Obbligazionario',
  COMMODITY: 'Materie Prime',
  REAL_ESTATE: 'Immobiliare',
  CASH: 'Liquidità',
  MIXED: 'Misto',
  OTHER: 'Altro',
}

export const BENCHMARK_TYPES: BenchmarkType[] = [
  'EQUITY', 'BOND', 'COMMODITY', 'REAL_ESTATE', 'CASH', 'MIXED', 'OTHER',
]

export const OPERATION_TYPE_LABELS: Record<PensionOperationType, string> = {
  VOLUNTARY_CONTRIBUTION: 'Contributo Volontario',
  COMPANY_CONTRIBUTION: 'Contributo Aziendale',
  TFR: 'TFR',
  MEMBERSHIP_FEE: 'Quota Associativa',
  OTHER_CONTRIBUTION: 'Altro Contributo',
  ADVANCE: 'Anticipazione',
}

export const OPERATION_TYPES: PensionOperationType[] = [
  'VOLUNTARY_CONTRIBUTION', 'COMPANY_CONTRIBUTION', 'TFR',
  'MEMBERSHIP_FEE', 'OTHER_CONTRIBUTION', 'ADVANCE',
]

export const OPERATION_STATUS_LABELS: Record<PensionOperationStatus, string> = {
  INVESTED: 'Investito',
  INVESTING: 'In Investimento',
  PAYED: 'Pagato',
}

export const OPERATION_STATUSES: PensionOperationStatus[] = ['INVESTED', 'INVESTING', 'PAYED']
