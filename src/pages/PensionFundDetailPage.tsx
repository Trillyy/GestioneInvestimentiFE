import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  addBenchmark,
  addOperation,
  deleteBenchmark,
  deleteOperation,
  getHolding,
  getPensionFund,
  importOperations,
  listBenchmark,
  listNav,
  listOperations,
  syncNav,
} from '@/api/pensionFunds'
import { type ChartWindow, fmtDate, fmtNum, pnlColorClass, WINDOW_LABELS } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InfoRow } from '@/components/ui/info-row'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  BenchmarkType,
  PensionFundBenchmarkResponse,
  PensionFundHoldingResponse,
  PensionFundNavResponse,
  PensionFundOperationImportResult,
  PensionFundOperationResponse,
  PensionFundResponse,
  PensionOperationStatus,
  PensionOperationType,
} from '@/types/api'

// ─── Labels ──────────────────────────────────────────────────────────────────

const BENCHMARK_TYPE_LABELS: Record<BenchmarkType, string> = {
  EQUITY: 'Azionario',
  BOND: 'Obbligazionario',
  COMMODITY: 'Materie Prime',
  REAL_ESTATE: 'Immobiliare',
  CASH: 'Liquidità',
  MIXED: 'Misto',
  OTHER: 'Altro',
}

const BENCHMARK_TYPES: BenchmarkType[] = [
  'EQUITY', 'BOND', 'COMMODITY', 'REAL_ESTATE', 'CASH', 'MIXED', 'OTHER',
]

const OPERATION_TYPE_LABELS: Record<PensionOperationType, string> = {
  VOLUNTARY_CONTRIBUTION: 'Contributo Volontario',
  COMPANY_CONTRIBUTION: 'Contributo Aziendale',
  TFR: 'TFR',
  MEMBERSHIP_FEE: 'Quota Associativa',
  OTHER_CONTRIBUTION: 'Altro Contributo',
  ADVANCE: 'Anticipazione',
}

const OPERATION_TYPES: PensionOperationType[] = [
  'VOLUNTARY_CONTRIBUTION', 'COMPANY_CONTRIBUTION', 'TFR',
  'MEMBERSHIP_FEE', 'OTHER_CONTRIBUTION', 'ADVANCE',
]

const OPERATION_STATUS_LABELS: Record<PensionOperationStatus, string> = {
  INVESTED: 'Investito',
  INVESTING: 'In Investimento',
  PAYED: 'Pagato',
}

const OPERATION_STATUSES: PensionOperationStatus[] = ['INVESTED', 'INVESTING', 'PAYED']

// ─── Chart ───────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9',
]

interface ChartSlice { name: string; value: number }

function buildTypeData(items: PensionFundBenchmarkResponse[]): ChartSlice[] {
  const map = new Map<string, number>()
  for (const b of items) {
    const label = BENCHMARK_TYPE_LABELS[b.type]
    map.set(label, (map.get(label) ?? 0) + b.percentage)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)
}

function buildHedgeData(items: PensionFundBenchmarkResponse[]): ChartSlice[] {
  const hedged = items.filter((b) => b.hedged).reduce((s, b) => s + b.percentage, 0)
  const notHedged = items.filter((b) => !b.hedged).reduce((s, b) => s + b.percentage, 0)
  return [
    ...(notHedged > 0 ? [{ name: 'Non Hedged', value: Math.round(notHedged * 100) / 100 }] : []),
    ...(hedged > 0 ? [{ name: 'Hedged', value: Math.round(hedged * 100) / 100 }] : []),
  ]
}

