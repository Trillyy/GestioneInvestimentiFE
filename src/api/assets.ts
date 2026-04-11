import type {
  ApiResponse,
  AssetCreateRequest,
  AssetDetailResponse,
  AssetResponse,
  EtfHoldingRequest,
  EtfHoldingResponse,
  PagedResponse,
  PriceType,
} from '@/types/api'
import { apiClient } from './client'

export async function listAssets(page = 0, size = 20): Promise<ApiResponse<PagedResponse<AssetResponse>>> {
  const { data } = await apiClient.get<ApiResponse<PagedResponse<AssetResponse>>>(
    '/api/v1/assets',
    { params: { page, size, sort: 'name,asc' } },
  )
  return data
}

export async function createAsset(payload: AssetCreateRequest): Promise<ApiResponse<AssetResponse>> {
  const { data } = await apiClient.post<ApiResponse<AssetResponse>>('/api/v1/assets', payload)
  return data
}

export async function getAssetDetail(
  assetId: number,
  priceType: PriceType = 'CLOSE',
  from?: string,
  to?: string,
  currency?: string,
): Promise<ApiResponse<AssetDetailResponse>> {
  const { data } = await apiClient.get<ApiResponse<AssetDetailResponse>>(
    `/api/v1/assets/${assetId}`,
    { params: { priceType, ...(from && { from }), ...(to && { to }), ...(currency && { currency }) } },
  )
  return data
}

export async function getHoldings(assetId: number): Promise<ApiResponse<EtfHoldingResponse[]>> {
  const { data } = await apiClient.get<ApiResponse<EtfHoldingResponse[]>>(
    `/api/v1/assets/${assetId}/holdings`,
  )
  return data
}

export async function saveHoldings(
  assetId: number,
  payload: EtfHoldingRequest,
): Promise<ApiResponse<EtfHoldingResponse[]>> {
  const { data } = await apiClient.post<ApiResponse<EtfHoldingResponse[]>>(
    `/api/v1/assets/${assetId}/holdings`,
    payload,
  )
  return data
}

export async function syncPrices(): Promise<ApiResponse<number>> {
  const { data } = await apiClient.post<ApiResponse<number>>('/api/v1/price-history/sync')
  return data
}
