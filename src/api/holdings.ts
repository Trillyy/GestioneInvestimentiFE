import type { ApiResponse, AssetHoldingDetail, PortfolioHoldingsResponse } from '@/types/api'
import { apiClient } from './client'

export async function listHoldings(portfolioId?: number): Promise<ApiResponse<PortfolioHoldingsResponse>> {
  const { data } = await apiClient.get<ApiResponse<PortfolioHoldingsResponse>>(
    '/api/v1/holdings',
    { params: portfolioId != null ? { portfolioId } : {} },
  )
  return data
}

export async function getHoldingsByAsset(assetId: number): Promise<ApiResponse<AssetHoldingDetail[]>> {
  const { data } = await apiClient.get<ApiResponse<AssetHoldingDetail[]>>(
    `/api/v1/holdings/asset/${assetId}`,
  )
  return data
}
