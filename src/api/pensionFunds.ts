import type {
  ApiResponse,
  PagedResponse,
  PensionFundBenchmarkCreateRequest,
  PensionFundBenchmarkResponse,
  PensionFundCreateRequest,
  PensionFundHoldingResponse,
  PensionFundNavResponse,
  PensionFundOperationCreateRequest,
  PensionFundOperationImportResult,
  PensionFundOperationResponse,
  PensionFundResponse,
  PensionFundUpdateRequest,
} from '@/types/api'
import { apiClient } from './client'

const BASE = '/api/v1/pension-funds'

export async function listPensionFunds(): Promise<ApiResponse<PensionFundResponse[]>> {
  const { data } = await apiClient.get<ApiResponse<PensionFundResponse[]>>(BASE)
  return data
}

export async function createPensionFund(payload: PensionFundCreateRequest): Promise<ApiResponse<PensionFundResponse>> {
  const { data } = await apiClient.post<ApiResponse<PensionFundResponse>>(BASE, payload)
  return data
}

export async function getPensionFund(id: number): Promise<ApiResponse<PensionFundResponse>> {
  const { data } = await apiClient.get<ApiResponse<PensionFundResponse>>(`${BASE}/${id}`)
  return data
}

export async function updatePensionFund(id: number, payload: PensionFundUpdateRequest): Promise<ApiResponse<PensionFundResponse>> {
  const { data } = await apiClient.put<ApiResponse<PensionFundResponse>>(`${BASE}/${id}`, payload)
  return data
}

export async function deletePensionFund(id: number): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`)
}

// ─── Benchmark ───────────────────────────────────────────────────────────────

export async function listBenchmark(fundId: number): Promise<ApiResponse<PensionFundBenchmarkResponse[]>> {
  const { data } = await apiClient.get<ApiResponse<PensionFundBenchmarkResponse[]>>(`${BASE}/${fundId}/benchmark`)
  return data
}

export async function addBenchmark(
  fundId: number,
  payload: PensionFundBenchmarkCreateRequest,
): Promise<ApiResponse<PensionFundBenchmarkResponse>> {
  const { data } = await apiClient.post<ApiResponse<PensionFundBenchmarkResponse>>(`${BASE}/${fundId}/benchmark`, payload)
  return data
}

export async function deleteBenchmark(fundId: number, benchmarkId: number): Promise<void> {
  await apiClient.delete(`${BASE}/${fundId}/benchmark/${benchmarkId}`)
}

// ─── Operations ──────────────────────────────────────────────────────────────

export async function listOperations(
  fundId: number,
  page = 0,
  size = 20,
): Promise<ApiResponse<PagedResponse<PensionFundOperationResponse>>> {
  const { data } = await apiClient.get<ApiResponse<PagedResponse<PensionFundOperationResponse>>>(
    `${BASE}/${fundId}/operations`,
    { params: { page, size } },
  )
  return data
}

export async function addOperation(
  fundId: number,
  payload: PensionFundOperationCreateRequest,
): Promise<ApiResponse<PensionFundOperationResponse>> {
  const { data } = await apiClient.post<ApiResponse<PensionFundOperationResponse>>(`${BASE}/${fundId}/operations`, payload)
  return data
}

export async function deleteOperation(fundId: number, operationId: number): Promise<void> {
  await apiClient.delete(`${BASE}/${fundId}/operations/${operationId}`)
}

export async function importOperations(
  fundId: number,
  file: File,
): Promise<ApiResponse<PensionFundOperationImportResult>> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<ApiResponse<PensionFundOperationImportResult>>(
    `${BASE}/${fundId}/operations/import`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
}

// ─── NAV ─────────────────────────────────────────────────────────────────────

export async function listNav(fundId: number): Promise<ApiResponse<PensionFundNavResponse[]>> {
  const { data } = await apiClient.get<ApiResponse<PensionFundNavResponse[]>>(`${BASE}/${fundId}/nav`)
  return data
}

export async function syncNav(): Promise<ApiResponse<number>> {
  const { data } = await apiClient.post<ApiResponse<number>>(`${BASE}/nav/sync`)
  return data
}

// ─── Holding ─────────────────────────────────────────────────────────────────

export async function getHolding(
  fundId: number,
  date?: string,
): Promise<ApiResponse<PensionFundHoldingResponse[]>> {
  const { data } = await apiClient.get<ApiResponse<PensionFundHoldingResponse[]>>(
    `${BASE}/${fundId}/holding`,
    date ? { params: { date } } : undefined,
  )
  return data
}
