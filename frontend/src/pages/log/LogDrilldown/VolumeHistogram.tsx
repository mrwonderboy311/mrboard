import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { HistogramBucket } from '@/types/log'

const LEVEL_COLORS: Record<string, string> = {
  error: 'hsl(var(--destructive))',
  warn: 'hsl(var(--chart-3))',
  info: 'hsl(var(--chart-2))',
  debug: 'hsl(var(--chart-1))',
}

interface VolumeHistogramProps {
  data: HistogramBucket[]
  onClickBucket?: (time: number) => void
}

export function VolumeHistogram({ data, onClickBucket }: VolumeHistogramProps) {
  if (!data || data.length === 0) return null

  return (
    <div className="h-[100px] px-4 py-1 border-b">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={0} barCategoryGap="5%"
          onClick={(e: any) => {
            const bucket = e?.activePayload?.[0]?.payload
            if (bucket?.time && onClickBucket) onClickBucket(bucket.time)
          }}
        >
          <XAxis dataKey="time" tickFormatter={(t) => {
            const d = new Date(t / 1_000_000)
            return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
          }} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={35} />
          <Tooltip
            labelFormatter={(t) => { const d = new Date(Number(t) / 1_000_000); return d.toLocaleString('zh-CN', { hour12: false }) }}
            formatter={(value: unknown, name: unknown) => [String(value), String(name)]}
            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
          />
          <Bar dataKey="error" stackId="a" fill={LEVEL_COLORS.error} cursor="pointer" />
          <Bar dataKey="warn" stackId="a" fill={LEVEL_COLORS.warn} cursor="pointer" />
          <Bar dataKey="info" stackId="a" fill={LEVEL_COLORS.info} cursor="pointer" />
          <Bar dataKey="debug" stackId="a" fill={LEVEL_COLORS.debug} cursor="pointer" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
