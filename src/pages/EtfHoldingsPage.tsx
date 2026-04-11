import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { genericParser, iSharesParser, franklinTempletonParser, xtrackersParser, amundiParser, spdrParser, type IssuerParser } from '@/lib/parsers'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { getHoldings, listAssets, saveHoldings } from '@/api/assets'
import { Button, buttonVariants } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AssetResponse, EtfHoldingResponse, HoldingItem } from '@/types/api'

// ─── Chart helpers ────────────────────────────────────────────────────────────

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9',
  '#3b82f6', '#64748b',
]

interface ChartSlice { name: string; value: number }

function buildChartData(
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

function HoldingsPieChart({ data, title }: { data: ChartSlice[]; title: string }) {
  if (data.length === 0) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ value }: { value?: number }) => value != null ? `${value.toFixed(2)}%` : ''}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => typeof v === 'number' ? `${v.toFixed(2)}%` : v} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value: string) => (
                <span className="text-xs">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ─── Issuer registry ─────────────────────────────────────────────────────────

const SAMPLE_CSV =
  'weightPct,heldAssetName,heldAssetIsin,heldAssetTicker,heldAssetId,countryName,sectorName\n' +
  '5.23,Apple Inc,US0378331005,AAPL,,United States,Technology\n'

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'holdings_esempio.csv'
  a.click()
  URL.revokeObjectURL(url)
}

const PARSERS: Record<string, IssuerParser> = {
  generic: genericParser,
  ishares: iSharesParser,
  franklin: franklinTempletonParser,
  xtrackers: xtrackersParser,
  amundi: amundiParser,
  spdr: spdrParser,
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EtfHoldingsPage() {
  const { id } = useParams<{ id: string }>()
  const assetId = Number(id)

  const [asset, setAsset] = useState<AssetResponse | null>(null)
  const [holdings, setHoldings] = useState<EtfHoldingResponse[]>([])
  const [loadingHoldings, setLoadingHoldings] = useState(false)

  const [issuerId, setIssuerId] = useState<string>('generic')
  const [validFrom, setValidFrom] = useState('')
  const [parsedRows, setParsedRows] = useState<HoldingItem[]>([])
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const activeParser = PARSERS[issuerId] ?? genericParser
  const dateAutoExtracted = issuerId !== 'generic'

  // ─── Load asset info ────────────────────────────────────────────────────

  useEffect(() => {
    listAssets(0, 1000).then((res) => {
      const found = res.data.content.find((a) => a.id === assetId)
      setAsset(found ?? null)
    }).catch(() => {
      toast.error('Impossibile caricare le informazioni dell\'asset')
    })
  }, [assetId])

  // ─── Load holdings ───────────────────────────────────────────────────────

  const fetchHoldings = useCallback(async () => {
    setLoadingHoldings(true)
    try {
      const res = await getHoldings(assetId)
      setHoldings(res.data)
    } catch {
      toast.error('Errore nel caricamento delle partecipazioni')
    } finally {
      setLoadingHoldings(false)
    }
  }, [assetId])

  useEffect(() => {
    void fetchHoldings()
  }, [fetchHoldings])

  // ─── CSV parse ───────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParseError('')
    setParsedRows([])

    try {
      const result = await activeParser.parse(file)
      setParsedRows(result.holdings)
      if (result.validFrom) setValidFrom(result.validFrom)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Errore nel parsing del file')
    }
  }

  function handleIssuerChange(newIssuerId: string) {
    setIssuerId(newIssuerId)
    setParsedRows([])
    setParseError('')
    setFileName('')
    setValidFrom('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validFrom) {
      toast.error('Seleziona la data di riferimento')
      return
    }
    if (parsedRows.length === 0) {
      toast.error('Carica un CSV valido prima di procedere')
      return
    }

    setSubmitting(true)
    try {
      await saveHoldings(assetId, { validFrom, holdings: parsedRows })
      toast.success(`${parsedRows.length} partecipazioni salvate con successo`)
      setParsedRows([])
      setFileName('')
      if (!dateAutoExtracted) setValidFrom('')
      if (fileRef.current) fileRef.current.value = ''
      void fetchHoldings()
    } catch {
      toast.error('Errore nel salvataggio delle partecipazioni')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-4">
        <Link to="/assets" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          ← Asset
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {asset ? `${asset.name} — Holdings` : 'Holdings ETF/Fondo'}
          </h1>
          {asset && (
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{asset.ticker}</span>
              {asset.isin && <> · <span className="font-mono">{asset.isin}</span></>}
              {' · '}
              <Badge variant="secondary" className="text-xs">
                {asset.assetType}
              </Badge>
            </p>
          )}
        </div>
      </div>

      {/* CSV Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Carica Partecipazioni (CSV)</CardTitle>
          <CardDescription>
            {activeParser.hint}
            {issuerId === 'generic' && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  Scarica file di esempio
                </button>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Issuer selector */}
              <div className="space-y-1.5">
                <Label htmlFor="issuer">Emittente</Label>
                <Combobox
                  value={issuerId}
                  onChange={handleIssuerChange}
                  options={Object.entries(PARSERS).map(([key, p]) => ({ value: key, label: p.label }))}
                />
              </div>

              {/* Date — read-only when auto-extracted */}
              <div className="space-y-1.5">
                <Label htmlFor="validFrom">
                  Data di riferimento{dateAutoExtracted ? ' (dal file)' : ' *'}
                </Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  readOnly={dateAutoExtracted}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="csvFile">File CSV *</Label>
                <Input
                  id="csvFile"
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {parseError && (
              <p className="text-sm text-destructive">{parseError}</p>
            )}

            {/* Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Anteprima: {parsedRows.length} righe parsed — file:{' '}
                  <span className="text-muted-foreground">{fileName}</span>
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Peso (%)</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>ISIN</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead>Paese</TableHead>
                        <TableHead>Settore</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">
                            {row.weightPct.toFixed(2)}
                          </TableCell>
                          <TableCell>{row.heldAssetName}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.heldAssetIsin ?? '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.heldAssetTicker ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.heldAssetId ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.countryName ?? '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {row.sectorName ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <Button type="submit" disabled={submitting || parsedRows.length === 0 || !validFrom}>
              {submitting ? 'Salvataggio…' : `Salva ${parsedRows.length > 0 ? parsedRows.length + ' ' : ''}Partecipazioni`}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Charts */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <HoldingsPieChart
            title="Allocazione per Settore"
            data={buildChartData(holdings, 'sectorName')}
          />
          <HoldingsPieChart
            title="Allocazione per Paese"
            data={buildChartData(holdings, 'countryName')}
          />
        </div>
      )}

      {/* Holdings List */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Snapshot più recente</h2>

        {loadingHoldings ? (
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        ) : holdings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna partecipazione registrata per questo asset.
          </p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Peso (%)</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>ISIN</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Paese</TableHead>
                  <TableHead>Settore</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono font-medium">
                      {Number(h.weightPct).toFixed(2)}%
                    </TableCell>
                    <TableCell>{h.heldAssetName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {h.heldAssetIsin ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {h.heldAssetTicker ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {h.heldAssetRegistryName ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {h.countryName ?? h.countryCode ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {h.sectorName ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {h.validFrom}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
