import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { ApiResponse, Cluster } from '@/types'
import {
  Server, AlertTriangle, Activity, Rocket,
  FileText, BarChart3, Route, Bell,
} from 'lucide-react'

interface AlertHistoryItem {
  alertname: string
  severity: string
  status: string
  message: string
  fired_at: string
}

export default function HomePage() {
  const navigate = useNavigate()
  const [clusterCount, setClusterCount] = useState<number | null>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const clusterId = localStorage.getItem('clusterId') || ''

    // Fetch clusters
    api<ApiResponse<Cluster[]>>('/mrboard/cluster/v1/list')
      .then(resp => {
        const list = resp.data || []
        setClusterCount(list.length)
        setClusters(list)
      })
      .catch(() => {
        setClusterCount(0)
      })

    // Fetch recent alerts
    api<ApiResponse<AlertHistoryItem[]>>(`/mrboard/alert/v1/history?limit=5&clusterId=${clusterId}`)
      .then(resp => {
        setAlerts(resp.data || [])
      })
      .catch(() => {
        setAlerts([])
      })
      .finally(() => setLoading(false))
  }, [])

  const quickActions = [
    { label: '创建部署', icon: Rocket, path: '/deploy/list', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
    { label: '查看日志', icon: FileText, path: '/log/loki', color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
    { label: '监控面板', icon: BarChart3, path: '/monitor/dashboard', color: 'text-violet-600 bg-violet-50 hover:violet-100' },
    { label: '链路追踪', icon: Route, path: '/log/trace', color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
    { label: '告警管理', icon: Bell, path: '/alerts', color: 'text-rose-600 bg-rose-50 hover:bg-rose-100' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-sm text-muted-foreground">欢迎回来</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">集群总数</CardTitle>
            <Server size={18} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{clusterCount ?? '-'}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">运行中集群</CardTitle>
            <Activity size={18} className="text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {clusters.filter(c => c.status === 'Running' || c.status === 'running').length}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">近期告警</CardTitle>
            <AlertTriangle size={18} className="text-amber-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{alerts.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">告警中</CardTitle>
            <AlertTriangle size={18} className="text-rose-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {alerts.filter(a => a.status === 'firing').length}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors ${action.color}`}
              >
                <action.icon size={22} />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cluster status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">集群状态</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无集群数据</p>
            ) : (
              <div className="space-y-2">
                {clusters.slice(0, 6).map(c => {
                  const healthy = c.status === 'Running' || c.status === 'running'
                  return (
                    <div
                      key={c.cluster_id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => {
                        localStorage.setItem('clusterId', c.cluster_id)
                        navigate('/cluster/list')
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${healthy ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-sm font-medium truncate">{c.cluster_name || c.cluster_id}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${healthy ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {healthy ? '健康' : '异常'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">近期告警</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">暂无告警</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50">
                    <AlertTriangle
                      size={16}
                      className={`mt-0.5 shrink-0 ${alert.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{alert.alertname}</p>
                      {alert.message && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{alert.message}</p>
                      )}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${alert.status === 'firing' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                      {alert.status === 'firing' ? '触发' : '恢复'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
