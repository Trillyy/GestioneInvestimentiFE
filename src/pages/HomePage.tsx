import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { TrendingUp, TrendingDown, Wallet, ExternalLink } from 'lucide-react'
import { listHoldings } from '@/api/holdings'
import { listPortfolios } from '@/api/portfolios'
import { fmtCurrency, fmtNum, pnlColorClass } from '@/lib/formatters'
import { ASSET_TYPE_LABELS, ASSET_TYPE_VARIANT, ASSET_TYPES } from '@/lib/assetTypes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AssetType, PortfolioHoldingResponse, PortfolioHoldingsResponse, PortfolioResponse } from '@/types/api'
import { cn } from '@/lib/utils'

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

  useEffect(() => {
    void fetchHoldings()
  }, [fetchHoldings])

  function handlePortfolioChange(val: string) {
    setPortfolioFilter(val)
    void fetchHoldings(val ? Number(val) : undefined)
  }

  const allHoldings: PortfolioHoldingResponse[] = data?.holdings ?? []
  const holdings = assetTypeFilter
    ? allHoldings.filter((h) => h.assetType === assetTypeFilter)
    : allHoldings
  const activeTypes = new Set(allHoldings.map((h) => h.assetType))
  const totalInvested = data?.totalInvested ?? 0
  const totalPnl = data?.totalUnrealizedPnl ?? 0
  const totalPnlPct = data?.totalUnrealizedPnlPct ?? 0
  const pnlPositive = totalPnl >= 0

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
          value={fmtCurrency(totalInvested)}
          icon={Wallet}
        />
        <StatCard
          title="P&L Non Realizzato"
          value={`${pnlPositive ? '+' : ''}${fmtCurrency(totalPnl)}`}
          positive={pnlPositive}
          icon={pnlPositive ? TrendingUp : TrendingDown}
        />
        <StatCard
          title="P&L Non Realizzato %"
          value={`${pnlPositive ? '+' : ''}${fmtNum(totalPnlPct)}%`}
          sub="Sul capitale investito totale"
          positive={pnlPositive}
          icon={pnlPositive ? TrendingUp : TrendingDown}
        />
      </div>

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
