import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { listAllAssets } from '@/api/assets'
import { listPortfolios } from '@/api/portfolios'
import { createTransaction, listTransactions } from '@/api/transactions'
import { fmtDate, fmtNum } from '@/lib/formatters'
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_VARIANT, TRANSACTION_TYPES } from '@/lib/transactionTypes'
import { Combobox } from '@/components/ui/combobox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { TableLoadingRows } from '@/components/ui/table-loading-rows'
import { PaginationControls } from '@/components/ui/pagination-controls'
import type { AssetResponse, PortfolioResponse, TransactionCreateRequest, TransactionResponse, TransactionType } from '@/types/api'

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Types requiring asset selection
const NEEDS_ASSET: TransactionType[] = ['BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT']
// Types with quantity + unit price
const HAS_QTY_PRICE: TransactionType[] = ['BUY', 'SELL', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT']

// ─── Form types ───────────────────────────────────────────────────────────────

type FormValues = {
  portfolioId: string
  assetId: string
  transactionType: TransactionType
  transactionDate: string
  quantity: string
  unitPrice: string
  totalAmount: string
  fees: string
  currencyCode: string
  exchangeRateToBase: string
  notes: string
}

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionResponse[]>([])
  const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([])
  const [assets, setAssets] = useState<AssetResponse[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [portfolioFilter, setPortfolioFilter] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      transactionType: 'BUY',
      transactionDate: new Date().toISOString().slice(0, 10),
      currencyCode: 'EUR',
      fees: '0',
      exchangeRateToBase: '1',
    },
  })

  const txType = watch('transactionType')
  const needsAsset = NEEDS_ASSET.includes(txType)
  const hasQtyPrice = HAS_QTY_PRICE.includes(txType)

  // ─── Fetch ───────────────────────────────────────────────────────────────

  async function fetchTransactions(p = page, filter = portfolioFilter) {
    setLoading(true)
    try {
      const portfolioId = filter ? Number(filter) : undefined
      const res = await listTransactions(p, PAGE_SIZE, portfolioId)
      setTransactions(res.data.content)
      setTotalPages(res.data.totalPages)
      setTotalElements(res.data.totalElements)
    } catch {
      toast.error('Errore nel caricamento delle transazioni')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchTransactions(page)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listPortfolios()
      .then((res) => setPortfolios(res.data))
      .catch(() => toast.error('Errore nel caricamento dei portfolio'))
    listAllAssets()
      .then((res) => setAssets(res.data))
      .catch(() => toast.error('Errore nel caricamento degli asset'))
  }, [])

  function handlePortfolioFilterChange(value: string) {
    setPortfolioFilter(value)
    setPage(0)
    setLoading(true)
    const portfolioId = value ? Number(value) : undefined
    listTransactions(0, PAGE_SIZE, portfolioId)
      .then((res) => {
        setTransactions(res.data.content)
        setTotalPages(res.data.totalPages)
        setTotalElements(res.data.totalElements)
      })
      .catch(() => toast.error('Errore nel caricamento delle transazioni'))
      .finally(() => setLoading(false))
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload: TransactionCreateRequest = {
        portfolioId: Number(values.portfolioId),
        transactionType: values.transactionType,
        transactionDate: values.transactionDate,
        totalAmount: Number(values.totalAmount),
        currencyCode: values.currencyCode.toUpperCase(),
        ...(needsAsset && values.assetId && { assetId: Number(values.assetId) }),
        ...(hasQtyPrice && values.quantity && { quantity: Number(values.quantity) }),
        ...(hasQtyPrice && values.unitPrice && { unitPrice: Number(values.unitPrice) }),
        ...(values.fees && { fees: Number(values.fees) }),
        ...(values.exchangeRateToBase && { exchangeRateToBase: Number(values.exchangeRateToBase) }),
        ...(values.notes && { notes: values.notes }),
      }
      await createTransaction(payload)
      toast.success('Transazione creata con successo')
      setSheetOpen(false)
      reset({
        transactionType: 'BUY',
        transactionDate: new Date().toISOString().slice(0, 10),
        currencyCode: 'EUR',
        fees: '0',
        exchangeRateToBase: '1',
      })
      setPage(0)
      void fetchTransactions(0)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore nella creazione della transazione'
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
          <h1 className="text-2xl font-bold tracking-tight">Transazioni</h1>
          <p className="text-sm text-muted-foreground">{totalElements} transazioni totali</p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>Nuova Transazione</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Combobox
          value={portfolioFilter}
          onChange={handlePortfolioFilterChange}
          options={[
            { value: '', label: 'Tutti i portfolio' },
            ...portfolios.map((p) => ({ value: String(p.id), label: p.name })),
          ]}
          placeholder="Tutti i portfolio"
          className="w-56"
        />
        {portfolioFilter && (
          <Button variant="ghost" size="sm" onClick={() => handlePortfolioFilterChange('')}>
            Reimposta
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Portfolio</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Quantità</TableHead>
              <TableHead className="text-right">Prezzo Unit.</TableHead>
              <TableHead className="text-right">Totale</TableHead>
              <TableHead className="text-right">Comm.</TableHead>
              <TableHead>Valuta</TableHead>
              <TableHead className="text-right">P&L Realizzato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableLoadingRows loading={loading} empty={transactions.length === 0} colSpan={10} emptyMessage="Nessuna transazione trovata" />
            {!loading && transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">{fmtDate(tx.transactionDate)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{tx.portfolioName}</TableCell>
                  <TableCell>
                    {tx.assetTicker ? (
                      <span>
                        <span className="font-mono font-medium">{tx.assetTicker}</span>
                        {tx.assetName && (
                          <span className="text-xs text-muted-foreground ml-1.5 hidden lg:inline">
                            {tx.assetName}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={TRANSACTION_TYPE_VARIANT[tx.transactionType]}>
                      {TRANSACTION_TYPE_LABELS[tx.transactionType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {tx.quantity ? fmtNum(tx.quantity, 6).replace(/,?0+$/, '') : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {tx.unitPrice != null ? fmtNum(tx.unitPrice, 4) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {fmtNum(tx.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {tx.fees ? fmtNum(tx.fees) : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{tx.currencyCode}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {tx.realizedPnl != null ? (
                      <span className={tx.realizedPnl >= 0 ? 'text-green-600' : 'text-red-500'}>
                        {tx.realizedPnl >= 0 ? '+' : ''}{fmtNum(tx.realizedPnl)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination + count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalElements > 0
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalElements)} di ${totalElements} elementi`
            : '0 elementi'}
        </span>
        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nuova Transazione</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 py-2">

            {/* Tipo + Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Controller
                  name="transactionType"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={TRANSACTION_TYPES.map((t) => ({ value: t, label: TRANSACTION_TYPE_LABELS[t] }))}
                      hasError={!!errors.transactionType}
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transactionDate">Data *</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  {...register('transactionDate', { required: 'La data è obbligatoria' })}
                />
                {errors.transactionDate && (
                  <p className="text-xs text-destructive">{errors.transactionDate.message}</p>
                )}
              </div>
            </div>

            <Separator />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Riferimenti</p>

            {/* Portfolio + Asset */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label>Portfolio *</Label>
                <Controller
                  name="portfolioId"
                  control={control}
                  rules={{ required: 'Il portfolio è obbligatorio' }}
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={portfolios.map((p) => ({
                        value: String(p.id),
                        label: `${p.name}${p.currencyCode ? ` (${p.currencyCode})` : ''}`,
                      }))}
                      placeholder="— Seleziona —"
                      hasError={!!errors.portfolioId}
                    />
                  )}
                />
                {errors.portfolioId && (
                  <p className="text-xs text-destructive">{errors.portfolioId.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Asset {needsAsset ? '*' : <span className="text-muted-foreground">(opz.)</span>}
                </Label>
                <Controller
                  name="assetId"
                  control={control}
                  rules={{ required: needsAsset ? "L'asset è obbligatorio" : false }}
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={[
                        { value: '', label: '— Nessuno —' },
                        ...assets.map((a) => ({
                          value: String(a.id),
                          label: a.ticker ? `${a.ticker} — ${a.name}` : a.name,
                        })),
                      ]}
                      placeholder="— Nessuno —"
                      hasError={!!errors.assetId}
                    />
                  )}
                />
                {errors.assetId && (
                  <p className="text-xs text-destructive">{errors.assetId.message}</p>
                )}
              </div>
            </div>

            <Separator />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Importi</p>

            {/* Qty + Unit Price (solo per tipi con movimentazione titoli) */}
            {hasQtyPrice && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantità</Label>
                  <Input id="quantity" type="number" step="any" placeholder="4.91526" {...register('quantity')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unitPrice">Prezzo Unitario</Label>
                  <Input id="unitPrice" type="number" step="any" placeholder="508.62" {...register('unitPrice')} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="totalAmount">Totale *</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="any"
                  placeholder="2500.00"
                  {...register('totalAmount', { required: 'Il totale è obbligatorio' })}
                />
                {errors.totalAmount && (
                  <p className="text-xs text-destructive">{errors.totalAmount.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fees">Commissioni</Label>
                <Input id="fees" type="number" step="any" placeholder="1.00" {...register('fees')} />
              </div>
            </div>

            <Separator />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Valuta</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="currencyCode">Codice Valuta *</Label>
                <Input
                  id="currencyCode"
                  placeholder="EUR"
                  maxLength={3}
                  className="uppercase"
                  {...register('currencyCode', { required: 'La valuta è obbligatoria' })}
                />
                {errors.currencyCode && (
                  <p className="text-xs text-destructive">{errors.currencyCode.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exchangeRateToBase">Tasso di Cambio</Label>
                <Input id="exchangeRateToBase" type="number" step="any" placeholder="1.0" {...register('exchangeRateToBase')} />
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Note</Label>
              <Input id="notes" placeholder="Piano accumulo mensile…" {...register('notes')} />
            </div>

            <SheetFooter className="px-0 pt-2">
              <SheetClose
                render={<Button variant="outline" type="button" />}
                onClick={() => reset()}
              >
                Annulla
              </SheetClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvataggio…' : 'Registra'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
