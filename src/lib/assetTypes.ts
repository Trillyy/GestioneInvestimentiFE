import type { AssetType } from '@/types/api'

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
