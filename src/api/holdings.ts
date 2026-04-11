import type { ApiResponse, PortfolioHoldingsResponse } from '@/types/api'
import { apiClient } from './client'

export async function listHoldings(portfolioId?: number): Promise<ApiResponse<PortfolioHoldingsResponse>> {
  const { data } = await apiClient.get<ApiResponse<PortfolioHoldingsResponse>>(
    '/api/v1/holdings',
    { params: portfolioId != null ? { portfolioId } : {} },
  )
  return data
}
