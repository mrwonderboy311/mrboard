import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { REDServiceMetrics } from '@/lib/api'

const COLORS = {
  rate: '#3b82f6',
  error: '#ef4444',
  duration: '#a855f7',
}

function formatValue(val: number): string {
  if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + 'M'
  if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + 'K'
  if (Math.abs(val) >= 1) return val.toFixed(2)
  if (Math.abs(val) >= 0.001) return (val * 1000).toFixed(1) + 'm'
  return val.toFixed(4)
}

function formatDuration(seconds: number): string {
  if (seconds >= 1) return (seconds).toFixed(2) + 's'
  if (seconds >= 0.001) return (seconds * 1000).toFixed(1) + 'ms'
  return (seconds * 1000000).toFixed(0) + 'μs'
}

function getLastValue(values: [number, string][] | undefined): string {
  if (!values || values.length === 0) return '-'
  const last = values[values.length - 1]
  return last[1]
}

function MiniSparkline({ data, color }: { data: [number, string][]; color: string }) {
  if (!data || data.length === 0) {
    return <div className="h-[40px] flex items-center justify-center text-xs text-muted-foreground">-</div>
  }
  const chartData = data.map(([t, v]) => ({ t, v: parseFloat(v) }))
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <XAxis dataKey="t" hide />
        <Tooltip
          labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleTimeString('zh-CN', { hour12: false })}
          contentStyle={{ fontSize: 10, borderRadius: 4 }}
        />
        <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface REDPanelProps {
  services: REDServiceMetrics[]
  loading: boolean
  error: string | null
  onRateClick?: () => void
  onErrorClick?: () => void
  onDurationClick?: () => void
}

export function REDPanel({ services, loading, error, onRateClick, onErrorClick, onDurationClick }: REDPanelProps) {
  const aggregatedRate = services.reduce((sum, s) => {
    const last = getLastValue(s.rate)
    return sum + (parseFloat(last) || 0)
  }, 0)

  const aggregatedErrorRate = services.reduce((sum, s) => {
    const last = getLastValue(s.errorRate)
    return sum + (parseFloat(last) || 0)
  }, 0)

  const aggregatedDurationP99 = services.reduce((max, s) => {
    const last = parseFloat(getLastValue(s.durationP99)) || 0
    return Math.max(max, last)
  }, 0)

  const allRateData: [number, string][] = services.length > 0 ? (services[0]?.rate || []) : []
  const allErrorData: [number, string][] = services.length > 0 ? (services[0]?.errorRate || []) : []
  const allDurationData: [number, string][] = services.length > 0 ? (services[0]?.durationP99 || []) : []

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <Card key={i}>
            <CardContent className="pt-3 pb-2">
              <div className="h-4 w-20 bg-muted/50 rounded animate-pulse mb-2" />
              <div className="h-[40px] bg-muted/30 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-3 pb-2 text-sm text-destructive">
          {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="cursor-pointer hover:border-blue-300 transition-colors" onClick={onRateClick}>
        <CardContent className="pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Span Rate</span>
            <Badge variant="secondary" className="text-[10px]">{services.length} 服务</Badge>
          </div>
          <div className="text-lg font-bold" style={{ color: COLORS.rate }}>
            {formatValue(aggregatedRate)}/s
          </div>
          <MiniSparkline data={allRateData} color={COLORS.rate} />
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-red-300 transition-colors" onClick={onErrorClick}>
        <CardContent className="pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Error Rate</span>
            {aggregatedErrorRate > 0 && <Badge variant="destructive" className="text-[10px]">!</Badge>}
          </div>
          <div className="text-lg font-bold" style={{ color: COLORS.error }}>
            {formatValue(aggregatedErrorRate)}/s
          </div>
          <MiniSparkline data={allErrorData} color={COLORS.error} />
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:border-purple-300 transition-colors" onClick={onDurationClick}>
        <CardContent className="pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Duration P99</span>
          </div>
          <div className="text-lg font-bold" style={{ color: COLORS.duration }}>
            {formatDuration(aggregatedDurationP99)}
          </div>
          <MiniSparkline data={allDurationData} color={COLORS.duration} />
        </CardContent>
      </Card>
    </div>
  )
}
