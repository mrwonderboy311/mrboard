import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { Cluster, ApiResponse } from '@/types'

interface ServiceMetric {
  service: string
  requestRate: number
  errorRate: number
  p99Latency: number
  health: 'healthy' | 'warning' | 'critical'
}

interface PrometheusResult {
  metric: Record<string, string>
  value: [number, string]
}

function formatRate(v: number): string {
  return v < 0.01 ? '<0.01' : v.toFixed(2)
}

function formatLatency(seconds: number): string {
  if (seconds < 0.001) return `${(seconds * 1000000).toFixed(0)}us`
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)}ms`
  return `${seconds.toFixed(2)}s`
}

export default function ServiceHealth() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null)
  const [services, setServices] = useState<ServiceMetric[]>([])
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  useEffect(() => {
    api<ApiResponse<Cluster[]>>('/mrboard/cluster/v1/List')
      .then(resp => {
        const list = resp.data || []
        setClusters(list)
        // Auto-select the first cluster with prometheus_url
        const stored = localStorage.getItem('clusterId')
        const match = list.find(c => c.cluster_id === stored && c.prometheus_url) || list.find(c => c.prometheus_url)
        if (match) setSelectedCluster(match)
      })
      .catch(err => toast.error((err as Error).message))
  }, [])

  const fetchHealth = useCallback(async () => {
    const clusterId = selectedCluster?.cluster_id
    if (!clusterId || !selectedCluster?.prometheus_url) return
    setLoading(true)
    try {
      const end = Math.floor(Date.now() / 1000)
      const start = end - 300 // last 5 minutes
      const step = 60

      type RawResponse = { code: number; data: { raw: string; query: string } }
      const parseRaw = (res: RawResponse): PrometheusResult[] => {
        if (res.code !== 0 || !res.data?.raw) return []
        try {
          const parsed = JSON.parse(res.data.raw)
          return parsed.data?.result || []
        } catch { return [] }
      }

      const [rateRes, , latencyRes] = await Promise.all([
        api<RawResponse>(
          `/mrboard/prometheus/v1/query_range?clusterId=${clusterId}&metric=request_rate&start=${start}&end=${end}&step=${step}`
        ).catch(() => ({ code: -1, data: { raw: '', query: '' } } as RawResponse)),
        api<RawResponse>(
          `/mrboard/prometheus/v1/query_range?clusterId=${clusterId}&metric=cpu&start=${start}&end=${end}&step=${step}`
        ).catch(() => ({ code: -1, data: { raw: '', query: '' } } as RawResponse)),
        api<RawResponse>(
          `/mrboard/prometheus/v1/query_range?clusterId=${clusterId}&metric=request_latency_p99&start=${start}&end=${end}&step=${step}`
        ).catch(() => ({ code: -1, data: { raw: '', query: '' } } as RawResponse)),
      ])

      // Build service map from request_rate results
      const serviceMap = new Map<string, ServiceMetric>()
      const rateResults = parseRaw(rateRes)
      for (const r of rateResults) {
        const svc = r.metric.service || r.metric.job || 'unknown'
        const rate = parseFloat(r.value?.[1] || '0')
        if (!serviceMap.has(svc)) {
          serviceMap.set(svc, { service: svc, requestRate: 0, errorRate: 0, p99Latency: 0, health: 'healthy' })
        }
        serviceMap.get(svc)!.requestRate += rate
      }

      // Add latency data
      const latencyResults = parseRaw(latencyRes)
      for (const r of latencyResults) {
        const svc = r.metric.service || r.metric.job || 'unknown'
        const latency = parseFloat(r.value?.[1] || '0')
        if (!serviceMap.has(svc)) {
          serviceMap.set(svc, { service: svc, requestRate: 0, errorRate: 0, p99Latency: 0, health: 'healthy' })
        }
        serviceMap.get(svc)!.p99Latency = latency
      }

      // Determine health status
      for (const svc of serviceMap.values()) {
        if (svc.errorRate > 5 || svc.p99Latency > 1) {
          svc.health = 'critical'
        } else if (svc.errorRate > 1 || svc.p99Latency > 0.5) {
          svc.health = 'warning'
        } else {
          svc.health = 'healthy'
        }
      }

      setServices([...serviceMap.values()].sort((a, b) => b.requestRate - a.requestRate))
      setLastRefresh(new Date())
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [selectedCluster])

  useEffect(() => {
    if (selectedCluster?.prometheus_url) fetchHealth()
  }, [selectedCluster, fetchHealth])

  const hasPrometheus = !!selectedCluster?.prometheus_url

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">服务健康概览</h1>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              更新于 {lastRefresh.toLocaleTimeString('zh-CN')}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading || !hasPrometheus}>
            <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Cluster selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">集群:</span>
            <Select value={selectedCluster?.cluster_id || ''} onValueChange={(v) => {
              const c = clusters.find(c => c.cluster_id === v) || null
              setSelectedCluster(c)
              setServices([])
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="选择集群" />
              </SelectTrigger>
              <SelectContent>
                {clusters.map(c => (
                  <SelectItem key={c.cluster_id} value={c.cluster_id}>{c.cluster_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!selectedCluster && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">请选择集群</CardContent></Card>
      )}

      {selectedCluster && !hasPrometheus && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">请先在集群配置中填写 Prometheus 地址</CardContent></Card>
      )}

      {hasPrometheus && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>服务</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-right">请求速率</TableHead>
                  <TableHead className="text-right">P99延迟</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {loading ? '加载中...' : '暂无服务数据'}
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map(svc => (
                    <TableRow key={svc.service}>
                      <TableCell className="font-medium">{svc.service}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={svc.health === 'healthy' ? 'default' : svc.health === 'warning' ? 'secondary' : 'destructive'}>
                          {svc.health === 'healthy' ? '健康' : svc.health === 'warning' ? '警告' : '异常'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatRate(svc.requestRate)} req/s</TableCell>
                      <TableCell className="text-right font-mono">{formatLatency(svc.p99Latency)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => window.open(`/log/trace?clusterId=${selectedCluster.cluster_id}&service=${svc.service}`, '_blank')}
                          >
                            <ExternalLink size={12} className="mr-1" />链路
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => window.open(`/log/loki`, '_blank')}
                          >
                            <ExternalLink size={12} className="mr-1" />日志
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
