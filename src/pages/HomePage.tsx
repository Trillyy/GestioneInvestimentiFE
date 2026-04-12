import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown, Wallet, ExternalLink } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { listHoldings } from '@/api/holdings'
import { listPortfolios } from '@/api/portfolios'
import { getPortfolioValueHistory } from '@/api/portfolioValueHistory'
import { type ChartWindow, fmtCurrency, fmtNum, pnlColorClass, WINDOW_LABELS} from '@/lib/formatters'
import { ASSET_TYPE_LABELS, ASSET_TYPE_VARIANT, ASSET_TYPES } from '@/lib/assetTypes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AssetType, PortfolioHoldingResponse, PortfolioHoldingsResponse, PortfolioResponse, PortfolioValueHistoryDetailResponse, SnapshotPoint } from '@/types/api'
import { cn } from '@/lib/utils'

// ─── Portfolio chart ──────────────────────────────────────────────────────────

function getWindowDates(w: Exclude<ChartWindow, 'custom'>): { from: string; to: string } {
  const today = new Date()
  const to = today.toISOString().slice(0, 10)
  if (w === 'ytd') return { from: `${today.getFullYear()}-01-01`, to }
  if (w === 'alltime') return { from: '1900-01-01', to }
  const from = new Date(today)
  if (w === 'week') from.setDate(from.getDate() - 7)
  else if (w === 'month') from.setMonth(from.getMonth() - 1)
  else from.setFullYear(from.getFullYear() - 1) // year
  return { from: from.toISOString().slice(0, 10), to }
}

function PortfolioChart({
  data,
  currency,
  onHover,
  onHoverEnd,
}: {
  data: SnapshotPoint[]
  currency: string
  onHover?: (point: SnapshotPoint) => void
  onHoverEnd?: () => void
}) {
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Nessun dato disponibile per il periodo selezionato
      </div>
    )
  }

  const allValues = data.flatMap((d) => [d.totalValue, d.totalInvested])
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const padding = (maxVal - minVal) * 0.05 || 100

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={data}
        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        onMouseMove={(state) => {
          const index = state.activeTooltipIndex
          if (index != null && data[index] != null) {
            if (hoverTimer.current) clearTimeout(hoverTimer.current)
            hoverTimer.current = setTimeout(() => onHover?.(data[index]), 60)
          }
        }}
        onMouseLeave={() => {
          if (hoverTimer.current) {
            clearTimeout(hoverTimer.current)
            hoverTimer.current = null
          }
          onHoverEnd?.()
        }}
      >
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
          domain={[Math.max(0, minVal - padding), maxVal + padding]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => fmtNum(v, 0)}
          width={90}
        />
        <Tooltip
          formatter={(v: number, name: string) => [
            `${fmtNum(v)} ${currency}`,
            name,
          ]}
          labelFormatter={(label: string) => new Date(label).toLocaleDateString('it-IT')}
        />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs">{value}</span>
          )}
        />
        <Line
          type="monotone"
          dataKey="totalValue"
          name="Valore"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="totalInvested"
          name="Investito"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────


