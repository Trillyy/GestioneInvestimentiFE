import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { CustomLineChart } from '@/components/custom-line-chart'
import { getAssetDetail } from '@/api/assets'
import { getHoldingsByAsset } from '@/api/holdings'
import { ASSET_TYPE_LABELS, ASSET_TYPE_VARIANT, COUPON_FREQ_LABELS, DISTRIBUTION_LABELS, getIssuer, REPLICATION_LABELS } from '@/helpers/assetTypes.ts'
import { fmtDate, formatPct, formatSignedAmount, formatSignedPct, pnlColorClass, TODAY } from '@/helpers/formatters.ts'
import { useChartWindow } from '@/hooks/useChartWindow'
import { ChartWindowPicker } from '@/components/chart-window-picker'
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_VARIANT } from '@/helpers/transactionTypes.ts'
import { InfoRow } from '@/components/ui/info-row'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type {
  AssetDetailResponse,
  AssetHoldingDetail,
  PricePoint,
  PriceType,
} from '@/types/api'

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const assetId = Number(id)

  const [asset, setAsset] = useState<AssetDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [assetHoldings, setAssetHoldings] = useState<AssetHoldingDetail[]>([])
  const [expandedHoldings, setExpandedHoldings] = useState<Set<number>>(new Set())

  function toggleTransactions(holdingId: number) {
    setExpandedHoldings((prev) => {
      const next = new Set(prev)
      if (next.has(holdingId)) { next.delete(holdingId) } else { next.add(holdingId) }
      return next
    })
  }

  const priceType: PriceType = 'ADJUSTED_CLOSE'
  const [displayCurrency, setDisplayCurrency] = useState('EUR')
  const [currencyInput, setCurrencyInput] = useState('EUR')
  const [currencyLoading, setCurrencyLoading] = useState(false)

  async function fetchDetail(opts?: { from?: string; to?: string; currency?: string }) {
    const currency = opts?.currency !== undefined ? opts.currency : displayCurrency
    try {
      const res = await getAssetDetail(assetId, priceType, opts?.from, opts?.to, currency || undefined)
      setAsset(res.data)
    } catch {
      toast.error('Errore nel caricamento del dettaglio')
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchDetail(),
      getHoldingsByAsset(assetId)
        .then((res) => setAssetHoldings(res.data))
        .catch(() => {}),
    ]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId])

  const {
    window,
    from, setFrom,
    to, setTo,
    customLoading,
    handleWindowChange,
    handleCustomSearch,
  } = useChartWindow((from, to) => fetchDetail({ from, to }))

  async function handleCurrencyApply() {
    const newCurrency = currencyInput.trim().toUpperCase()
    setDisplayCurrency(newCurrency)
    setCurrencyLoading(true)
    try {
      await fetchDetail({ currency: newCurrency })
    } finally {
      setCurrencyLoading(false)
    }
  }

  async function handleCurrencyReset() {
    setCurrencyInput('')
    setDisplayCurrency('')
    setCurrencyLoading(true)
    try {
      await fetchDetail({ currency: '' })
    } finally {
      setCurrencyLoading(false)
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

  const issuer = getIssuer(asset)

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
        <div className="flex flex-col items-end gap-2">
          {asset.lastPrice != null && (
            <div className="text-right">
              <div className="text-2xl font-mono font-semibold">
                {asset.lastPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                <span className="text-sm font-normal text-muted-foreground ml-1.5">{asset.displayCurrencyCode}</span>
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-end gap-1.5 mt-0.5">
                {asset.lastPriceDate === TODAY && (
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                )}
                Aggiornato {fmtDate(asset.lastPriceDate)}
              </div>
            </div>
          )}
          {(asset.assetType === 'ETF' || asset.assetType === 'FUND') && (
            <Link
              to={`/assets/${asset.id}/holdings`}
              className="text-sm text-primary hover:underline whitespace-nowrap"
            >
              Vedi Holdings →
            </Link>
          )}
        </div>
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
            <InfoRow label="Registrato il" value={fmtDate(asset.createdAt)} />
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
              <InfoRow label="Data lancio" value={fmtDate(asset.etfDetail.inceptionDate)} />
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
              <InfoRow label="Scadenza" value={fmtDate(asset.bondDetail.maturityDate)} />
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

      {/* Portfolio Holdings */}
      {assetHoldings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Posizione in Portafoglio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <>{assetHoldings.map((item, i) => {
              const h = item.holding
              const marketValue = h.lastPrice != null ? h.lastPrice * h.quantityHeld : null
              const hasPnl = item.transactions.some((t) => t.realizedPnl != null)
              return (
                <div key={h.id}>
                  {assetHoldings.length > 1 && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {h.portfolioName}
                    </p>
                  )}

                  {/* Position metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {assetHoldings.length === 1 && (
                      <InfoRow label="Portafoglio" value={h.portfolioName} />
                    )}
                    <InfoRow
                      label="Quantità"
                      value={h.quantityHeld.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 6 })}
                    />
                    <InfoRow
                      label="PMC"
                      value={h.quantityHeld > 0 ? `${h.averageCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${h.currencyCode}` : '—'}
                    />
                    <InfoRow
                      label="Totale Investito"
                      value={`${h.totalInvested.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${h.currencyCode}`}
                    />
                    {marketValue != null && (
                      <InfoRow
                        label="Valore di Mercato"
                        value={`${marketValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${h.currencyCode}`}
                      />
                    )}
                    <InfoRow
                      label="P&L Non Realizzato"
                      value={
                        <span className={pnlColorClass(h.unrealizedPnl)}>
                          {formatSignedAmount(h.unrealizedPnl, h.currencyCode)}
                        </span>
                      }
                    />
                    <InfoRow
                      label="Rendimento"
                      value={
                        <span className={pnlColorClass(h.unrealizedPnlPct)}>
                          {formatSignedPct(h.unrealizedPnlPct)}
                        </span>
                      }
                    />
                    <InfoRow label="Primo Acquisto" value={fmtDate(h.firstBuyDate)} />
                    <InfoRow label="Ultima Operazione" value={fmtDate(h.lastTransactionDate)} />
                  </div>

                  {/* Transactions */}
                  {item.transactions.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground -ml-2"
                        onClick={() => toggleTransactions(h.id)}
                      >
                        {expandedHoldings.has(h.id) ? (
                          <ChevronUp className="mr-1 h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="mr-1 h-3.5 w-3.5" />
                        )}
                        Transazioni ({item.transactions.length})
                      </Button>
                      {expandedHoldings.has(h.id) && (
                        <div className="overflow-x-auto mt-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Data</TableHead>
                                <TableHead className="text-xs">Tipo</TableHead>
                                <TableHead className="text-xs text-right">Quantità</TableHead>
                                <TableHead className="text-xs text-right">Prezzo Unit.</TableHead>
                                <TableHead className="text-xs text-right">Totale</TableHead>
                                <TableHead className="text-xs text-right">Comm.</TableHead>
                                {hasPnl && <TableHead className="text-xs text-right">P&L Realizz.</TableHead>}
                                <TableHead className="text-xs">Note</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {item.transactions.map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell className="text-xs font-mono whitespace-nowrap">
                                    {fmtDate(t.transactionDate)}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    <Badge variant={TRANSACTION_TYPE_VARIANT[t.transactionType]} className="text-xs">
                                      {TRANSACTION_TYPE_LABELS[t.transactionType]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono">
                                    {t.quantity.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 6 })}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono">
                                    {t.unitPrice != null
                                      ? `${t.unitPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${t.currencyCode}`
                                      : '—'}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono whitespace-nowrap">
                                    {t.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.currencyCode}
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-mono">
                                    {t.fees > 0
                                      ? `${t.fees.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t.currencyCode}`
                                      : '—'}
                                  </TableCell>
                                  {hasPnl && (
                                    <TableCell className="text-xs text-right font-mono whitespace-nowrap">
                                      {t.realizedPnl != null ? (
                                        <span className={pnlColorClass(t.realizedPnl)}>
                                          {formatSignedAmount(t.realizedPnl, t.currencyCode)}
                                        </span>
                                      ) : '—'}
                                    </TableCell>
                                  )}
                                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                                    {t.notes ?? '—'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}

                  {i < assetHoldings.length - 1 && <Separator className="mt-5" />}
                </div>
              )
            })}</>
          </CardContent>
        </Card>
      )}

      {/* Price Chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Storico Prezzi (Chiusura Adj.)</CardTitle>
            {/* Currency converter */}
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Valuta:</Label>
              <Input
                value={currencyInput}
                onChange={(e) => setCurrencyInput(e.target.value.toUpperCase())}
                placeholder={asset.currencyCode}
                maxLength={3}
                className="h-7 w-16 text-xs font-mono uppercase px-2"
                onKeyDown={(e) => { if (e.key === 'Enter') void handleCurrencyApply() }}
              />
              <Button size="xs" variant="outline" onClick={() => void handleCurrencyApply()} disabled={currencyLoading}>
                Applica
              </Button>
              {displayCurrency && displayCurrency !== asset.currencyCode && (
                <Button size="xs" variant="ghost" onClick={() => void handleCurrencyReset()} disabled={currencyLoading}>
                  ×
                </Button>
              )}
            </div>
          </div>

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
            lines={[{ dataKey: 'price', name: 'Prezzo', color: '#6366f1' }]}
            yAxisTickFormatter={(v) => v.toFixed(2)}
            tooltipValueFormatter={(v) => v.toFixed(4)}
            computeDomain
          />
        </CardContent>
      </Card>
    </div>
  )
}
