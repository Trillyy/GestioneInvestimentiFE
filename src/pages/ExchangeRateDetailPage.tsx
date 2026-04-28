import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getCurrencyPairDetail } from '@/api/exchangeRates'
import { CustomLineChart } from '@/components/custom-line-chart'
import { InfoRow } from '@/components/ui/info-row'
import { fmtDate, TODAY } from '@/helpers/formatters.ts'
import { useChartWindow } from '@/hooks/useChartWindow'
import { ChartWindowPicker } from '@/components/chart-window-picker'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CurrencyPairDetailResponse } from '@/types/api'

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExchangeRateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const pairId = Number(id)

  const [pair, setPair] = useState<CurrencyPairDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  async function fetchDetail(opts?: { from?: string; to?: string }) {
    try {
      const res = await getCurrencyPairDetail(pairId, opts?.from, opts?.to)
      setPair(res.data)
    } catch {
      toast.error('Errore nel caricamento del dettaglio')
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchDetail().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairId])

  const {
    window,
    from, setFrom,
    to, setTo,
    customLoading,
    handleWindowChange,
    handleCustomSearch,
  } = useChartWindow((from, to) => fetchDetail({ from, to }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Caricamento…
      </div>
    )
  }

  if (!pair) return null

  const chartData =
    window === 'week' || window === 'month' || window === 'year'
      ? pair.rateChart[window]
      : (pair.rateChart.custom ?? [])

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/exchange-rates" className="hover:text-foreground transition-colors">
          Cambi Monetari
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">
          {pair.baseCurrencyCode}/{pair.quoteCurrencyCode}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono">
            {pair.baseCurrencyCode}/{pair.quoteCurrencyCode}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {pair.baseCurrencyName} / {pair.quoteCurrencyName}
            </span>
            <Badge variant={pair.active ? 'default' : 'outline'}>
              {pair.active ? 'Attiva' : 'Inattiva'}
            </Badge>
          </div>
        </div>

        {pair.lastRate != null && (
          <div className="text-right">
            <div className="text-2xl font-mono font-semibold">
              {pair.lastRate.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1.5 mt-0.5">
              {pair.lastRateDate === TODAY && (
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              )}
              Aggiornato {fmtDate(pair.lastRateDate)}
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informazioni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <InfoRow label="Simbolo Yahoo" value={pair.yahooSymbol} />
            <InfoRow
              label="Valuta Base"
              value={`${pair.baseCurrencySymbol} ${pair.baseCurrencyName} (${pair.baseCurrencyCode})`}
            />
            <InfoRow
              label="Valuta Quotata"
              value={`${pair.quoteCurrencySymbol} ${pair.quoteCurrencyName} (${pair.quoteCurrencyCode})`}
            />
            <InfoRow label="Ultimo Aggiornamento" value={fmtDate(pair.lastRateDate)} />
          </div>
        </CardContent>
      </Card>

      {/* Rate Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Storico Tassi di Cambio</CardTitle>

          <ChartWindowPicker
            window={window}
            customLoading={customLoading}
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
            onWindowChange={handleWindowChange}
            onCustomSearch={handleCustomSearch}
          />
        </CardHeader>
        <CardContent>
          <CustomLineChart
            data={chartData as Record<string, unknown>[]}
            lines={[{ dataKey: 'rate', name: 'Tasso', color: '#6366f1' }]}
            yAxisWidth={70}
            yAxisTickFormatter={(v) => v.toFixed(4)}
            tooltipValueFormatter={(v) => v.toFixed(6)}
            computeDomain
            domainPaddingFallback={0.001}
          />
        </CardContent>
      </Card>
    </div>
  )
}
