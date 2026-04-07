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
import { getAssetDetail } from '@/api/assets'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type {
  AssetDetailResponse,
  AssetType,
  PricePoint,
  PriceType,
} from '@/types/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  STOCK: 'Azione',
  ETF: 'ETF',
  FUND: 'Fondo',
  BOND: 'Obbligazione',
  CRYPTO: 'Criptovaluta',
}

const ASSET_TYPE_VARIANT: Record<AssetType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  STOCK: 'default',
  ETF: 'secondary',
  FUND: 'secondary',
  BOND: 'outline',
  CRYPTO: 'destructive',
}

const REPLICATION_LABELS: Record<string, string> = {
  PHYSICAL_FULL: 'Fisica completa',
  PHYSICAL_SAMPLING: 'Fisica a campione',
  SYNTHETIC: 'Sintetica',
}

const DISTRIBUTION_LABELS: Record<string, string> = {
  ACCUMULATING: 'Accumulazione',
  DISTRIBUTING: 'Distribuzione',
}

const COUPON_FREQ_LABELS: Record<number, string> = {
  1: 'Annuale',
  2: 'Semestrale',
  4: 'Trimestrale',
  12: 'Mensile',
}

type PriceWindow = 'week' | 'month' | 'year' | 'ytd' | 'alltime' | 'custom'