function BenchmarkPieChart({
  data,
  title,
  unit = '%',
}: {
  data: ChartSlice[]
  title: string
  unit?: '%' | 'EUR'
}) {
  if (data.length === 0) return null
  const fmtLabel = (value?: number, percent?: number) => {
    if (unit === 'EUR') return percent != null ? `${(percent * 100).toFixed(1)}%` : ''
    return value != null ? `${value.toFixed(1)}%` : ''
  }
  const fmtTooltip = (v: unknown) => {
    if (typeof v !== 'number') return v
    return unit === 'EUR' ? `${fmtNum(v)} EUR` : `${v.toFixed(2)}%`
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={85}
              label={({ value, percent }: { value?: number; percent?: number }) => fmtLabel(value, percent)}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={fmtTooltip} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value: string) => <span className="text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function NavLineChart({ data }: { data: PensionFundNavResponse[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Nessun valore quota disponibile
      </div>
    )
  }
  const sorted = [...data].reverse()
  const values = sorted.map((d) => d.navValue)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = (max - min) * 0.05 || 0.01

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={sorted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="navDate"
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
          }
          tick={{ fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[min - pad, max + pad]}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toFixed(4)}
          width={72}
        />
        <Tooltip
          formatter={(v: number) => [v.toFixed(4), 'NAV']}
          labelFormatter={(label: string) => new Date(label).toLocaleDateString('it-IT')}
        />
        <Line
          type="monotone"
          dataKey="navValue"
          name="NAV"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

type HoldingPoint = { date: string; versato: number; complessivo: number | undefined }

