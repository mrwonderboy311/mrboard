import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import GrafanaEmbed from '@/components/GrafanaEmbed'
import { Button } from '@/components/ui/button'
import { BarChart3, Activity, Globe } from 'lucide-react'

const TABS = [
  { key: 'metrics', label: '指标', icon: BarChart3, path: '/a/grafana-metricsdrilldown-app/', params: { 'kiosk': '' } },
  { key: 'logs', label: '日志', icon: Activity, path: '/a/grafana-lokiexplore-app/', params: { 'kiosk': '' } },
  { key: 'traces', label: '链路', icon: Globe, path: '/a/grafana-exploretraces-app/', params: { 'kiosk': '' } },
]

function getDefaultTab(pathname: string): string {
  if (pathname.includes('/log/loki')) return 'logs'
  if (pathname.includes('/log/trace')) return 'traces'
  return 'metrics'
}

export default function GrafanaDashboard() {
  const location = useLocation()
  const defaultTab = useMemo(() => getDefaultTab(location.pathname), [location.pathname])
  const [tab, setTab] = useState(defaultTab)
  const current = TABS.find(t => t.key === tab) || TABS[0]

  return (
    <div className="space-y-3 animate-[fadeInUp_0.3s_ease-out]">
      <div className="flex items-center justify-between">
        <div>
          <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-primary/5 text-primary border border-primary/10 mb-3">
            Observability
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">监控中心</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <Button
              key={t.key}
              variant={tab === t.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab(t.key)}
              className="gap-1.5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            >
              <Icon size={14} />
              {t.label}
            </Button>
          )
        })}
      </div>
      <GrafanaEmbed
        path={current.path}
        params={current.params}
        title={`Grafana - ${current.label}`}
      />
    </div>
  )
}
