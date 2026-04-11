import type { ApiResponse, PortfolioResponse } from '@/types/api'
import { apiClient } from './client'

export async function listPortfolios(): Promise<ApiResponse<PortfolioResponse[]>> {
  const { data } = await apiClient.get<ApiResponse<PortfolioResponse[]>>('/api/v1/portfolios')
  return data
}
