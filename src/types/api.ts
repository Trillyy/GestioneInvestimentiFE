// ─── Generic wrappers ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: string
}

export interface PagedResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type AssetType = 'STOCK' | 'ETF' | 'FUND' | 'BOND' | 'CRYPTO'
export type ReplicationMethod = 'PHYSICAL_FULL' | 'PHYSICAL_SAMPLING' | 'SYNTHETIC'
export type DistributionType = 'ACCUMULATING' | 'DISTRIBUTING'
/** Numero di cedole per anno: 1=annuale, 2=semestrale, 4=trimestrale, 12=mensile */
export type CouponFrequency = 1 | 2 | 4 | 12

// ─── Asset ───────────────────────────────────────────────────────────────────

export interface StockDetail {
  countryCode: string | null
  countryName: string | null
  sectorId: number | null
  sectorName: string | null
}

export interface EtfDetail {
  issuer: string | null
  replicationMethod: ReplicationMethod | null
  distributionType: DistributionType | null
  benchmarkIndex: string | null
  ter: number | null
  inceptionDate: string | null
  domicileCountryCode: string | null
}

export interface BondDetail {
  issuer: string | null
  countryCode: string | null
  countryName: string | null
  maturityDate: string | null
  couponRate: number | null
  couponFrequency: CouponFrequency | null
  faceValue: number | null
  inflationLinked: boolean
}

export interface CryptoDetail {
  coingeckoId: string | null
  network: string | null
  tokenStandard: string | null
}

export interface AssetResponse {
  id: number
  ticker: string
  isin: string | null
  name: string
  assetType: AssetType
  currencyCode: string
  exchange: string | null
  active: boolean
  createdAt: string
  stockDetail: StockDetail | null
  etfDetail: EtfDetail | null
  bondDetail: BondDetail | null
  cryptoDetail: CryptoDetail | null
}

export interface AssetCreateRequest {
  ticker: string
  isin?: string
  name: string
  assetType: AssetType
  currencyCode: string
  exchange?: string
  // STOCK
  countryCode?: string
  sectorId?: number
  // ETF / FUND
  issuer?: string
  replicationMethod?: ReplicationMethod
  distributionType?: DistributionType
  benchmarkIndex?: string
  ter?: number
  inceptionDate?: string
  domicileCountryCode?: string
  // BOND
  bondIssuer?: string
  bondCountryCode?: string
  maturityDate?: string
  couponRate?: number
  couponFrequency?: CouponFrequency
  faceValue?: number
  inflationLinked?: boolean
  // CRYPTO
  coingeckoId?: string
  network?: string
  tokenStandard?: string
}

// ─── ETF Holdings ─────────────────────────────────────────────────────────────

export interface HoldingItem {
  weightPct: number
  heldAssetName: string
  heldAssetIsin?: string
  heldAssetTicker?: string
  heldAssetId?: number
  countryName?: string
  sectorName?: string
}

export interface EtfHoldingRequest {
  validFrom: string // LocalDate ISO string
  holdings: HoldingItem[]
}

export interface EtfHoldingResponse {
  id: number
  validFrom: string
  weightPct: number
  heldAssetName: string
  heldAssetIsin: string | null
  heldAssetTicker: string | null
  heldAssetId: number | null
  heldAssetRegistryName: string | null
  countryCode: string | null
  countryName: string | null
  sectorId: number | null
  sectorName: string | null
}
