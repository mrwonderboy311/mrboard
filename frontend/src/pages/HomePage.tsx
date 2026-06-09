import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import type { ApiResponse, Cluster } from '@/types'
import {
  Server, AlertTriangle, Activity, Rocket,
  FileText, BarChart3, Route, Bell,
  ChevronRight, TrendingUp, ArrowUpRight,
} from 'lucide-react'

interface ActiveAlert {
  fingerprint: string
  labels: Record<string, string>
  status: { state: string }
  startsAt: string
}

export default function HomePage() {
  const navigate = useNavigate()
  const [clusterCount, setClusterCount] = useState<number | null>(null)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const clusterId = localStorage.getItem('clusterId') || ''
    api<ApiResponse<Cluster[]>>('/mrboard/cluster/v1/List')
      .then(resp => { const l = resp.data || []; setClusterCount(l.length); setClusters(l) })
      .catch(() => setClusterCount(0))
    api<ApiResponse<ActiveAlert[]>>(`/mrboard/alert/v1/active?clusterId=${clusterId}`)
      .then(resp => setAlerts(resp.data || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false))
  }, [])

  const quickActions = [
    { label: '创建部署', icon: Rocket, path: '/deploy/list', color: 'text-blue-500' },
    { label: '查看日志', icon: FileText, path: '/log/loki', color: 'text-emerald-500' },
    { label: '监控面板', icon: BarChart3, path: '/monitor/dashboard', color: 'text-violet-500' },
    { label: '链路追踪', icon: Route, path: '/log/trace', color: 'text-amber-500' },
    { label: '告警管理', icon: Bell, path: '/alerts', color: 'text-rose-500' },
  ]

  const stats = [
    { label: '集群总数', value: clusterCount, icon: Server, color: 'text-primary', bgColor: 'bg-primary/5', borderColor: 'border-primary/10' },
    { label: '运行中', value: clusters.filter(c => c.status === 'Running' || c.status === 'running' || String(c.status) === '1').length, icon: Activity, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', borderColor: 'border-emerald-200 dark:border-emerald-800' },
    { label: '活跃告警', value: alerts.length, icon: TrendingUp, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800' },
    { label: '严重告警', value: alerts.filter(a => a.labels?.severity === 'critical').length, icon: AlertTriangle, color: 'text-rose-600', bgColor: 'bg-rose-50 dark:bg-rose-950/30', borderColor: 'border-rose-200 dark:border-rose-800' },
  ]

  return (
    <div className="space-y-10">
      {/* Header with eyebrow tag */}
      <div>
        <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-primary/5 text-primary border border-primary/10 mb-3">
          Overview
        </span>
        <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
        <p className="text-sm text-muted-foreground mt-2">集群概览与快捷操作</p>
      </div>

      {/* Stats — Double-Bezel style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={stat.label} className={`rounded-2xl p-[3px] ${stat.borderColor} bg-gradient-to-b from-transparent to-muted/20`}
            style={{ animationDelay: `${i * 80}ms` }}>
            <Card className="border-0 shadow-none rounded-[calc(2rem-3px)]">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">{stat.label}</span>
                  <div className={`p-2 rounded-xl ${stat.bgColor} border ${stat.borderColor}`}>
                    <stat.icon size={15} className={stat.color} />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-9 w-14 rounded-lg" />
                ) : (
                  <div className="text-4xl font-bold font-mono tabular-nums tracking-tighter">
                    {stat.value ?? '-'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Quick actions — Magnetic button hover */}
      <div>
        <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-muted text-muted-foreground mb-3">
          Quick Actions
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {quickActions.map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="group relative flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            >
              <div className="p-2.5 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110 group-hover:rotate-[-4deg]">
                <action.icon size={18} className={`${action.color} transition-transform duration-300`} />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
              <div className="ml-auto w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5">
                <ArrowUpRight size={13} className="text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clusters */}
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">集群状态</h3>
                <Badge variant="secondary" className="text-[10px] rounded-full">{clusters.length}</Badge>
              </div>
              <button onClick={() => navigate('/cluster/list')} className="text-xs text-primary hover:underline flex items-center gap-1">
                查看全部 <ChevronRight size={12} />
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : clusters.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">暂无集群数据</div>
            ) : (
              <div className="space-y-2">
                {clusters.slice(0, 6).map(c => {
                  const healthy = c.status === 'Running' || c.status === 'running' || String(c.status) === '1'
                  return (
                    <div
                      key={c.cluster_id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-muted/20 hover:bg-muted/50 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer group border border-transparent hover:border-border/40"
                      onClick={() => { localStorage.setItem('clusterId', c.cluster_id); navigate('/cluster/list') }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${healthy ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]'}`} />
                        <span className="text-sm font-medium truncate">{c.cluster_name || c.cluster_id}</span>
                      </div>
                      <Badge variant={healthy ? 'default' : 'destructive'} className="text-[10px] rounded-full">
                        {healthy ? '健康' : '异常'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">近期告警</h3>
                <Badge variant={alerts.some(a => a.labels?.severity === 'critical') ? 'destructive' : 'secondary'} className="text-[10px] rounded-full">
                  {alerts.length}
                </Badge>
              </div>
              <button onClick={() => navigate('/alerts')} className="text-xs text-primary hover:underline flex items-center gap-1">
                查看全部 <ChevronRight size={12} />
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">暂无告警</div>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 6).map((alert, i) => {
                  const name = alert.labels?.alertname || 'Unknown'
                  const severity = alert.labels?.severity || 'warning'
                  const ns = alert.labels?.namespace || ''
                  return (
                    <div key={alert.fingerprint || i}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/20 hover:bg-muted/50 transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer border border-transparent hover:border-border/40"
                      onClick={() => navigate('/ai/analysis')}>
                      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${severity === 'critical' ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
                        <AlertTriangle size={14} className={severity === 'critical' ? 'text-rose-500' : 'text-amber-500'} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {ns && <p className="text-xs text-muted-foreground truncate mt-0.5">{ns}</p>}
                      </div>
                      <Badge variant={severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px] shrink-0 rounded-full">
                        {severity}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
