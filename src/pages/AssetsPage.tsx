import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { createAsset, listAssets, listSectors, syncPrices } from '@/api/assets'
import { ASSET_TYPE_LABELS, ASSET_TYPE_VARIANT, ASSET_TYPES } from '@/lib/assetTypes'
import { isDateRecent, TODAY } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buttonVariants } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import type { AssetCreateRequest, AssetResponse, AssetType, CouponFrequency, SectorResponse } from '@/types/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIssuer(asset: AssetResponse): string | null {
  return asset.etfDetail?.issuer ?? asset.bondDetail?.issuer ?? null
}

// ─── Form types ───────────────────────────────────────────────────────────────

type FormValues = Omit<AssetCreateRequest, 'sectorId' | 'heldAssetId'> & {
  sectorId?: string
  ter?: string
  couponRate?: string
  faceValue?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function AssetsPage() {
  const [allAssets, setAllAssets] = useState<AssetResponse[]>([])
  const [sectors, setSectors] = useState<SectorResponse[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType | 'ALL'>('ALL')

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { assetType: 'STOCK' } })

  const assetType = watch('assetType') as AssetType

  // ─── Fetch (all, once) ───────────────────────────────────────────────────

  async function fetchAssets() {
    setLoading(true)
    try {
      const res = await listAssets(0, 1000)
      setAllAssets(res.data.content)
    } catch {
      toast.error('Errore nel caricamento degli asset')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAssets()
    listSectors().then((res) => setSectors(res.data)).catch(() => {})
  }, [])

  // ─── Filter + paginate client-side ───────────────────────────────────────

  const filteredAssets = allAssets.filter((a) => {
    if (typeFilter !== 'ALL' && a.assetType !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const issuer = getIssuer(a)?.toLowerCase() ?? ''
      return (
        (a.ticker ?? '').toLowerCase().includes(q) ||
        (a.isin ?? '').toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        issuer.includes(q)
      )
    }
    return true
  })

  const totalPages = Math.ceil(filteredAssets.length / PAGE_SIZE)
  const pagedAssets = filteredAssets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(0)
  }

  function handleTypeChange(value: string) {
    setTypeFilter(value as AssetType | 'ALL')
    setPage(0)
  }

  // ─── Sync ────────────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await syncPrices()
      toast.success(`Sync completato: ${res.data} prezzi aggiornati`)
      void fetchAssets()
    } catch {
      toast.error('Errore durante il sync dei prezzi')
    } finally {
      setSyncing(false)
    }
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload: AssetCreateRequest = {
        ...values,
        sectorId: values.sectorId ? Number(values.sectorId) : undefined,
        ter: values.ter ? Number(values.ter) : undefined,
        couponRate: values.couponRate ? Number(values.couponRate) : undefined,
        faceValue: values.faceValue ? Number(values.faceValue) : undefined,
      }
      await createAsset(payload)
      toast.success('Asset creato con successo')
      setSheetOpen(false)
      reset()
      void fetchAssets()
      setPage(0)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Errore nella creazione dell\'asset'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Strumenti Finanziari</h1>
          <p className="text-sm text-muted-foreground">
            {filteredAssets.length !== allAssets.length
              ? `${filteredAssets.length} di ${allAssets.length} asset`
              : `${allAssets.length} asset nel registro`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Sincronizzazione…' : 'Sincronizza Prezzi'}
          </Button>
          <Button onClick={() => setSheetOpen(true)}>Nuovo Asset</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Cerca per ticker, ISIN, nome, emittente…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />
        <Combobox
          value={typeFilter}
          onChange={(val) => handleTypeChange(val || 'ALL')}
          options={[
            { value: 'ALL', label: 'Tutti i tipi' },
            ...ASSET_TYPES.map((t) => ({ value: t, label: ASSET_TYPE_LABELS[t] })),
          ]}
          placeholder="Tutti i tipi"
          className="w-44"
        />
        {(search || typeFilter !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setTypeFilter('ALL'); setPage(0) }}
          >
            Reimposta
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead>ISIN</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valuta</TableHead>
              <TableHead>Borsa</TableHead>
              <TableHead>Ultimo Prezzo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Caricamento…
                </TableCell>
              </TableRow>
            ) : pagedAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  Nessun asset trovato
                </TableCell>
              </TableRow>
            ) : (
              pagedAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono font-medium">{asset.ticker ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {asset.isin ?? '—'}
                  </TableCell>
                  <TableCell>
                    {getIssuer(asset) && (
                      <span className="font-bold">{getIssuer(asset)} </span>
                    )}
                    {asset.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ASSET_TYPE_VARIANT[asset.assetType]}>
                      {ASSET_TYPE_LABELS[asset.assetType]}
                    </Badge>
                  </TableCell>
                  <TableCell>{asset.currencyCode}</TableCell>
                  <TableCell>{asset.exchange ?? '—'}</TableCell>
                  <TableCell>
                    {(asset.assetType === 'ETF' || asset.assetType === 'FUND' || asset.assetType === 'BOND' || asset.assetType === 'CRYPTO' || asset.assetType === 'STOCK') &&
                    asset.lastPrice != null &&
                    isDateRecent(asset.lastPriceDate) ? (
                      <span className="flex items-center gap-1.5">
                        {asset.lastPriceDate === TODAY
                          ? <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" />
                          : <span className="text-xs text-muted-foreground">{new Date(asset.lastPriceDate!).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                        }
                        <span className="font-mono text-sm">
                          {asset.lastPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={asset.active ? 'default' : 'outline'}>
                      {asset.active ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/assets/${asset.id}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Dettaglio
                      </Link>
                      {(asset.assetType === 'ETF' || asset.assetType === 'FUND') && (
                        <Link
                          to={`/assets/${asset.id}/holdings`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          Holdings
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination + count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredAssets.length !== allAssets.length
            ? `${filteredAssets.length} di ${allAssets.length} elementi`
            : `${allAssets.length} elementi`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <span>Pagina {page + 1} di {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Precedente
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                Successiva
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Nuovo Asset</SheetTitle>
          </SheetHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4 py-2"
          >
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Controller
                name="assetType"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Combobox
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={ASSET_TYPES.map((t) => ({ value: t, label: ASSET_TYPE_LABELS[t] }))}
                    hasError={!!errors.assetType}
                  />
                )}
              />
            </div>

            {/* Campi comuni */}
            <Separator />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Dati generali
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="iShares Core MSCI World"
                  {...register('name', { required: 'Il nome è obbligatorio' })}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ticker">Ticker *</Label>
                <Input
                  id="ticker"
                  placeholder="SWDA"
                  {...register('ticker', { required: 'Il ticker è obbligatorio' })}
                />
                {errors.ticker && (
                  <p className="text-xs text-destructive">{errors.ticker.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="isin">ISIN</Label>
                <Input id="isin" placeholder="IE00B4L5Y983" {...register('isin')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currencyCode">Valuta *</Label>
                <Input
                  id="currencyCode"
                  placeholder="USD"
                  maxLength={3}
                  {...register('currencyCode', { required: 'La valuta è obbligatoria' })}
                />
                {errors.currencyCode && (
                  <p className="text-xs text-destructive">{errors.currencyCode.message}</p>
                )}
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="exchange">Borsa</Label>
                <Input id="exchange" placeholder="LSE" {...register('exchange')} />
              </div>
            </div>

            {/* STOCK */}
            {assetType === 'STOCK' && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Dettagli Azione
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="countryCode">Codice Paese</Label>
                    <Input id="countryCode" placeholder="US" maxLength={2} {...register('countryCode')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Settore</Label>
                    <Controller
                      name="sectorId"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          options={[
                            { value: '', label: '— Nessuno —' },
                            ...sectors.map((s) => ({ value: String(s.id), label: s.name })),
                          ]}
                          placeholder="— Nessuno —"
                        />
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ETF / FUND */}
            {(assetType === 'ETF' || assetType === 'FUND') && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Dettagli {assetType === 'ETF' ? 'ETF' : 'Fondo'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="issuer">Emittente</Label>
                    <Input id="issuer" placeholder="iShares" {...register('issuer')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Metodo Replica *</Label>
                    <Controller
                      name="replicationMethod"
                      control={control}
                      rules={{ required: 'Obbligatorio' }}
                      render={({ field }) => (
                        <Combobox
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          options={[
                            { value: 'PHYSICAL_FULL', label: 'Fisica completa' },
                            { value: 'PHYSICAL_SAMPLING', label: 'Fisica a campione' },
                            { value: 'SYNTHETIC', label: 'Sintetica' },
                          ]}
                          hasError={!!errors.replicationMethod}
                        />
                      )}
                    />
                    {errors.replicationMethod && (
                      <p className="text-xs text-destructive">{errors.replicationMethod.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Distribuzione *</Label>
                    <Controller
                      name="distributionType"
                      control={control}
                      rules={{ required: 'Obbligatorio' }}
                      render={({ field }) => (
                        <Combobox
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          options={[
                            { value: 'ACCUMULATING', label: 'Accumulazione' },
                            { value: 'DISTRIBUTING', label: 'Distribuzione' },
                          ]}
                          hasError={!!errors.distributionType}
                        />
                      )}
                    />
                    {errors.distributionType && (
                      <p className="text-xs text-destructive">{errors.distributionType.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="benchmarkIndex">Indice Benchmark</Label>
                    <Input id="benchmarkIndex" placeholder="MSCI World" {...register('benchmarkIndex')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ter">TER (%)</Label>
                    <Input id="ter" type="number" step="0.01" placeholder="0.20" {...register('ter')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="domicileCountryCode">Domicilio</Label>
                    <Input id="domicileCountryCode" placeholder="IE" maxLength={2} {...register('domicileCountryCode')} />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="inceptionDate">Data lancio</Label>
                    <Input id="inceptionDate" type="date" {...register('inceptionDate')} />
                  </div>
                </div>
              </>
            )}

            {/* BOND */}
            {assetType === 'BOND' && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Dettagli Obbligazione
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="bondIssuer">Emittente</Label>
                    <Input id="bondIssuer" placeholder="Ministero Economia" {...register('bondIssuer')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bondCountryCode">Paese</Label>
                    <Input id="bondCountryCode" placeholder="IT" maxLength={2} {...register('bondCountryCode')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="maturityDate">Scadenza *</Label>
                    <Input
                      id="maturityDate"
                      type="date"
                      {...register('maturityDate', { required: 'La scadenza è obbligatoria' })}
                    />
                    {errors.maturityDate && (
                      <p className="text-xs text-destructive">{errors.maturityDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="couponRate">Cedola (%)</Label>
                    <Input id="couponRate" type="number" step="0.01" placeholder="3.50" {...register('couponRate')} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="faceValue">Valore Nominale</Label>
                    <Input id="faceValue" type="number" step="0.01" placeholder="1000" {...register('faceValue')} />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label>Frequenza Cedola</Label>
                    <Controller
                      name="couponFrequency"
                      control={control}
                      render={({ field }) => (
                        <Combobox
                          value={field.value != null ? String(field.value) : ''}
                          onChange={(val) => field.onChange(val ? (Number(val) as CouponFrequency) : undefined)}
                          options={[
                            { value: '', label: '— Seleziona —' },
                            { value: '1', label: 'Annuale (1/anno)' },
                            { value: '2', label: 'Semestrale (2/anno)' },
                            { value: '4', label: 'Trimestrale (4/anno)' },
                            { value: '12', label: 'Mensile (12/anno)' },
                          ]}
                          placeholder="— Seleziona —"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2 flex items-center gap-2">
                    <input
                      id="inflationLinked"
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      {...register('inflationLinked')}
                    />
                    <Label htmlFor="inflationLinked">Indicizzato all'inflazione</Label>
                  </div>
                </div>
              </>
            )}

            {/* CRYPTO */}
            {assetType === 'CRYPTO' && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Dettagli Criptovaluta
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="coingeckoId">Coingecko ID</Label>
                    <Input id="coingeckoId" placeholder="bitcoin" {...register('coingeckoId')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="network">Network</Label>
                    <Input id="network" placeholder="Ethereum" {...register('network')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tokenStandard">Standard Token</Label>
                    <Input id="tokenStandard" placeholder="ERC-20" {...register('tokenStandard')} />
                  </div>
                </div>
              </>
            )}

            <SheetFooter className="px-0 pt-2">
              <SheetClose
                render={
                  <Button variant="outline" type="button" />
                }
                onClick={() => reset()}
              >
                Annulla
              </SheetClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvataggio…' : 'Crea Asset'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
