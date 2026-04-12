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
  lastPrice: number | null
  lastPriceDate: string | null
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

// ─── Asset Detail ────────────────────────────────────────────────────────────

export type PriceType = 'CLOSE' | 'OPEN' | 'ADJUSTED_CLOSE' | 'NAV'

export interface PricePoint {
  date: string
  price: number
  volume: number | null
}

export interface PriceChart {
  week: PricePoint[]
  month: PricePoint[]
  year: PricePoint[]
  custom: PricePoint[] | null
}

export interface AssetDetailResponse extends AssetResponse {
  displayCurrencyCode: string
  priceChart: PriceChart
}

// ─── Portfolios ───────────────────────────────────────────────────────────────

export interface PortfolioResponse {
  id: number
  name: string
  description: string | null
  currencyCode: string
  active: boolean
}

// ─── Sectors ──────────────────────────────────────────────────────────────────

export interface SectorResponse {
  id: number
  code: string
  name: string
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export type TransactionType =
  | 'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST'
  | 'SPLIT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'FEE'

export interface TransactionResponse {
  id: number
  portfolioId: number
  portfolioName: string
  assetId: number | null
  assetName: string | null
  assetTicker: string | null
  assetIsin: string | null
  assetType: AssetType | null
  transactionType: TransactionType
  transactionDate: string
  quantity: number
  unitPrice: number | null
  totalAmount: number
  fees: number
  currencyCode: string
  exchangeRateToBase: number
  realizedPnl: number | null
  realizedPnlBase: number | null
  avgCostBasisAtSale: number | null
  notes: string | null
  createdAt: string
}

export interface TransactionCreateRequest {
  portfolioId: number
  assetId?: number
  transactionType: TransactionType
  transactionDate: string
  quantity?: number
  unitPrice?: number
  totalAmount: number
  fees?: number
  currencyCode: string
  exchangeRateToBase?: number
  notes?: string
}

// ─── Exchange Rates ───────────────────────────────────────────────────────────

export interface CurrencyPairResponse {
  id: number
  baseCurrencyCode: string
  baseCurrencyName: string
  baseCurrencySymbol: string
  quoteCurrencyCode: string
  quoteCurrencyName: string
  quoteCurrencySymbol: string
  active: boolean
  yahooSymbol: string
  lastRate: number | null
  lastRateDate: string | null
}

export interface CurrencyPairCreateRequest {
  baseCurrencyCode: string
  quoteCurrencyCode: string
}

export interface RatePoint {
  date: string
  rate: number
}

export interface RateChart {
  week: RatePoint[]
  month: RatePoint[]
  year: RatePoint[]
  custom: RatePoint[] | null
}

export interface CurrencyPairDetailResponse extends CurrencyPairResponse {
  rateChart: RateChart
}

// ─── Portfolio Holdings ───────────────────────────────────────────────────────

export interface PortfolioHoldingResponse {
  id: number
  portfolioId: number
  portfolioName: string
  assetId: number
  assetName: string
  ticker: string
  isin: string | null
  assetType: AssetType
  currencyCode: string
  quantityHeld: number
  averageCost: number
  totalInvested: number
  lastPrice: number | null
  lastPriceDate: string | null
  unrealizedPnl: number | null
  unrealizedPnlBase: number | null
  unrealizedPnlPct: number | null
  firstBuyDate: string | null
  lastTransactionDate: string | null
}

export interface PortfolioHoldingsResponse {
  holdings: PortfolioHoldingResponse[]
  totalInvested: number
  totalUnrealizedPnl: number
  totalUnrealizedPnlPct: number
}

export interface AssetHoldingDetail {
  holding: PortfolioHoldingResponse
  transactions: TransactionResponse[]
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
