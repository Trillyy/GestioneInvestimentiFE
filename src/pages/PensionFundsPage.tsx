import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  createPensionFund,
  deletePensionFund,
  listPensionFunds,
  updatePensionFund,
} from '@/api/pensionFunds'
import { fmtDate, fmtNum } from '@/lib/formatters'
import { Button, buttonVariants } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableLoadingRows } from '@/components/ui/table-loading-rows'
import type { PensionFundResponse } from '@/types/api'

type FormValues = {
  name: string
  startDate: string
  strategy: string
  ter: string
  navLink: string
}

export default function PensionFundsPage() {
  const [funds, setFunds] = useState<PensionFundResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingFund, setEditingFund] = useState<PensionFundResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PensionFundResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { startDate: new Date().toISOString().slice(0, 10) },
  })

  async function fetchFunds() {
    setLoading(true)
    try {
      const res = await listPensionFunds()
      setFunds(res.data)
    } catch {
      toast.error('Errore nel caricamento dei fondi pensione')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchFunds() }, [])

  function openCreate() {
    setEditingFund(null)
    reset({ startDate: new Date().toISOString().slice(0, 10), name: '', strategy: '', ter: '', navLink: '' })
    setSheetOpen(true)
  }

  function openEdit(fund: PensionFundResponse) {
    setEditingFund(fund)
    reset({
      name: fund.name,
      startDate: fund.startDate,
      strategy: fund.strategy ?? '',
      ter: fund.ter != null ? String(fund.ter) : '',
      navLink: fund.navLink ?? '',
    })
    setSheetOpen(true)
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload = {
        name: values.name,
        startDate: values.startDate,
        ...(values.strategy && { strategy: values.strategy }),
        ...(values.ter !== '' && { ter: Number(values.ter) }),
        ...(values.navLink && { navLink: values.navLink }),
      }
      if (editingFund) {
        await updatePensionFund(editingFund.id, payload)
        toast.success('Fondo aggiornato con successo')
      } else {
        await createPensionFund(payload)
        toast.success('Fondo creato con successo')
      }
      setSheetOpen(false)
      void fetchFunds()
    } catch {
      toast.error(editingFund ? "Errore nell'aggiornamento" : 'Errore nella creazione')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePensionFund(deleteTarget.id)
      toast.success('Fondo eliminato con successo')
      setDeleteTarget(null)
      void fetchFunds()
    } catch {
      toast.error("Errore nell'eliminazione del fondo")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fondi Pensione</h1>
          <p className="text-sm text-muted-foreground">
            {funds.length} {funds.length === 1 ? 'fondo' : 'fondi'}
          </p>
        </div>
        <Button onClick={openCreate}>Nuovo Fondo</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Strategia</TableHead>
              <TableHead>Data Inizio</TableHead>
              <TableHead className="text-right">TER</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableLoadingRows loading={loading} empty={funds.length === 0} colSpan={5} emptyMessage="Nessun fondo pensione" />
            {!loading && funds.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    <Link to={`/pension-funds/${f.id}`} className="hover:underline">
                      {f.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{f.strategy ?? '—'}</TableCell>
                  <TableCell>{fmtDate(f.startDate)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {f.ter != null ? `${fmtNum(f.ter * 100, 2)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/pension-funds/${f.id}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        Dettaglio
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>
                        Modifica
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(f)}
                      >
                        Elimina
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingFund ? 'Modifica Fondo' : 'Nuovo Fondo Pensione'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Fondo Pensione Cometa"
                {...register('name', { required: 'Il nome è obbligatorio' })}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startDate">Data di Inizio Adesione *</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate', { required: 'La data è obbligatoria' })}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="strategy">Strategia</Label>
              <Input id="strategy" placeholder="Bilanciato" {...register('strategy')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ter">TER (es. 0.0015 = 0,15%)</Label>
              <Input
                id="ter"
                type="number"
                step="any"
                placeholder="0.0015"
                {...register('ter')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="navLink">Link NAV</Label>
              <Input
                id="navLink"
                placeholder="https://www.example.com/nav/cometa"
                {...register('navLink')}
              />
            </div>

            <SheetFooter className="px-0 pt-2">
              <SheetClose
                render={<Button variant="outline" type="button" />}
                onClick={() => reset()}
              >
                Annulla
              </SheetClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvataggio…' : editingFund ? 'Aggiorna' : 'Crea'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Elimina fondo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sei sicuro di voler eliminare{' '}
            <span className="font-medium text-foreground">{deleteTarget?.name}</span>? Tutti i
            dati associati (operazioni, NAV, benchmark) verranno eliminati permanentemente.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Annulla</DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminazione…' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