function HoldingLineChart({ data }: { data: HoldingPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Nessun dato storico disponibile
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={(v: string) =>
            new Date(v).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
          }
          tick={{ fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => fmtNum(v, 0)}
          width={80}
        />
        <Tooltip
          formatter={(v: number, name: string) => [`${fmtNum(v)} EUR`, name]}
          labelFormatter={(label: string) => new Date(label).toLocaleDateString('it-IT')}
        />
        <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
        <Line
          type="monotone"
          dataKey="versato"
          name="Versato"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="complessivo"
          name="Complessivo"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Form types ───────────────────────────────────────────────────────────────

type BenchmarkFormValues = {
  name: string
  type: BenchmarkType
  percentage: string
  currencyCode: string
  hedged: boolean
}

type OperationFormValues = {
  operationDate: string
  paymentDate: string
  operationType: PensionOperationType
  status: PensionOperationStatus
  amount: string
  quantity: string
  loadValue: string
  notes: string
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNum(s: string): number | undefined {
  return s !== '' ? Number(s) : undefined
}

const PAGE_SIZE = 20

// ─── Component ───────────────────────────────────────────────────────────────

export default function PensionFundDetailPage() {
  const { id } = useParams<{ id: string }>()
  const fundId = Number(id)

  const [fund, setFund] = useState<PensionFundResponse | null>(null)
  const [holding, setHolding] = useState<PensionFundHoldingResponse | null>(null)
  const [holdingHistory, setHoldingHistory] = useState<PensionFundHoldingResponse[]>([])
  const [benchmark, setBenchmark] = useState<PensionFundBenchmarkResponse[]>([])
  const [operations, setOperations] = useState<PensionFundOperationResponse[]>([])
  const [nav, setNav] = useState<PensionFundNavResponse[]>([])
  const [opsPage, setOpsPage] = useState(0)
  const [opsTotalPages, setOpsTotalPages] = useState(0)
  const [opsTotalElements, setOpsTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedNavDate, setSelectedNavDate] = useState('')
  const [holdingLoading, setHoldingLoading] = useState(false)

  const [benchmarkSheetOpen, setBenchmarkSheetOpen] = useState(false)
  const [benchmarkSubmitting, setBenchmarkSubmitting] = useState(false)
  const [operationSheetOpen, setOperationSheetOpen] = useState(false)
  const [operationSubmitting, setOperationSubmitting] = useState(false)
  const [importResult, setImportResult] = useState<PensionFundOperationImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [navSyncing, setNavSyncing] = useState(false)
  const [navPage, setNavPage] = useState(0)
  const [navWindow, setNavWindow] = useState<ChartWindow>('alltime')
  const [navFrom, setNavFrom] = useState('')
  const [navTo, setNavTo] = useState('')
const [deleteOpTarget, setDeleteOpTarget] = useState<PensionFundOperationResponse | null>(null)
  const [deleteBmTarget, setDeleteBmTarget] = useState<PensionFundBenchmarkResponse | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ─── Forms ───────────────────────────────────────────────────────────────

  const benchmarkForm = useForm<BenchmarkFormValues>({
    defaultValues: { type: 'EQUITY', currencyCode: 'EUR', hedged: false },
  })
  const operationForm = useForm<OperationFormValues>({
    defaultValues: {
      operationType: 'VOLUNTARY_CONTRIBUTION',
      status: 'INVESTED',
      operationDate: new Date().toISOString().slice(0, 10),
    },
  })

  // ─── Fetch ───────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getPensionFund(fundId),
      getHolding(fundId),
      listBenchmark(fundId),
      listOperations(fundId, 0, PAGE_SIZE),
      listNav(fundId),
    ])
      .then(([fundRes, holdingRes, bmRes, opsRes, navRes]) => {
        setFund(fundRes.data)
        setHoldingHistory(holdingRes.data)
        setHolding(holdingRes.data[0] ?? null)
        setBenchmark(bmRes.data)
        setOperations(opsRes.data.content)
        setOpsTotalPages(opsRes.data.totalPages)
        setOpsTotalElements(opsRes.data.totalElements)
        setNav(navRes.data)
      })
      .catch(() => toast.error('Errore nel caricamento del fondo'))
      .finally(() => setLoading(false))
  }, [fundId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchOperations(page: number) {
    try {
      const res = await listOperations(fundId, page, PAGE_SIZE)
      setOperations(res.data.content)
      setOpsTotalPages(res.data.totalPages)
      setOpsTotalElements(res.data.totalElements)
    } catch {
      toast.error('Errore nel caricamento delle operazioni')
    }
  }

  function handleNavDateSelect(date: string) {
    setSelectedNavDate(date)
    setHoldingLoading(true)
    getHolding(fundId, date || undefined)
      .then((res) => {
        setHoldingHistory(res.data)
        setHolding(res.data[0] ?? null)
      })
      .catch(() => toast.error('Errore nel caricamento della situazione'))
      .finally(() => setHoldingLoading(false))
  }

  // ─── Benchmark ───────────────────────────────────────────────────────────

  async function onBenchmarkSubmit(values: BenchmarkFormValues) {
    setBenchmarkSubmitting(true)
    try {
      await addBenchmark(fundId, {
        name: values.name,
        type: values.type,
        percentage: Number(values.percentage),
        currencyCode: values.currencyCode.toUpperCase(),
        hedged: values.hedged,
      })
      const res = await listBenchmark(fundId)
      setBenchmark(res.data)
      setBenchmarkSheetOpen(false)
      benchmarkForm.reset({ type: 'EQUITY', currencyCode: 'EUR', hedged: false })
      toast.success('Componente aggiunto con successo')
    } catch {
      toast.error("Errore nell'aggiunta del componente")
    } finally {
      setBenchmarkSubmitting(false)
    }
  }

  async function handleDeleteBenchmark() {
    if (!deleteBmTarget) return
    setDeleting(true)
    try {
      await deleteBenchmark(fundId, deleteBmTarget.id)
      const res = await listBenchmark(fundId)
      setBenchmark(res.data)
      setDeleteBmTarget(null)
      toast.success('Componente rimosso con successo')
    } catch {
      toast.error('Errore nella rimozione del componente')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Operations ──────────────────────────────────────────────────────────

  async function onOperationSubmit(values: OperationFormValues) {
    setOperationSubmitting(true)
    try {
      await addOperation(fundId, {
        operationDate: values.operationDate,
        ...(values.paymentDate && { paymentDate: values.paymentDate }),
        operationType: values.operationType,
        status: values.status,
        amount: Number(values.amount),
        ...(values.quantity && { quantity: Number(values.quantity) }),
        ...(values.loadValue && { loadValue: Number(values.loadValue) }),
        ...(values.notes && { notes: values.notes }),
      })
      setOpsPage(0)
      await fetchOperations(0)
      setOperationSheetOpen(false)
      operationForm.reset({
        operationType: 'VOLUNTARY_CONTRIBUTION',
        status: 'INVESTED',
        operationDate: new Date().toISOString().slice(0, 10),
      })
      toast.success('Operazione registrata con successo')
    } catch {
      toast.error("Errore nella registrazione dell'operazione")
    } finally {
      setOperationSubmitting(false)
    }
  }

  async function handleDeleteOperation() {
    if (!deleteOpTarget) return
    setDeleting(true)
    try {
      await deleteOperation(fundId, deleteOpTarget.id)
      await fetchOperations(opsPage)
      setDeleteOpTarget(null)
      toast.success('Operazione eliminata con successo')
    } catch {
      toast.error("Errore nell'eliminazione dell'operazione")
    } finally {
      setDeleting(false)
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportResult(null)
    try {
      const res = await importOperations(fundId, file)
      setImportResult(res.data)
      setOpsPage(0)
      await fetchOperations(0)
      toast.success(`Import completato: ${res.data.imported} operazioni importate`)
    } catch {
      toast.error("Errore durante l'import del file CSV")
    } finally {
      setImporting(false)
    }
  }

  // ─── NAV ─────────────────────────────────────────────────────────────────

  async function handleNavSync() {
    setNavSyncing(true)
    try {
      const res = await syncNav()
      const inserted = res.data
      const navRes = await listNav(fundId)
      setNav(navRes.data)
      setNavPage(0)
      toast.success(`Sync completato: ${inserted} ${inserted === 1 ? 'nuovo valore inserito' : 'nuovi valori inseriti'}`)
    } catch {
      toast.error('Errore durante il sync NAV')
    } finally {
      setNavSyncing(false)
    }
  }

  // ─── Computed ─────────────────────────────────────────────────────────────

  const totalValue =
    holding?.currentQuantity != null && holding?.currentNav != null
      ? holding.currentQuantity * holding.currentNav
      : null

  const totalContributions =
    (holding?.voluntaryContribution ?? 0) +
    (holding?.companyContribution ?? 0) +
    (holding?.tfrContribution ?? 0) +
    (holding?.otherContributions ?? 0)

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Caricamento…</div>
  }

  if (!fund) {
    return <div className="text-center py-20 text-muted-foreground">Fondo non trovato</div>
  }

  const holdingLineData: HoldingPoint[] = [...holdingHistory]
    .reverse()
    .map((h) => ({
      date: h.holdingDate,
      versato:
        (h.voluntaryContribution ?? 0) +
        (h.companyContribution ?? 0) +
        (h.tfrContribution ?? 0) +
        (h.otherContributions ?? 0),
      complessivo:
        h.currentQuantity != null && h.currentNav != null
          ? h.currentQuantity * h.currentNav
          : undefined,
    }))

  const contributionPieData: ChartSlice[] = [
    { name: 'Contributo Volontario', value: holding?.voluntaryContribution ?? 0 },
    { name: 'Contributo Aziendale', value: holding?.companyContribution ?? 0 },
    { name: 'TFR', value: holding?.tfrContribution ?? 0 },
    { name: 'Altri Contributi', value: holding?.otherContributions ?? 0 },
    { name: 'Rendimento', value: holding?.returnAmount ?? 0 },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/pension-funds" className="hover:text-foreground">
          Fondi Pensione
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{fund.name}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{fund.name}</h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          {fund.strategy && <span>{fund.strategy}</span>}
          {fund.strategy && <span>·</span>}
          <span>Dal {fmtDate(fund.startDate)}</span>
          {fund.ter != null && (
            <>
              <span>·</span>
              <span>TER {fmtNum(fund.ter * 100, 2)}%</span>
            </>
          )}
          {fund.navLink && (
            <>
              <span>·</span>
              <a
                href={fund.navLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline underline-offset-2"
              >
                Link NAV
              </a>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="situazione">
        <TabsList>
          <TabsTrigger value="situazione">Situazione</TabsTrigger>
          <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
          <TabsTrigger value="operazioni">Operazioni</TabsTrigger>
          <TabsTrigger value="nav">Storico NAV</TabsTrigger>
        </TabsList>

        {/* ── Situazione ─────────────────────────────────────────────────── */}
        <TabsContent value="situazione" className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm shrink-0">Situazione al</Label>
            <div className="w-48">
              <Combobox
                value={selectedNavDate}
                onChange={handleNavDateSelect}
                options={[
                  { value: '', label: 'Ultima disponibile' },
                  ...nav.filter((n) => n.navDate >= fund.startDate).map((n) => ({ value: n.navDate, label: fmtDate(n.navDate) })),
                ]}
                disabled={holdingLoading || nav.length === 0}
                placeholder="Ultima disponibile"
              />
            </div>
            {holdingLoading && (
              <span className="text-xs text-muted-foreground">Caricamento…</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                  Valore Totale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono">
                  {totalValue != null ? fmtNum(totalValue) : '—'}
                  <span className="text-sm font-normal text-muted-foreground ml-1">EUR</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                  NAV Attuale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono">{fmtNum(holding?.currentNav, 4)}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtNum(holding?.currentQuantity, 4)} quote
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                  Contributi Totali
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-mono">
                  {totalValue != null ? fmtNum(totalContributions) : '—'}
                  <span className="text-sm font-normal text-muted-foreground ml-1">EUR</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                  Rendimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold font-mono ${pnlColorClass(holding?.returnAmount)}`}>
                  {holding?.returnAmount != null
                    ? `${holding.returnAmount >= 0 ? '+' : ''}${fmtNum(holding.returnAmount)}`
                    : '—'}
                  <span className={`text-sm font-normal ml-1 ${pnlColorClass(holding?.returnAmount)}`}>EUR</span>
                </p>
                {holding?.returnPct != null && (
                  <p className={`text-xs ${pnlColorClass(holding.returnPct)}`}>
                    {holding.returnPct >= 0 ? '+' : ''}{fmtNum(holding.returnPct, 2)}%
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {holdingLineData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Andamento del Fondo</CardTitle>
              </CardHeader>
              <CardContent>
                <HoldingLineChart data={holdingLineData} />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <BenchmarkPieChart data={contributionPieData} title="Composizione Contributi" unit="EUR" />
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Dettaglio Contributi</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-2 gap-3">
                <InfoRow
                  label="Contributo Volontario"
                  value={holding?.voluntaryContribution != null ? `${fmtNum(holding.voluntaryContribution)} EUR` : null}
                />
                <InfoRow
                  label="Contributo Aziendale"
                  value={holding?.companyContribution != null ? `${fmtNum(holding.companyContribution)} EUR` : null}
                />
                <InfoRow
                  label="TFR"
                  value={holding?.tfrContribution != null ? `${fmtNum(holding.tfrContribution)} EUR` : null}
                />
                <InfoRow
                  label="Altri Contributi"
                  value={holding?.otherContributions != null ? `${fmtNum(holding.otherContributions)} EUR` : null}
                />
                <InfoRow
                  label="Spese Extra"
                  value={holding?.extraExpenses != null ? `${fmtNum(holding.extraExpenses)} EUR` : null}
                />
                <InfoRow
                  label="Ultimo Aggiornamento"
                  value={holding?.holdingDate ? fmtDate(holding.holdingDate) : null}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Benchmark ──────────────────────────────────────────────────── */}
        <TabsContent value="benchmark" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {benchmark.length} {benchmark.length === 1 ? 'componente' : 'componenti'}
              {benchmark.length > 0 && (
                <> · Totale: {fmtNum(benchmark.reduce((s, b) => s + b.percentage, 0), 2)}%</>
              )}
            </p>
            <Button
              onClick={() => {
                benchmarkForm.reset({ type: 'EQUITY', currencyCode: 'EUR', hedged: false })
                setBenchmarkSheetOpen(true)
              }}
            >
              Aggiungi Componente
            </Button>
          </div>

          {benchmark.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <BenchmarkPieChart data={buildTypeData(benchmark)} title="Allocazione per Tipo" />
              <BenchmarkPieChart data={buildHedgeData(benchmark)} title="Copertura Valutaria" />
            </div>
          )}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead>Valuta</TableHead>
                  <TableHead>Hedged</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {benchmark.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nessun componente benchmark
                    </TableCell>
                  </TableRow>
                ) : (
                  benchmark.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{BENCHMARK_TYPE_LABELS[b.type]}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmtNum(b.percentage, 2)}%
                      </TableCell>
                      <TableCell className="font-mono text-xs">{b.currencyCode}</TableCell>
                      <TableCell>{b.hedged ? 'Sì' : 'No'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteBmTarget(b)}
                        >
                          Rimuovi
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Operazioni ─────────────────────────────────────────────────── */}
        <TabsContent value="operazioni" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{opsTotalElements} operazioni totali</p>
            <div className="flex items-center gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImport}
              />
              <Button
                variant="outline"
                disabled={importing}
                onClick={() => importInputRef.current?.click()}
              >
                {importing ? 'Importazione…' : 'Importa CSV'}
              </Button>
              <Button
                onClick={() => {
                  operationForm.reset({
                    operationType: 'VOLUNTARY_CONTRIBUTION',
                    status: 'INVESTED',
                    operationDate: new Date().toISOString().slice(0, 10),
                  })
                  setOperationSheetOpen(true)
                }}
              >
                Nuova Operazione
              </Button>
            </div>
          </div>

          {importResult && (
            <div className="rounded-lg border p-4 space-y-2 bg-muted/40">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-emerald-600 font-medium">✓ {importResult.imported} importate</span>
                {importResult.skipped > 0 && (
                  <span className="text-muted-foreground">{importResult.skipped} saltate</span>
                )}
                {importResult.errors > 0 && (
                  <span className="text-red-500 font-medium">{importResult.errors} errori</span>
                )}
                <button
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setImportResult(null)}
                >
                  Chiudi
                </button>
              </div>
              {importResult.errorRows.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-red-500">Righe in errore:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto font-mono">
                    {importResult.errorRows.map((r, i) => (
                      <li key={i} className="truncate">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {importResult.skippedRows.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Righe saltate:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto font-mono">
                    {importResult.skippedRows.map((r, i) => (
                      <li key={i} className="truncate">{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Op.</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Importo</TableHead>
                  <TableHead className="text-right">Quote</TableHead>
                  <TableHead className="text-right">Val. Carico</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nessuna operazione
                    </TableCell>
                  </TableRow>
                ) : (
                  operations.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="whitespace-nowrap">{fmtDate(op.operationDate)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{OPERATION_TYPE_LABELS[op.operationType]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={op.status === 'INVESTED' ? 'default' : 'outline'}>
                          {OPERATION_STATUS_LABELS[op.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {fmtNum(op.amount)} EUR
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {op.quantity != null ? fmtNum(op.quantity, 4) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {op.loadValue != null ? fmtNum(op.loadValue, 4) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                        {op.notes ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteOpTarget(op)}
                        >
                          Elimina
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {opsTotalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {opsPage * PAGE_SIZE + 1}–{Math.min((opsPage + 1) * PAGE_SIZE, opsTotalElements)} di{' '}
                {opsTotalElements}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={opsPage === 0}
                  onClick={() => {
                    const p = opsPage - 1
                    setOpsPage(p)
                    void fetchOperations(p)
                  }}
                >
                  Precedente
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={opsPage >= opsTotalPages - 1}
                  onClick={() => {
                    const p = opsPage + 1
                    setOpsPage(p)
                    void fetchOperations(p)
                  }}
                >
                  Successiva
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Storico NAV ─────────────────────────────────────────────────── */}
        <TabsContent value="nav" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{nav.length} valori quota</p>
            <Button onClick={handleNavSync} disabled={navSyncing}>
              {navSyncing ? 'Sincronizzazione…' : 'Sincronizza NAV'}
            </Button>
          </div>

          {(() => {
            const today = new Date()
            const cutoff = (days: number) => {
              const d = new Date(today)
              d.setDate(d.getDate() - days)
              return d.toISOString().slice(0, 10)
            }
            const filtered = nav.filter((n) => {
              if (navWindow === 'week') return n.navDate >= cutoff(7)
              if (navWindow === 'month') return n.navDate >= cutoff(30)
              if (navWindow === 'year') return n.navDate >= cutoff(365)
              if (navWindow === 'ytd') return n.navDate >= `${today.getFullYear()}-01-01`
              if (navWindow === 'custom') return n.navDate >= navFrom && n.navDate <= navTo
              return true // alltime
            })
            return (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex gap-1 flex-wrap">
                    {(['week', 'month', 'year', 'ytd', 'alltime', 'custom'] as ChartWindow[]).map((w) => (
                      <Button
                        key={w}
                        variant={navWindow === w ? 'default' : 'outline'}
                        size="xs"
                        onClick={() => { setNavWindow(w); setNavPage(0) }}
                      >
                        {WINDOW_LABELS[w]}
                      </Button>
                    ))}
                  </div>
                  {navWindow === 'custom' && (
                    <>
                      <Separator className="mt-3" />
                      <div className="flex items-end gap-3 mt-3 flex-wrap">
                        <div className="space-y-1">
                          <Label className="text-xs">Dal</Label>
                          <Input
                            type="date"
                            value={navFrom}
                            onChange={(e) => { setNavFrom(e.target.value); setNavPage(0) }}
                            className="h-8 w-36"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Al</Label>
                          <Input
                            type="date"
                            value={navTo}
                            onChange={(e) => { setNavTo(e.target.value); setNavPage(0) }}
                            className="h-8 w-36"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardHeader>
                <CardContent>
                  <NavLineChart data={filtered} />
                </CardContent>
              </Card>
            )
          })()}

          {(() => {
            const NAV_PAGE_SIZE = 20
            const navTotalPages = Math.ceil(nav.length / NAV_PAGE_SIZE)
            const navSlice = nav.slice(navPage * NAV_PAGE_SIZE, (navPage + 1) * NAV_PAGE_SIZE)
            return (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valore Quota (NAV)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {navSlice.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                            Nessun valore quota
                          </TableCell>
                        </TableRow>
                      ) : (
                        navSlice.map((n) => (
                          <TableRow key={n.id}>
                            <TableCell>{fmtDate(n.navDate)}</TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {fmtNum(n.navValue, 4)} EUR
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {navTotalPages > 1 && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {navPage * NAV_PAGE_SIZE + 1}–{Math.min((navPage + 1) * NAV_PAGE_SIZE, nav.length)} di {nav.length}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={navPage === 0}
                        onClick={() => setNavPage((p) => p - 1)}
                      >
                        Precedente
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={navPage >= navTotalPages - 1}
                        onClick={() => setNavPage((p) => p + 1)}
                      >
                        Successiva
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </TabsContent>
      </Tabs>

      {/* ── Benchmark Sheet ───────────────────────────────────────────────── */}
      <Sheet open={benchmarkSheetOpen} onOpenChange={setBenchmarkSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Aggiungi Componente Benchmark</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={benchmarkForm.handleSubmit(onBenchmarkSubmit)}
            className="flex flex-col gap-4 px-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="bm-name">Nome *</Label>
              <Input
                id="bm-name"
                placeholder="MSCI World"
                {...benchmarkForm.register('name', { required: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Controller
                  name="type"
                  control={benchmarkForm.control}
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={BENCHMARK_TYPES.map((t) => ({
                        value: t,
                        label: BENCHMARK_TYPE_LABELS[t],
                      }))}
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bm-pct">Percentuale (%) *</Label>
                <Input
                  id="bm-pct"
                  type="number"
                  step="any"
                  placeholder="60.00"
                  {...benchmarkForm.register('percentage', { required: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bm-currency">Valuta *</Label>
                <Input
                  id="bm-currency"
                  placeholder="EUR"
                  maxLength={3}
                  className="uppercase"
                  {...benchmarkForm.register('currencyCode', { required: true })}
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  id="bm-hedged"
                  className="h-4 w-4"
                  {...benchmarkForm.register('hedged')}
                />
                <Label htmlFor="bm-hedged">Hedged</Label>
              </div>
            </div>

            <SheetFooter className="px-0 pt-2">
              <SheetClose render={<Button variant="outline" type="button" />}>Annulla</SheetClose>
              <Button type="submit" disabled={benchmarkSubmitting}>
                {benchmarkSubmitting ? 'Salvataggio…' : 'Aggiungi'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Operation Sheet ───────────────────────────────────────────────── */}
      <Sheet open={operationSheetOpen} onOpenChange={setOperationSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nuova Operazione</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={operationForm.handleSubmit(onOperationSubmit)}
            className="flex flex-col gap-4 px-4 py-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Controller
                  name="operationType"
                  control={operationForm.control}
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={OPERATION_TYPES.map((t) => ({
                        value: t,
                        label: OPERATION_TYPE_LABELS[t],
                      }))}
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stato *</Label>
                <Controller
                  name="status"
                  control={operationForm.control}
                  render={({ field }) => (
                    <Combobox
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      options={OPERATION_STATUSES.map((s) => ({
                        value: s,
                        label: OPERATION_STATUS_LABELS[s],
                      }))}
                    />
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="op-date">Data Operazione *</Label>
                <Input
                  id="op-date"
                  type="date"
                  {...operationForm.register('operationDate', { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-pay-date">Data Versamento</Label>
                <Input id="op-pay-date" type="date" {...operationForm.register('paymentDate')} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="op-amount">Importo *</Label>
                <Input
                  id="op-amount"
                  type="number"
                  step="any"
                  placeholder="200.00"
                  {...operationForm.register('amount', { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-qty">Quote</Label>
                <Input
                  id="op-qty"
                  type="number"
                  step="any"
                  placeholder="12.3456"
                  {...operationForm.register('quantity')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="op-load">Valore di Carico</Label>
              <Input
                id="op-load"
                type="number"
                step="any"
                placeholder="16.20"
                {...operationForm.register('loadValue')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="op-notes">Note</Label>
              <Input
                id="op-notes"
                placeholder="Contributo mensile"
                {...operationForm.register('notes')}
              />
            </div>

            <SheetFooter className="px-0 pt-2">
              <SheetClose render={<Button variant="outline" type="button" />}>Annulla</SheetClose>
              <Button type="submit" disabled={operationSubmitting}>
                {operationSubmitting ? 'Salvataggio…' : 'Registra'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Delete Operation Dialog ───────────────────────────────────────── */}
      <Dialog
        open={!!deleteOpTarget}
        onOpenChange={(open) => { if (!open) setDeleteOpTarget(null) }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Elimina operazione</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Eliminare l&apos;operazione del{' '}
            <span className="font-medium text-foreground">
              {deleteOpTarget ? fmtDate(deleteOpTarget.operationDate) : ''}
            </span>{' '}
            ({deleteOpTarget ? OPERATION_TYPE_LABELS[deleteOpTarget.operationType] : ''},{' '}
            {deleteOpTarget ? `${fmtNum(deleteOpTarget.amount)} EUR` : ''})?
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Annulla</DialogClose>
            <Button variant="destructive" onClick={handleDeleteOperation} disabled={deleting}>
              {deleting ? 'Eliminazione…' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Benchmark Dialog ───────────────────────────────────────── */}
      <Dialog
        open={!!deleteBmTarget}
        onOpenChange={(open) => { if (!open) setDeleteBmTarget(null) }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Rimuovi componente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Rimuovere{' '}
            <span className="font-medium text-foreground">{deleteBmTarget?.name}</span> dal
            benchmark?
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Annulla</DialogClose>
            <Button variant="destructive" onClick={handleDeleteBenchmark} disabled={deleting}>
              {deleting ? 'Rimozione…' : 'Rimuovi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
