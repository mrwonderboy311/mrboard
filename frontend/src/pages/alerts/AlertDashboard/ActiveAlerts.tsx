import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import type { ActiveAlert } from '@/types/alert'
import { SEVERITY_CONFIG } from '@/types/alert'

interface Props {
  clusterId: string
}

export function ActiveAlerts({ clusterId }: Props) {
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAlerts = useCallback(async () => {
    if (!clusterId) return
    setLoading(true)
    try {
      const res = await api<{ code: number; data: ActiveAlert[] }>(
        `/mrboard/alert/v1/active?clusterId=${clusterId}`
      )
      setAlerts(res.data || [])
    } catch { /* optional */ }
    finally { setLoading(false) }
  }, [clusterId])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  if (!clusterId) {
    return <div className="text-center text-muted-foreground py-8">请先选择集群</div>
  }

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">加载中...</div>
  }

  if (alerts.length === 0) {
    return <div className="text-center text-muted-foreground py-8">暂无活跃告警</div>
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const severity = alert.labels?.severity || 'info'
        const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info
        return (
          <div key={alert.fingerprint || i} className="border rounded-lg p-3 hover:bg-muted/30">
            <div className="flex items-center gap-2">
              <Badge variant={severity === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">
                {cfg.label}
              </Badge>
              <span className="font-medium text-sm">{alert.labels?.alertname || 'Unknown'}</span>
              {alert.labels?.namespace && (
                <span className="text-xs text-muted-foreground">{alert.labels.namespace}</span>
              )}
            </div>
            {alert.annotations?.summary && (
              <p className="text-xs text-muted-foreground mt-1">{alert.annotations.summary}</p>
            )}
            <div className="text-[10px] text-muted-foreground mt-1">
              开始: {alert.startsAt ? new Date(alert.startsAt).toLocaleString('zh-CN') : '-'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
