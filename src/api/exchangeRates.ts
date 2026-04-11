import type {
  ApiResponse,
  CurrencyPairCreateRequest,
  CurrencyPairDetailResponse,
  CurrencyPairResponse,
  PagedResponse,
} from '@/types/api'
import { apiClient } from './client'

export async function listCurrencyPairs(
  page = 0,
  size = 100,
): Promise<ApiResponse<PagedResponse<CurrencyPairResponse>>> {
  const { data } = await apiClient.get<ApiResponse<PagedResponse<CurrencyPairResponse>>>(
    '/api/v1/exchange-rates',
    { params: { page, size, sort: 'baseCurrency.code,asc' } },
  )
  return data
}

export async function createCurrencyPair(
  payload: CurrencyPairCreateRequest,
): Promise<ApiResponse<CurrencyPairResponse>> {
  const { data } = await apiClient.post<ApiResponse<CurrencyPairResponse>>(
    '/api/v1/exchange-rates',
    payload,
  )
  return data
}

export async function getCurrencyPairDetail(
  id: number,
  from?: string,
  to?: string,
): Promise<ApiResponse<CurrencyPairDetailResponse>> {
  const { data } = await apiClient.get<ApiResponse<CurrencyPairDetailResponse>>(
    `/api/v1/exchange-rates/${id}`,
    { params: { ...(from && { from }), ...(to && { to }) } },
  )
  return data
}

export async function syncExchangeRates(): Promise<ApiResponse<number>> {
  const { data } = await apiClient.post<ApiResponse<number>>('/api/v1/exchange-rates/sync')
  return data
}
