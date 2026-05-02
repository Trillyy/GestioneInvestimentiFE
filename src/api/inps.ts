import type {
  ApiResponse,
  TassoCapitalizzazioneInpsRequest,
  TassoCapitalizzazioneInpsResponse,
} from '@/types/api'
import { apiClient } from './client'

const BASE = '/api/v1/inps/tasso-capitalizzazione'

export async function listTassi(): Promise<ApiResponse<TassoCapitalizzazioneInpsResponse[]>> {
  const { data } = await apiClient.get<ApiResponse<TassoCapitalizzazioneInpsResponse[]>>(BASE)
  return data
}

export async function insertTasso(payload: TassoCapitalizzazioneInpsRequest): Promise<ApiResponse<TassoCapitalizzazioneInpsResponse>> {
  const { data } = await apiClient.post<ApiResponse<TassoCapitalizzazioneInpsResponse>>(BASE, payload)
  return data
}

export async function updateTasso(id: number, payload: TassoCapitalizzazioneInpsRequest): Promise<ApiResponse<TassoCapitalizzazioneInpsResponse>> {
  const { data } = await apiClient.put<ApiResponse<TassoCapitalizzazioneInpsResponse>>(`${BASE}/${id}`, payload)
  return data
}

export async function deleteTasso(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`)
}

