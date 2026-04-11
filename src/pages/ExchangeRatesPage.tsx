import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { createCurrencyPair, listCurrencyPairs, syncExchangeRates } from '@/api/exchangeRates'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { CurrencyPairCreateRequest, CurrencyPairResponse } from '@/types/api'

const TODAY = new Date().toISOString().slice(0, 10)

function isRateRecent(dateStr: string | null): boolean {
  if (!dateStr) return false
  const diff = (new Date(TODAY).getTime() - new Date(dateStr).getTime()) / 86_400_000
  return diff <= 7
}

const PAGE_SIZE = 20

export default function ExchangeRatesPage() {
  const [allPairs, setAllPairs] = useState<CurrencyPairResponse[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CurrencyPairCreateRequest>()

  // ─── Fetch ───────────────────────────────────────────────────────────────

  async function fetchPairs() {
    setLoading(true)
    try {
      const res = await listCurrencyPairs(0, 500)
      setAllPairs(res.data.content)
    } catch {
      toast.error('Errore nel caricamento dei cambi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchPairs() }, [])

  // ─── Sync ────────────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await syncExchangeRates()
      toast.success(`Sync completato: ${res.data} tassi aggiornati`)
      void fetchPairs()
    } catch {
      toast.error('Errore durante il sync dei cambi')
    } finally {
      setSyncing(false)
    }
  }

  // ─── Filter + paginate ───────────────────────────────────────────────────

  const filteredPairs = allPairs.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.baseCurrencyCode.toLowerCase().includes(q) ||
      p.quoteCurrencyCode.toLowerCase().includes(q) ||
      p.baseCurrencyName.toLowerCase().includes(q) ||
      p.quoteCurrencyName.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filteredPairs.length / PAGE_SIZE)
  const pagedPairs = filteredPairs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(0)
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function onSubmit(values: CurrencyPairCreateRequest) {
    setSubmitting(true)
    try {
      await createCurrencyPair({
        baseCurrencyCode: values.baseCurrencyCode.toUpperCase(),
        quoteCurrencyCode: values.quoteCurrencyCode.toUpperCase(),
      })
      toast.success('Coppia creata con successo')
      setSheetOpen(false)
      reset()
      void fetchPairs()
      setPage(0)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore nella creazione della coppia'
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
          <h1 className="text-2xl font-bold tracking-tight">Cambi Monetari</h1>
          <p className="text-sm text-muted-foreground">
            {filteredPairs.length !== allPairs.length
              ? `${filteredPairs.length} di ${allPairs.length} coppie`
              : `${allPairs.length} coppie nel registro`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Sincronizzazione…' : 'Sincronizza Tassi'}
          </Button>
          <Button onClick={() => setSheetOpen(true)}>Nuova Coppia</Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <Input
          placeholder="Cerca per codice, nome"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(''); setPage(0) }}
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
              <TableHead>Coppia</TableHead>
              <TableHead>Valuta Base</TableHead>
              <TableHead>Valuta Quotata</TableHead>
              <TableHead>Ultimo Tasso</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Caricamento…
                </TableCell>
              </TableRow>
            ) : pagedPairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nessuna coppia trovata
                </TableCell>
              </TableRow>
            ) : (
              pagedPairs.map((pair) => (
                <TableRow key={pair.id}>
                  <TableCell className="font-mono font-semibold">
                    {pair.baseCurrencyCode}/{pair.quoteCurrencyCode}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground mr-1">{pair.baseCurrencySymbol}</span>
                    {pair.baseCurrencyName}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground mr-1">{pair.quoteCurrencySymbol}</span>
                    {pair.quoteCurrencyName}
                  </TableCell>
                  <TableCell>
                    {pair.lastRate != null && isRateRecent(pair.lastRateDate) ? (
                      <span className="flex items-center gap-1.5">
                        {pair.lastRateDate === TODAY
                          ? <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" />
                          : <span className="text-xs text-muted-foreground">
                              {new Date(pair.lastRateDate!).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                            </span>
                        }
                        <span className="font-mono text-sm">
                          {pair.lastRate.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={pair.active ? 'default' : 'outline'}>
                      {pair.active ? 'Attiva' : 'Inattiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={`/exchange-rates/${pair.id}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      Dettaglio
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Pagina {page + 1} di {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Precedente
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Successiva
            </Button>
          </div>
        </div>
      )}

      {/* Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Nuova Coppia di Valute</SheetTitle>
          </SheetHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="baseCurrencyCode">Valuta Base *</Label>
              <Input
                id="baseCurrencyCode"
                placeholder="EUR"
                maxLength={3}
                className="uppercase"
                {...register('baseCurrencyCode', {
                  required: 'La valuta base è obbligatoria',
                  minLength: { value: 3, message: 'Inserire il codice ISO a 3 lettere' },
                  maxLength: { value: 3, message: 'Inserire il codice ISO a 3 lettere' },
                })}
              />
              {errors.baseCurrencyCode && (
                <p className="text-xs text-destructive">{errors.baseCurrencyCode.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quoteCurrencyCode">Valuta Quotata *</Label>
              <Input
                id="quoteCurrencyCode"
                placeholder="USD"
                maxLength={3}
                className="uppercase"
                {...register('quoteCurrencyCode', {
                  required: 'La valuta quotata è obbligatoria',
                  minLength: { value: 3, message: 'Inserire il codice ISO a 3 lettere' },
                  maxLength: { value: 3, message: 'Inserire il codice ISO a 3 lettere' },
                })}
              />
              {errors.quoteCurrencyCode && (
                <p className="text-xs text-destructive">{errors.quoteCurrencyCode.message}</p>
              )}
            </div>

            <SheetFooter className="px-0 pt-2">
              <SheetClose
                render={<Button variant="outline" type="button" />}
                onClick={() => reset()}
              >
                Annulla
              </SheetClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvataggio…' : 'Crea Coppia'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
