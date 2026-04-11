import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getCurrencyPairDetail } from '@/api/exchangeRates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { CurrencyPairDetailResponse, RatePoint } from '@/types/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RateWindow = 'week' | 'month' | 'year' | 'ytd' | 'custom'

const WINDOW_LABELS: Record<RateWindow, string> = {
  week: 'Sett.',
  month: 'Mese',
  year: 'Anno',
  ytd: 'YTD',
  custom: 'Personalizzato',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('it-IT')
}

// ─── Rate Chart ───────────────────────────────────────────────────────────────

function RateLineChart({ data }: { data: RatePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Nessun dato disponibile per il periodo selezionato
      </div>
    )
  }

  const rates = data.map((d) => d.rate)
  const minRate = Math.min(...rates)
  const maxRate = Math.max(...rates)
  const padding = (maxRate - minRate) * 0.05 || 0.001

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
          }
          tick={{ fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minRate - padding, maxRate + padding]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toFixed(4)}
          width={70}
        />
        <Tooltip
          formatter={(v: number) => [v.toFixed(6), 'Tasso']}
          labelFormatter={(label: string) => new Date(label).toLocaleDateString('it-IT')}
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExchangeRateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const pairId = Number(id)

  const [pair, setPair] = useState<CurrencyPairDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [window, setWindow] = useState<RateWindow>('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [customLoading, setCustomLoading] = useState(false)

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

  async function handleWindowChange(w: RateWindow) {
    setWindow(w)
    if (w === 'ytd') {
      const today = new Date()
      const jan1 = `${today.getFullYear()}-01-01`
      const todayStr = today.toISOString().slice(0, 10)
      setCustomLoading(true)
      try { await fetchDetail({ from: jan1, to: todayStr }) }
      finally { setCustomLoading(false) }
    } else if (w === 'custom') {
      return
    }
    // week/month/year are pre-fetched in the response, no extra call needed
  }

  async function handleCustomSearch() {
    if (!from || !to) {
      toast.error('Inserisci entrambe le date')
      return
    }
    setCustomLoading(true)
    setWindow('custom')
    try {
      await fetchDetail({ from, to })
    } finally {
      setCustomLoading(false)
    }
  }

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

  const TODAY = new Date().toISOString().slice(0, 10)

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
              Aggiornato {formatDate(pair.lastRateDate)}
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
            <InfoRow label="Ultimo Aggiornamento" value={formatDate(pair.lastRateDate)} />
          </div>
        </CardContent>
      </Card>

      {/* Rate Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Storico Tassi di Cambio</CardTitle>

          <div className="flex gap-1 mt-2 flex-wrap">
            {(['week', 'month', 'year', 'ytd', 'custom'] as RateWindow[]).map((w) => (
              <Button
                key={w}
                variant={window === w ? 'default' : 'outline'}
                size="xs"
                disabled={customLoading}
                onClick={() => void handleWindowChange(w)}
              >
                {WINDOW_LABELS[w]}
              </Button>
            ))}
          </div>

          {window === 'custom' && (
            <>
              <Separator className="mt-3" />
              <div className="flex items-end gap-3 mt-3 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Dal</Label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-8 w-36"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Al</Label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-8 w-36"
                  />
                </div>
                <Button size="sm" onClick={() => void handleCustomSearch()} disabled={customLoading}>
                  {customLoading ? 'Caricamento…' : 'Cerca'}
                </Button>
              </div>
            </>
          )}
        </CardHeader>
        <CardContent>
          <RateLineChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  )
}
