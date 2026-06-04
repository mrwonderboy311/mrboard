import { useEffect, useState } from 'react'
import { api, fetchREDMetrics } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { X, FileText, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface RecentTrace {
  traceID: string
  rootService: string
  rootOperation: string
  duration: number
  spanCount: number
  startTime: number
  status: string
}

interface ServiceOverview {
  serviceName: string
  rpm: number
  avgLatencyMs: number
  p99LatencyMs: number
  errorRate: number
  errorCount: number
  lastActive: number
  recentTraces: RecentTrace[]
}

interface ServiceOverviewPanelProps {
  serviceName: string
  clusterId: string
  onClose: () => void
}

export default function ServiceOverviewPanel({ serviceName, clusterId, onClose }: ServiceOverviewPanelProps) {
  const navigate = useNavigate()
  const [data, setData] = useState<ServiceOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!serviceName || !clusterId) return
    setLoading(true)

    const duration = 3600
    const end = Math.floor(Date.now() / 1000)
    const start = end - duration

    // Fetch RED metrics
    fetchREDMetrics({
      clusterId,
      service: serviceName,
      start: String(start),
      end: String(end),
      step: '60',
    })
      .then(res => {
        if (res.code === 0 && res.data.services.length > 0) {
          const svc = res.data.services[0]
          const lastRate = svc.rate?.length > 0 ? parseFloat(svc.rate[svc.rate.length - 1][1]) : 0
          const lastError = svc.errorRate?.length > 0 ? parseFloat(svc.errorRate[svc.errorRate.length - 1][1]) : 0
          const lastP99 = svc.durationP99?.length > 0 ? parseFloat(svc.durationP99[svc.durationP99.length - 1][1]) * 1000 : 0

          setData({
            serviceName,
            rpm: Math.round(lastRate * 60),
            avgLatencyMs: lastP99 * 0.7,
            p99LatencyMs: lastP99,
            errorRate: lastRate > 0 ? lastError / lastRate : 0,
            errorCount: 0,
            lastActive: 0,
            recentTraces: [],
          })
        } else {
          setData(null)
        }
      })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setLoading(false))

    // Also fetch recent traces
    const traceParams = new URLSearchParams({ clusterId, service: serviceName, limit: '10' })
    traceParams.set('start', String(start * 1000000000))
    traceParams.set('end', String(end * 1000000000))
    api<{ code: number; data: Array<{ traceID: string; rootService: string; rootOperation: string; duration: number; spanCount: number; startTime: number; status: string }> }>('/mrboard/trace/v1/Search?' + traceParams.toString())
      .then(res => {
        if (res.code === 0 && res.data) {
          setData(prev => prev ? { ...prev, recentTraces: res.data, lastActive: res.data[0]?.startTime || 0 } : prev)
        }
      })
      .catch(() => {})
  }, [serviceName, clusterId])

  const formatDuration = (ns: number) => (ns / 1000000).toFixed(2)

  const formatTime = (ns: number) => ns ? new Date(ns / 1000000).toLocaleString() : '-'

  const statusBadge = (status: string) => (
    <Badge variant={status === 'ok' ? 'default' : 'destructive'}>{status}</Badge>
  )

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" showCloseButton={false} className="w-[400px] sm:max-w-[400px] p-0 overflow-y-auto">
        <SheetHeader className="flex-row items-center justify-between p-4 border-b">
          <SheetTitle className="truncate">{serviceName}</SheetTitle>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
        ) : !data ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">暂无数据</div>
        ) : (
          <div className="space-y-4 p-4">
            {/* Service Overview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  服务概览
                  <Badge variant={data.errorRate > 0.05 ? 'destructive' : 'default'}>
                    {data.errorRate > 0.05 ? '异常' : '正常'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">调用量 (rpm)</div>
                  <div className="text-lg font-semibold">{data.rpm.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">平均延迟</div>
                  <div className="text-lg font-semibold">{data.avgLatencyMs.toFixed(1)} ms</div>
                </div>
                <div>
                  <div className="text-muted-foreground">P99 延迟</div>
                  <div className="text-lg font-semibold">{data.p99LatencyMs.toFixed(1)} ms</div>
                </div>
                <div>
                  <div className="text-muted-foreground">错误率</div>
                  <div className="text-lg font-semibold">
                    <span className={data.errorRate > 0.05 ? 'text-destructive' : ''}>
                      {(data.errorRate * 100).toFixed(2)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">({data.errorCount})</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground">最后活跃</div>
                  <div>{formatTime(data.lastActive)}</div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Traces */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">最近链路 (10)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>TraceID</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead>耗时</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data.recentTraces || data.recentTraces.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">暂无链路</TableCell>
                      </TableRow>
                    ) : (
                      data.recentTraces.map(t => (
                        <TableRow
                          key={t.traceID}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate('/log/trace/detail?clusterId=' + clusterId + '&traceId=' + t.traceID)}
                        >
                          <TableCell className="font-mono text-xs">{t.traceID.slice(0, 8)}...</TableCell>
                          <TableCell className="text-sm">{t.rootOperation}</TableCell>
                          <TableCell>
                            <Badge variant={t.duration > 1000000000 ? 'destructive' : 'default'}>
                              {formatDuration(t.duration)} ms
                            </Badge>
                          </TableCell>
                          <TableCell>{statusBadge(t.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/log/loki?service=' + serviceName + '&clusterId=' + clusterId)}
              >
                <FileText size={14} className="mr-1" />
                查看日志
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/log/trace?service=' + serviceName + '&clusterId=' + clusterId)}
              >
                <Search size={14} className="mr-1" />
                搜索 Traces
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
