import type { ApiResponse, PortfolioValueHistoryDetailResponse } from '@/types/api'
import { apiClient } from './client'

export async function getPortfolioValueHistory(
  portfolioId?: number,
  from?: string,
  to?: string,
): Promise<ApiResponse<PortfolioValueHistoryDetailResponse>> {
  const { data } = await apiClient.get<ApiResponse<PortfolioValueHistoryDetailResponse>>(
    '/api/v1/portfolio-value-history',
    {
      params: {
        ...(portfolioId != null && { portfolioId }),
        ...(from && { from }),
        ...(to && { to }),
      },
    },
  )
  return data
}
