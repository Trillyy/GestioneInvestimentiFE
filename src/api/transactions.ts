import type {
  ApiResponse,
  PagedResponse,
  TransactionCreateRequest,
  TransactionResponse,
} from '@/types/api'
import { apiClient } from './client'

export async function listTransactions(
  page = 0,
  size = 20,
  portfolioId?: number,
): Promise<ApiResponse<PagedResponse<TransactionResponse>>> {
  const { data } = await apiClient.get<ApiResponse<PagedResponse<TransactionResponse>>>(
    '/api/v1/transactions',
    { params: { page, size, ...(portfolioId != null && { portfolioId }) } },
  )
  return data
}

export async function createTransaction(
  payload: TransactionCreateRequest,
): Promise<ApiResponse<TransactionResponse>> {
  const { data } = await apiClient.post<ApiResponse<TransactionResponse>>(
    '/api/v1/transactions',
    payload,
  )
  return data
}
