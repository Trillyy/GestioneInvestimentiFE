import type { EtfHoldingResponse, PensionFundBenchmarkResponse } from '@/types/api.ts'
import type { ChartSlice } from '@/components/custom-pie-chart'
import { BENCHMARK_TYPE_LABELS } from '@/helpers/pensionFundTypes.ts'

export function buildChartData(
  holdings: EtfHoldingResponse[],
  key: 'sectorName' | 'countryName',
): ChartSlice[] {
  const map = new Map<string, number>()
  for (const h of holdings) {
    const label = h[key] ?? 'N/D'
    map.set(label, (map.get(label) ?? 0) + Number(h.weightPct))
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

export function buildTypeData(items: PensionFundBenchmarkResponse[]): ChartSlice[] {
  const map = new Map<string, number>()
  for (const b of items) {
    const label = BENCHMARK_TYPE_LABELS[b.type]
    map.set(label, (map.get(label) ?? 0) + b.percentage)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

export function buildHedgeData(items: PensionFundBenchmarkResponse[]): ChartSlice[] {
  const hedged = items.filter((b) => b.hedged).reduce((s, b) => s + b.percentage, 0)
  const notHedged = items.filter((b) => !b.hedged).reduce((s, b) => s + b.percentage, 0)
  return [
    ...(notHedged > 0 ? [{ name: 'Non Hedged', value: Math.round(notHedged * 100) / 100 }] : []),
    ...(hedged > 0 ? [{ name: 'Hedged', value: Math.round(hedged * 100) / 100 }] : []),
  ]
}
