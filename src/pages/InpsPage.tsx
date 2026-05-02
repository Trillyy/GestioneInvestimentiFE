import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { deleteTasso, insertTasso, listTassi, updateTasso } from '@/api/inps'
import { fmtNum } from '@/helpers/formatters.ts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TassoCapitalizzazioneInpsResponse } from '@/types/api'

type FormValues = {
  anno: string
  tassoCapitalizzazione: string
  note: string
}

export default function InpsPage() {
  const [tassi, setTassi] = useState<TassoCapitalizzazioneInpsResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editTarget, setEditTarget] = useState<TassoCapitalizzazioneInpsResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TassoCapitalizzazioneInpsResponse | null>(null)
  const [deleting, setDeleting] = useState(false)
  const form = useForm<FormValues>({
    defaultValues: { anno: String(new Date().getFullYear()), tassoCapitalizzazione: '', note: '' },
  })

  useEffect(() => {
    setLoading(true)
    listTassi()
      .then((res) => setTassi(res.data))
      .catch(() => toast.error('Errore nel caricamento dei tassi'))
      .finally(() => setLoading(false))
  }, [])

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const payload = {
        anno: Number(values.anno),
        tassoCapitalizzazione: Number(values.tassoCapitalizzazione),
        ...(values.note && { note: values.note }),
      }
      if (editTarget) {
        await updateTasso(editTarget.id, payload)
        toast.success('Tasso aggiornato con successo')
      } else {
        await insertTasso(payload)
        toast.success('Tasso inserito con successo')
      }
      const res = await listTassi()
      setTassi(res.data)
      setSheetOpen(false)
      setEditTarget(null)
      form.reset({ anno: String(new Date().getFullYear()), tassoCapitalizzazione: '', note: '' })
    } catch {
      toast.error(editTarget ? "Errore durante l'aggiornamento del tasso" : "Errore durante l'inserimento del tasso")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTasso(deleteTarget.id)
      const res = await listTassi()
      setTassi(res.data)
      setDeleteTarget(null)
      toast.success('Tasso eliminato con successo')
    } catch {
      toast.error("Errore durante l'eliminazione del tasso")
    } finally {
      setDeleting(false)
    }
  }

  function openEdit(tasso: TassoCapitalizzazioneInpsResponse) {
    setEditTarget(tasso)
    form.reset({
      anno: String(tasso.anno),
      tassoCapitalizzazione: String(tasso.tassoCapitalizzazione),
      note: tasso.note ?? '',
    })
    setSheetOpen(true)
  }

  function openNew() {
    setEditTarget(null)
    form.reset({ anno: String(new Date().getFullYear()), tassoCapitalizzazione: '', note: '' })
    setSheetOpen(true)
  }

  const totalRivalutazione = tassi.length > 0
    ? tassi.reduce((acc, t) => acc * (1 + t.tassoCapitalizzazione), 1) - 1
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">INPS</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestione dati previdenziali INPS</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tassi">
        <TabsList>
          <TabsTrigger value="tassi">Tassi di Capitalizzazione</TabsTrigger>
        </TabsList>

        {/* ── Tassi di Capitalizzazione ─────────────────────────────────────── */}
        <TabsContent value="tassi" className="space-y-4 pt-4">
          {tassi.length > 0 && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Anni Registrati</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold font-mono">{tassi.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Ultimo Anno</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold font-mono">{tassi[0]?.anno ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">
                    {tassi[0] != null ? `${fmtNum(tassi[0].tassoCapitalizzazione * 100, 4)}%` : ''}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Rivalutazione Cumulativa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold font-mono">
                    {totalRivalutazione != null ? `${fmtNum(totalRivalutazione * 100, 2)}%` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tassi.length > 0 ? `${tassi[tassi.length - 1]?.anno}–${tassi[0]?.anno}` : ''}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{tassi.length} tassi registrati</p>
            <Button onClick={openNew}>Aggiungi Tasso</Button>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anno</TableHead>
                  <TableHead className="text-right">Tasso Capitalizzazione</TableHead>
                  <TableHead className="text-right">Tasso Rivalutazione</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableLoadingRows loading={loading} empty={tassi.length === 0} colSpan={5} emptyMessage="Nessun tasso registrato" />
                {!loading && tassi.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium font-mono">{t.anno}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <Badge variant={t.tassoCapitalizzazione >= 0 ? 'default' : 'destructive'}>
                        {t.tassoCapitalizzazione >= 0 ? '+' : ''}{fmtNum(t.tassoCapitalizzazione * 100, 4)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmtNum(t.tassoRivalutazione * 100, 4)}%
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {t.note ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                          Modifica
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(t)}
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
        </TabsContent>
      </Tabs>

      {/* ── Sheet ────────────────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditTarget(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? 'Modifica Tasso' : 'Aggiungi Tasso'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="anno">Anno *</Label>
              <Input
                id="anno"
                type="number"
                placeholder="2024"
                {...form.register('anno', { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tasso">Tasso di Capitalizzazione *</Label>
              <Input
                id="tasso"
                type="number"
                step="any"
                placeholder="0.1 (per 10%)"
                {...form.register('tassoCapitalizzazione', { required: true })}
              />
              <p className="text-xs text-muted-foreground">Valore decimale (es. 0.1 per 10%, -0.05 per -5%)</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                placeholder="Fonte: INPS circolare n. 12/2024"
                {...form.register('note')}
              />
            </div>
            <SheetFooter className="px-0 pt-2">
              <SheetClose render={<Button variant="outline" type="button" />}>Annulla</SheetClose>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvataggio…' : editTarget ? 'Aggiorna' : 'Inserisci'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Delete Dialog ─────────────────────────────────────────────────────── */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Elimina tasso</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Eliminare il tasso di capitalizzazione per l&apos;anno{' '}
            <span className="font-medium text-foreground">{deleteTarget?.anno}</span>?
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