const WINDOW_LABELS: Record<PriceWindow, string> = {
  week: 'Sett.',
  month: 'Mese',
  year: 'Anno',
  ytd: 'YTD',
  alltime: 'Tutto',
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

function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${(value * 100).toFixed(2)}%`
}

// ─── Price Chart ──────────────────────────────────────────────────────────────

function PriceLineChart({ data }: { data: PricePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Nessun dato disponibile per il periodo selezionato
      </div>
    )
  }

  const minPrice = Math.min(...data.map((d) => d.price))
  const maxPrice = Math.max(...data.map((d) => d.price))
  const padding = (maxPrice - minPrice) * 0.05 || 1

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => {
            const d = new Date(v)
            return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
          }}
          tick={{ fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[minPrice - padding, maxPrice + padding]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toFixed(2)}
          width={60}
        />
        <Tooltip
          formatter={(v: number) => [v.toFixed(4), 'Prezzo']}
          labelFormatter={(label: string) => new Date(label).toLocaleDateString('it-IT')}
        />
        <Line
          type="monotone"
          dataKey="price"
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

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const assetId = Number(id)

  const [asset, setAsset] = useState<AssetDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const [window, setWindow] = useState<PriceWindow>('month')
  const priceType: PriceType = 'ADJUSTED_CLOSE'
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [customLoading, setCustomLoading] = useState(false)

  async function fetchDetail(opts?: { from?: string; to?: string }) {
    try {
      const res = await getAssetDetail(assetId, priceType, opts?.from, opts?.to)
      setAsset(res.data)
    } catch {
      toast.error('Errore nel caricamento del dettaglio')
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchDetail().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId])

  async function handleWindowChange(w: PriceWindow) {
    setWindow(w)
    if (w === 'ytd') {
      const today = new Date()
      const jan1 = `${today.getFullYear()}-01-01`
      const todayStr = today.toISOString().slice(0, 10)
      setCustomLoading(true)
      try { await fetchDetail({ from: jan1, to: todayStr }) }
      finally { setCustomLoading(false) }
    } else if (w === 'alltime') {
      const todayStr = new Date().toISOString().slice(0, 10)
      setCustomLoading(true)
      try { await fetchDetail({ from: '1900-01-01', to: todayStr }) }
      finally { setCustomLoading(false) }
    }
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

  if (!asset) return null

  const chartData =
    window === 'week' || window === 'month' || window === 'year'
      ? asset.priceChart[window]
      : (asset.priceChart.custom ?? [])

  const issuer = asset.etfDetail?.issuer ?? asset.bondDetail?.issuer ?? null

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/assets" className="hover:text-foreground transition-colors">
          Strumenti Finanziari
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{asset.ticker}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">
              {issuer && <span className="text-muted-foreground font-normal">{issuer} </span>}
              {asset.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="font-mono font-semibold text-lg">{asset.ticker}</span>
            {asset.isin && (
              <span className="font-mono text-sm text-muted-foreground">{asset.isin}</span>
            )}
            <Badge variant={ASSET_TYPE_VARIANT[asset.assetType]}>
              {ASSET_TYPE_LABELS[asset.assetType]}
            </Badge>
            <Badge variant={asset.active ? 'default' : 'outline'}>
              {asset.active ? 'Attivo' : 'Inattivo'}
            </Badge>
          </div>
        </div>
        {(asset.assetType === 'ETF' || asset.assetType === 'FUND') && (
          <Link
            to={`/assets/${asset.id}/holdings`}
            className="text-sm text-primary hover:underline whitespace-nowrap"
          >
            Vedi Holdings →
          </Link>
        )}
      </div>

      {/* General Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informazioni generali</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <InfoRow label="Valuta" value={asset.currencyCode} />
            <InfoRow label="Borsa" value={asset.exchange ?? '—'} />
            <InfoRow label="Registrato il" value={formatDate(asset.createdAt)} />
          </div>
        </CardContent>
      </Card>

      {/* Type-specific details */}
      {asset.assetType === 'STOCK' && asset.stockDetail && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dettagli Azione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <InfoRow label="Paese" value={asset.stockDetail.countryName ?? asset.stockDetail.countryCode ?? '—'} />
              <InfoRow label="Settore" value={asset.stockDetail.sectorName ?? '—'} />
            </div>
          </CardContent>
        </Card>
      )}

      {(asset.assetType === 'ETF' || asset.assetType === 'FUND') && asset.etfDetail && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Dettagli {asset.assetType === 'ETF' ? 'ETF' : 'Fondo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <InfoRow label="Emittente" value={asset.etfDetail.issuer ?? '—'} />
              <InfoRow
                label="Metodo Replica"
                value={
                  asset.etfDetail.replicationMethod
                    ? REPLICATION_LABELS[asset.etfDetail.replicationMethod]
                    : '—'
                }
              />
              <InfoRow
                label="Distribuzione"
                value={
                  asset.etfDetail.distributionType
                    ? DISTRIBUTION_LABELS[asset.etfDetail.distributionType]
                    : '—'
                }
              />
              <InfoRow label="Benchmark" value={asset.etfDetail.benchmarkIndex ?? '—'} />
              <InfoRow
                label="TER"
                value={asset.etfDetail.ter != null ? formatPct(asset.etfDetail.ter) : '—'}
              />
              <InfoRow label="Data lancio" value={formatDate(asset.etfDetail.inceptionDate)} />
              <InfoRow label="Domicilio" value={asset.etfDetail.domicileCountryCode ?? '—'} />
            </div>
          </CardContent>
        </Card>
      )}

      {asset.assetType === 'BOND' && asset.bondDetail && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dettagli Obbligazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <InfoRow label="Emittente" value={asset.bondDetail.issuer ?? '—'} />
              <InfoRow
                label="Paese"
                value={asset.bondDetail.countryName ?? asset.bondDetail.countryCode ?? '—'}
              />
              <InfoRow label="Scadenza" value={formatDate(asset.bondDetail.maturityDate)} />
              <InfoRow
                label="Cedola"
                value={asset.bondDetail.couponRate != null ? formatPct(asset.bondDetail.couponRate) : '—'}
              />
              <InfoRow
                label="Frequenza Cedola"
                value={
                  asset.bondDetail.couponFrequency != null
                    ? COUPON_FREQ_LABELS[asset.bondDetail.couponFrequency]
                    : '—'
                }
              />
              <InfoRow
                label="Valore Nominale"
                value={asset.bondDetail.faceValue != null ? asset.bondDetail.faceValue.toLocaleString('it-IT') : '—'}
              />
              <InfoRow
                label="Indicizzato inflazione"
                value={asset.bondDetail.inflationLinked ? 'Sì' : 'No'}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {asset.assetType === 'CRYPTO' && asset.cryptoDetail && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dettagli Criptovaluta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <InfoRow label="Coingecko ID" value={asset.cryptoDetail.coingeckoId ?? '—'} />
              <InfoRow label="Network" value={asset.cryptoDetail.network ?? '—'} />
              <InfoRow label="Standard Token" value={asset.cryptoDetail.tokenStandard ?? '—'} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Storico Prezzi (Chiusura Adj.)</CardTitle>

          {/* Window tabs */}
          <div className="flex gap-1 mt-2 flex-wrap">
            {(['week', 'month', 'year', 'ytd', 'alltime', 'custom'] as PriceWindow[]).map((w) => (
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

          {/* Custom date range */}
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
          <PriceLineChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  )
}
