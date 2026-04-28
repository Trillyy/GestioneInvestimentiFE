import type { AssetResponse, AssetType, CouponFrequency, DistributionType, ReplicationMethod } from '@/types/api.ts'

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  STOCK: 'Azione',
  ETF: 'ETF',
  FUND: 'Fondo',
  BOND: 'Obbligazione',
  CRYPTO: 'Criptovaluta',
}

export const ASSET_TYPE_VARIANT: Record<AssetType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  STOCK: 'default',
  ETF: 'secondary',
  FUND: 'secondary',
  BOND: 'outline',
  CRYPTO: 'destructive',
}

export const ASSET_TYPES: AssetType[] = ['STOCK', 'ETF', 'FUND', 'BOND', 'CRYPTO']

export const REPLICATION_LABELS: Record<ReplicationMethod, string> = {
  PHYSICAL_FULL: 'Fisica completa',
  PHYSICAL_SAMPLING: 'Fisica a campione',
  SYNTHETIC: 'Sintetica',
}

export const REPLICATION_METHODS: ReplicationMethod[] = ['PHYSICAL_FULL', 'PHYSICAL_SAMPLING', 'SYNTHETIC']

export const DISTRIBUTION_LABELS: Record<DistributionType, string> = {
  ACCUMULATING: 'Accumulazione',
  DISTRIBUTING: 'Distribuzione',
}

export const DISTRIBUTION_TYPES: DistributionType[] = ['ACCUMULATING', 'DISTRIBUTING']

export const COUPON_FREQ_LABELS: Record<CouponFrequency, string> = {
  1: 'Annuale',
  2: 'Semestrale',
  4: 'Trimestrale',
  12: 'Mensile',
}

export function getIssuer(asset: AssetResponse): string | null {
  return asset.etfDetail?.issuer ?? asset.bondDetail?.issuer ?? null
}
