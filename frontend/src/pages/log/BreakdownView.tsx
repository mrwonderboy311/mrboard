import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, ResponsiveContainer, XAxis } from 'recharts'
import type { REDServiceMetrics } from '@/lib/api'

function formatValue(val: number): string {
  if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + 'M'
  if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + 'K'
  if (Math.abs(val) >= 1) return val.toFixed(2)
  if (Math.abs(val) >= 0.001) return (val * 1000).toFixed(1) + 'm'
  return val.toFixed(4)
}

function formatDuration(seconds: number): string {
  if (seconds >= 1) return seconds.toFixed(2) + 's'
  if (seconds >= 0.001) return (seconds * 1000).toFixed(1) + 'ms'
  return (seconds * 1000000).toFixed(0) + 'μs'
}

function getLastValue(values: [number, string][] | undefined): number {
  if (!values || values.length === 0) return 0
  return parseFloat(values[values.length - 1][1]) || 0
}

function MiniSparkline({ data, color }: { data: [number, string][]; color: string }) {
  if (!data || data.length === 0) return null
  const chartData = data.map(([t, v]) => ({ t, v: parseFloat(v) }))
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData}>
        <XAxis dataKey="t" hide />
        <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface BreakdownViewProps {
  services: REDServiceMetrics[]
  loading: boolean
  onServiceClick?: (serviceName: string) => void
}

export function BreakdownView({ services, loading, onServiceClick }: BreakdownViewProps) {
  const sorted = useMemo(() => {
    return [...services].sort((a, b) => getLastValue(b.rate) - getLastValue(a.rate))
  }, [services])

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-3">
              <div className="h-4 w-24 bg-muted/50 rounded animate-pulse mb-3" />
              <div className="h-[32px] bg-muted/30 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4 text-center text-muted-foreground text-sm">
          暂无服务数据
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">{sorted.length} 个服务</div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map(svc => {
          const rate = getLastValue(svc.rate)
          const errorRate = getLastValue(svc.errorRate)
          const durationP99 = getLastValue(svc.durationP99)

          return (
            <Card
              key={svc.serviceName}
              className="cursor-pointer hover:border-blue-300 transition-all"
              onClick={() => onServiceClick?.(svc.serviceName)}
            >
              <CardContent className="pt-3 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium font-mono truncate flex-1" title={svc.serviceName}>
                    {svc.serviceName}
                  </div>
                  {errorRate > 0 && <Badge variant="destructive" className="text-[10px] ml-2">ERROR</Badge>}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Rate</div>
                    <div className="font-bold text-blue-600">{formatValue(rate)}/s</div>
                    <MiniSparkline data={svc.rate} color="#3b82f6" />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Error</div>
                    <div className="font-bold text-red-600">{formatValue(errorRate)}/s</div>
                    <MiniSparkline data={svc.errorRate} color="#ef4444" />
                  </div>
                  <div>
                    <div className="text-muted-foreground">P99</div>
                    <div className="font-bold text-purple-600">{formatDuration(durationP99)}</div>
                    <MiniSparkline data={svc.durationP99} color="#a855f7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
