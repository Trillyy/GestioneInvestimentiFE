import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtNum } from '@/lib/formatters'

export interface ChartSlice {
  name: string
  value: number
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9',
  '#3b82f6', '#64748b',
]

interface CustomPieChartProps {
  data: ChartSlice[]
  title: string
  unit?: '%' | 'EUR'
  height?: number
  outerRadius?: number
}

export function CustomPieChart({
  data,
  title,
  unit = '%',
  height = 280,
  outerRadius = 90,
}: CustomPieChartProps) {
  if (data.length === 0) return null

  const labelFormatter = ({ value, percent }: { value?: number; percent?: number }) => {
    if (unit === 'EUR') return percent != null ? `${(percent * 100).toFixed(1)}%` : ''
    return value != null ? `${value.toFixed(1)}%` : ''
  }

  const tooltipFormatter = (v: unknown) => {
    if (typeof v !== 'number') return v
    return unit === 'EUR' ? `${fmtNum(v)} EUR` : `${v.toFixed(2)}%`
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={outerRadius}
              label={labelFormatter}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipFormatter} />
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
