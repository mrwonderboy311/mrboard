import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { MetricSeries } from '@/types'

interface TimeSeriesChartProps {
  title: string
  series: MetricSeries[]
  color?: string
  unitFormatter?: (value: number) => string
  height?: number
}

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ef4444', '#06b6d4', '#eab308', '#ec4899']

export function TimeSeriesChart({ title, series, unitFormatter, height = 300 }: TimeSeriesChartProps) {
  if (!series || series.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">暂无数据</div>
        </CardContent>
      </Card>
    )
  }

  const allTimestamps = new Set<number>()
  series.forEach(s => s.values.forEach(v => allTimestamps.add(v[0])))
  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b)

  const seriesLabels = series.map((s, i) => {
    const parts = Object.entries(s.metric).filter(([k]) => k !== '__name__').map(([, v]) => v)
    return parts.join('/') || `series_${i}`
  })

  const data = sortedTimestamps.map(ts => {
    const point: Record<string, any> = { timestamp: ts }
    series.forEach((s, i) => {
      const label = seriesLabels[i]
      const val = s.values.find(v => v[0] === ts)
      point[label] = val ? parseFloat(val[1]) : null
    })
    return point
  })

  const formatXAxis = (ts: number) => {
    const d = new Date(ts * 1000)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="timestamp" tickFormatter={formatXAxis} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              labelFormatter={(ts) => new Date(ts as number * 1000).toLocaleString()}
              formatter={(value: unknown) => [unitFormatter ? unitFormatter(Number(value)) : String(value)]}
            />
            {seriesLabels.map((label, i) => (
              <Line key={label} type="monotone" dataKey={label} stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
