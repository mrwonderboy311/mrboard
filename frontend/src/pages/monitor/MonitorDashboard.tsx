import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Activity, Server, Box, Clock, Users, RefreshCw } from 'lucide-react'

interface ParsedMetrics {
  clustersTotal: number
  deploymentsTotal: Record<string, number>
  httpRequestsTotal: Record<string, number>
  httpRequestDuration: Record<string, number>
  activeSessions: number
  usersTotal: number
  raw: string
}

function parsePrometheusText(text: string): ParsedMetrics {
  const lines = text.split('\n')
  const result: ParsedMetrics = {
    clustersTotal: 0,
    deploymentsTotal: {},
    httpRequestsTotal: {},
    httpRequestDuration: {},
    activeSessions: 0,
    usersTotal: 0,
    raw: text,
  }

  for (const line of lines) {
    if (line.startsWith('#') || !line.trim()) continue
    const match = line.match(/^(\S+)\s+(.+)$/)
    if (!match) continue
    const [, name, value] = match
    const val = parseFloat(value)

    if (name === 'mrboard_clusters_total') result.clustersTotal = val
    else if (name.startsWith('mrboard_deployments_total')) {
      const cluster = name.match(/cluster="([^"]+)"/)?.[1] || 'unknown'
      result.deploymentsTotal[cluster] = val
    }
    else if (name.startsWith('mrboard_http_requests_total')) {
      const method = name.match(/method="([^"]+)"/)?.[1] || ''
      const path = name.match(/path="([^"]+)"/)?.[1] || ''
      const status = name.match(/status="([^"]+)"/)?.[1] || ''
      const key = `${method} ${path} [${status}]`
      result.httpRequestsTotal[key] = val
    }
    else if (name.startsWith('mrboard_http_request_duration_seconds_sum')) {
      const method = name.match(/method="([^"]+)"/)?.[1] || ''
      const path = name.match(/path="([^"]+)"/)?.[1] || ''
      result.httpRequestDuration[`${method} ${path}`] = val
    }
    else if (name === 'mrboard_active_sessions') result.activeSessions = val
    else if (name === 'mrboard_users_total') result.usersTotal = val
  }

  return result
}

function StatCard({ title, value, icon, description }: {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}

export default function MonitorDashboard() {
  const [metrics, setMetrics] = useState<ParsedMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/metrics', { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      setMetrics(parsePrometheusText(text))
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const topRequests = metrics
    ? Object.entries(metrics.httpRequestsTotal)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
    : []

  const topDurations = metrics
    ? Object.entries(metrics.httpRequestDuration)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
    : []

  const totalDeployments = metrics
    ? Object.values(metrics.deploymentsTotal).reduce((a, b) => a + b, 0)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">监控面板</h1>
          <p className="text-muted-foreground text-sm">
            Prometheus 指标概览
            {lastUpdate && <span className="ml-2">最后更新: {lastUpdate}</span>}
          </p>
        </div>
        <Button onClick={fetchMetrics} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">获取指标失败: {error}</p>
            <p className="text-muted-foreground text-xs mt-1">
              请确认后端 /metrics 端点已启用
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="集群数量"
          value={metrics?.clustersTotal ?? '-'}
          icon={<Server className="h-4 w-4 text-muted-foreground" />}
          description="已注册的 K8s 集群"
        />
        <StatCard
          title="Deployment 总数"
          value={totalDeployments}
          icon={<Box className="h-4 w-4 text-muted-foreground" />}
          description="所有集群的 Deployment"
        />
        <StatCard
          title="活跃会话"
          value={metrics?.activeSessions ?? '-'}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="当前登录用户数"
        />
        <StatCard
          title="注册用户"
          value={metrics?.usersTotal ?? '-'}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="系统中的用户总数"
        />
      </div>

      {/* Per-cluster deployments */}
      {metrics && Object.keys(metrics.deploymentsTotal).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              各集群 Deployment 数量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.deploymentsTotal)
                .sort(([, a], [, b]) => b - a)
                .map(([cluster, count]) => (
                  <div key={cluster} className="flex items-center justify-between">
                    <span className="text-sm">{cluster}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top API Requests */}
      {topRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              API 请求 Top 10
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topRequests.map(([key, count]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{key}</code>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Request Durations */}
      {topDurations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              请求耗时 Top 10 (秒)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topDurations.map(([key, duration]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{key}</code>
                  <Badge variant="outline">{duration.toFixed(3)}s</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw metrics link */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              原始 Prometheus 指标数据
            </p>
            <a
              href="/metrics"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              查看 /metrics
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
