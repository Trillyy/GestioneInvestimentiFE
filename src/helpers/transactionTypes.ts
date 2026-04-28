import type { TransactionType } from '@/types/api.ts'

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  BUY: 'Acquisto',
  SELL: 'Vendita',
  DIVIDEND: 'Dividendo',
  INTEREST: 'Interesse',
  SPLIT: 'Split',
  TRANSFER_IN: 'Trasf. Entrata',
  TRANSFER_OUT: 'Trasf. Uscita',
  FEE: 'Commissione',
}

export const TRANSACTION_TYPE_VARIANT: Record<TransactionType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  BUY: 'default',
  SELL: 'destructive',
  DIVIDEND: 'secondary',
  INTEREST: 'secondary',
  SPLIT: 'outline',
  TRANSFER_IN: 'secondary',
  TRANSFER_OUT: 'outline',
  FEE: 'outline',
}

export const TRANSACTION_TYPES: TransactionType[] = [
  'BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT', 'FEE',
]

export const NEEDS_ASSET: TransactionType[] = ['BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT']

export const HAS_QTY_PRICE: TransactionType[] = ['BUY', 'SELL', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT']
