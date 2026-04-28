import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface LineSeriesConfig {
  dataKey: string
  name: string
  color: string
  connectNulls?: boolean
}

interface CustomLineChartProps {
  data: Record<string, unknown>[]
  xKey?: string
  lines: LineSeriesConfig[]
  yAxisWidth?: number
  yAxisTickFormatter?: (v: number) => string
  tooltipValueFormatter?: (v: number) => string
  showLegend?: boolean
  showYear?: boolean
  computeDomain?: boolean
  domainPaddingFallback?: number
  emptyMessage?: string
}

export function CustomLineChart({
  data,
  xKey = 'date',
  lines,
  yAxisWidth = 60,
  yAxisTickFormatter = (v) => v.toFixed(2),
  tooltipValueFormatter = (v) => v.toFixed(4),
  showLegend = true,
  showYear = false,
  computeDomain = false,
  domainPaddingFallback = 1,
  emptyMessage = 'Nessun dato disponibile per il periodo selezionato',
}: CustomLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  let domain: [number, number] | undefined
  if (computeDomain) {
    const allValues = data.flatMap((d) =>
      lines.map((s) => d[s.dataKey] as number).filter((v) => v != null && !isNaN(v)),
    )
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const pad = (max - min) * 0.05 || domainPaddingFallback
    domain = [min - pad, max + pad]
  }

  const xTickFormatter = (v: string) => {
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' }
    if (showYear) opts.year = '2-digit'
    return new Date(v).toLocaleDateString('it-IT', opts)
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey={xKey}
          tickFormatter={xTickFormatter}
          tick={{ fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={domain}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={yAxisTickFormatter}
          width={yAxisWidth}
        />
        <Tooltip
          formatter={(value: number, name: string) => [tooltipValueFormatter(value), name]}
          labelFormatter={(label: string) => new Date(label).toLocaleDateString('it-IT')}
        />
        {showLegend && (
          <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
        )}
        {lines.map((series) => (
          <Line
            key={series.dataKey}
            type="monotone"
            dataKey={series.dataKey}
            name={series.name}
            stroke={series.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={series.connectNulls}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