function PnlCell({ value, pct }: { value: number | null; pct?: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  const positive = value >= 0
  return (
    <span className={cn('font-mono font-medium', pnlColorClass(positive ? 1 : -1))}>
      {positive ? '+' : ''}{fmtNum(value)} €
      {pct != null && (
        <span className="ml-1 text-xs opacity-75">
          ({positive ? '+' : ''}{fmtNum(pct)}%)
        </span>
      )}
    </span>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  positive,
  icon: Icon,
}: {
  title: string
  value: string
  sub?: string
  positive?: boolean
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn('size-4', positive === undefined ? 'text-muted-foreground' : positive ? 'text-emerald-500' : 'text-red-500')} />
      </CardHeader>
      <CardContent>
        <p className={cn(
          'text-2xl font-bold',
          positive === undefined ? '' : positive ? 'text-emerald-600' : 'text-red-500',
        )}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([])
  const [portfolioFilter, setPortfolioFilter] = useState<string>('')
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetType | ''>('')
  const [data, setData] = useState<PortfolioHoldingsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const [hoveredPoint, setHoveredPoint] = useState<SnapshotPoint | null>(null)

  const [historyData, setHistoryData] = useState<PortfolioValueHistoryDetailResponse | null>(null)
  const [historyWindow, setHistoryWindow] = useState<HistoryWindow>('month')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    listPortfolios()
      .then((res) => setPortfolios(res.data))
      .catch(() => toast.error('Impossibile caricare i portafogli'))
  }, [])

  const fetchHoldings = useCallback(async (pId?: number) => {
    setLoading(true)
    try {
      const res = await listHoldings(pId)
      setData(res.data)
    } catch {
      toast.error('Errore nel caricamento delle posizioni')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async (pId?: number, from?: string, to?: string) => {
    setHistoryLoading(true)
    try {
      const res = await getPortfolioValueHistory(pId, from, to)
      setHistoryData(res.data)
    } catch {
      toast.error('Errore nel caricamento dello storico portafoglio')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchHoldings()
    const { from, to } = getWindowDates('month')
    void fetchHistory(undefined, from, to)
  }, [fetchHoldings, fetchHistory])

  function handlePortfolioChange(val: string) {
    setPortfolioFilter(val)
    setHistoryWindow('month')
    const pId = val ? Number(val) : undefined
    void fetchHoldings(pId)
    const { from, to } = getWindowDates('month')
    void fetchHistory(pId, from, to)
  }

  function handleHistoryWindowChange(w: HistoryWindow) {
    setHistoryWindow(w)
    if (w === 'custom') return
    const { from, to } = getWindowDates(w)
    void fetchHistory(portfolioFilter ? Number(portfolioFilter) : undefined, from, to)
  }

  async function handleCustomHistorySearch() {
    if (!customFrom || !customTo) {
      toast.error('Inserisci entrambe le date')
      return
    }
    await fetchHistory(portfolioFilter ? Number(portfolioFilter) : undefined, customFrom, customTo)
  }

  const chartData: SnapshotPoint[] = historyData?.series ?? []

  const allHoldings: PortfolioHoldingResponse[] = data?.holdings ?? []
  const holdings = assetTypeFilter
    ? allHoldings.filter((h) => h.assetType === assetTypeFilter)
    : allHoldings
  const activeTypes = new Set(allHoldings.map((h) => h.assetType))
  const totalInvested = data?.totalInvested ?? 0
  const totalPnl = data?.totalUnrealizedPnl ?? 0
  const totalPnlPct = data?.totalUnrealizedPnlPct ?? 0

  const displayInvested = hoveredPoint?.totalInvested ?? totalInvested
  const displayPnl = hoveredPoint
    ? hoveredPoint.totalValue - hoveredPoint.totalInvested
    : totalPnl
  const displayPnlPct = hoveredPoint
    ? hoveredPoint.totalInvested > 0
      ? ((hoveredPoint.totalValue - hoveredPoint.totalInvested) / hoveredPoint.totalInvested) * 100
      : 0
    : totalPnlPct
  const pnlPositive = displayPnl >= 0
  const hoveredDate = hoveredPoint
    ? new Date(hoveredPoint.date).toLocaleDateString('it-IT')
    : undefined

  const portfolioOptions = [
    { value: '', label: 'Tutti i portafogli' },
    ...portfolios.map((p) => ({ value: String(p.id), label: p.name })),
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Posizioni aperte</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Capitale Investito"
          value={fmtCurrency(displayInvested)}
          sub={hoveredDate ? `Al ${hoveredDate}` : undefined}
          icon={Wallet}
        />
        <StatCard
          title="P&L Non Realizzato"
          value={`${pnlPositive ? '+' : ''}${fmtCurrency(displayPnl)}`}
          sub={hoveredDate ? `Al ${hoveredDate}` : undefined}
          positive={pnlPositive}
          icon={pnlPositive ? TrendingUp : TrendingDown}
        />
        <StatCard
          title="P&L Non Realizzato %"
          value={`${pnlPositive ? '+' : ''}${fmtNum(displayPnlPct)}%`}
          sub={hoveredDate ? `Al ${hoveredDate}` : 'Sul capitale investito totale'}
          positive={pnlPositive}
          icon={pnlPositive ? TrendingUp : TrendingDown}
        />
      </div>

      {/* Portfolio chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Andamento Portafoglio</CardTitle>
          <div className="flex gap-1 mt-2 flex-wrap">
            {(['week', 'month', 'year', 'ytd', 'alltime', 'custom'] as ChartWindow[]).map((w) => (
              <Button
                key={w}
                variant={historyWindow === w ? 'default' : 'outline'}
                size="xs"
                disabled={historyLoading}
                onClick={() => handleHistoryWindowChange(w)}
              >
                {WINDOW_LABELS[w]}
              </Button>
            ))}
          </div>
          {historyWindow === 'custom' && (
            <>
              <Separator className="mt-3" />
              <div className="flex items-end gap-3 mt-3 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Dal</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-8 w-36"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Al</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-8 w-36"
                  />
                </div>
                <Button size="sm" onClick={() => void handleCustomHistorySearch()} disabled={historyLoading}>
                  {historyLoading ? 'Caricamento…' : 'Cerca'}
                </Button>
              </div>
            </>
          )}
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              Caricamento…
            </div>
          ) : (
            <PortfolioChart
              data={chartData}
              currency={historyData?.currency ?? 'EUR'}
              onHover={setHoveredPoint}
              onHoverEnd={() => setHoveredPoint(null)}
            />
          )}
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 w-64">
          <Label>Portafoglio</Label>
          <Combobox
            value={portfolioFilter}
            onChange={handlePortfolioChange}
            options={portfolioOptions}
            placeholder="Tutti i portafogli"
          />
        </div>
        <div className="space-y-1.5 w-48">
          <Label>Tipo</Label>
          <Combobox
            value={assetTypeFilter}
            onChange={(val) => setAssetTypeFilter(val as AssetType | '')}
            options={[
              { value: '', label: 'Tutti i tipi' },
              ...ASSET_TYPES.filter((t) => activeTypes.has(t)).map((t) => ({
                value: t,
                label: ASSET_TYPE_LABELS[t],
              })),
            ]}
            placeholder="Tutti i tipi"
          />
        </div>
        {(portfolioFilter || assetTypeFilter) && (
          <Button
            variant="ghost"
            size="sm"
            className="self-end"
            onClick={() => {
              setPortfolioFilter('')
              setAssetTypeFilter('')
              void fetchHoldings()
            }}
          >
            Reimposta
          </Button>
        )}
      </div>

      {/* Holdings table */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : holdings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna posizione aperta.</p>
      ) : (
        <>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Portafoglio</TableHead>
                <TableHead className="text-right">Quantità</TableHead>
                <TableHead className="text-right">Costo Medio</TableHead>
                <TableHead className="text-right">Investito</TableHead>
                <TableHead className="text-right">Ultimo Prezzo</TableHead>
                <TableHead className="text-right">P&L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>
                    <div className="flex gap-2">
                      <p className="text-xs text-muted-foreground">{h.assetName}</p>
                      <Link
                          to={`/assets/${h.assetId}`}
                          className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ASSET_TYPE_VARIANT[h.assetType]} className="text-xs">
                      {ASSET_TYPE_LABELS[h.assetType] ?? h.assetType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{h.portfolioName}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {fmtNum(h.quantityHeld, 4)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {fmtNum(h.averageCost)} {h.currencyCode}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {fmtNum(h.totalInvested)} {h.currencyCode}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {h.lastPrice != null ? (
                      <>
                        {fmtNum(h.lastPrice)}
                        {h.lastPriceDate && (
                          <p className="text-xs text-muted-foreground">{h.lastPriceDate}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <PnlCell value={h.unrealizedPnlBase} pct={h.unrealizedPnlPct} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {assetTypeFilter
            ? `${holdings.length} di ${allHoldings.length} elementi`
            : `${holdings.length} elementi`}
        </p>
        </>
      )}
    </div>
  )
}
