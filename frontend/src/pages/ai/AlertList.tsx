import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain } from 'lucide-react'
import type { AnalysisHistory, ApiResponse } from '@/types'

interface AlertItem {
  fingerprint: string
  labels: Record<string, string>
  status: { state: string }
  startsAt: string
}

interface Props {
  clusterId: string
  histories: AnalysisHistory[]
  selectedId: number | null
  onSelect: (id: number) => void
  onSelectAlert: (alertName: string, severity: string, namespace: string, labels: Record<string, string>) => void
  loading: boolean
}

// Clean summary: strip JSON/markdown and extract meaningful text
function cleanSummary(raw: string): string {
  if (!raw) return ''
  // Extract alert name from JSON patterns first (before stripping)
  const nameMatch = raw.match(/(?:告警名称|alert_name|name)"?\s*[":=]+\s*"?([^",}\n]+)/)
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim()
    if (name.length > 2 && name.length < 50) return name
  }
  // Unescape
  let text = raw.replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\\"/g, '"')
  // Strip everything from first ``` or { onwards
  const cutAt = Math.min(
    text.includes('```') ? text.indexOf('```') : 999,
    text.includes('{') ? text.indexOf('{') : 999,
    text.includes('"告警') ? text.indexOf('"告警') : 999,
    text.includes('json ') ? text.indexOf('json ') : 999,
  )
  if (cutAt < 999) text = text.slice(0, cutAt).trim()
  // Clean up
  text = text.replace(/["{}]/g, '').replace(/\s+/g, ' ').trim()
  if (text.length > 3) return text.slice(0, 80)
  return '分析完成'
}

export default function AlertList({ clusterId, histories, selectedId, onSelect, onSelectAlert, loading }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [tab, setTab] = useState<'alerts' | 'history'>('alerts')
  const [days, setDays] = useState(1)

  // Filter histories by time range
  const filteredHistories = histories.filter(h => {
    if (days === 0) return true // "全部"
    const created = new Date(h.created_at || '')
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return created >= cutoff
  })

  useEffect(() => {
    if (!clusterId) return
    api<ApiResponse<AlertItem[]>>(`/mrboard/alert/v1/active?clusterId=${clusterId}`)
      .then(res => setAlerts(res.data || []))
      .catch(() => {})
  }, [clusterId])

  const severityColor = (s: string) => {
    if (s === 'critical') return 'bg-red-100 text-red-700 border-red-200'
    if (s === 'warning') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        <Button variant={tab === 'alerts' ? 'default' : 'outline'} size="sm" onClick={() => setTab('alerts')} className="flex-1">活跃告警</Button>
        <Button variant={tab === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setTab('history')} className="flex-1">历史分析</Button>
      </div>
      {tab === 'alerts' ? (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">暂无活跃告警</div>
          ) : [...alerts].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()).map((alert, i) => {
            const name = alert.labels?.alertname || 'Unknown'
            const severity = alert.labels?.severity || 'info'
            const ns = alert.labels?.namespace || ''
            const time = alert.startsAt ? new Date(alert.startsAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
            return (
              <Card key={i} className="cursor-pointer hover:border-primary/30 transition-all">
                <CardContent className="p-3" onClick={() => onSelectAlert(name, severity, ns, alert.labels || {})}>
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${severityColor(severity)}`}>{severity}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{ns}</span>
                        {time && <span className="text-[10px] text-muted-foreground">{time}</span>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" disabled={loading} className="h-6 px-2 shrink-0"><Brain size={12} /></Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1">
            {[{l:'1天',d:1},{l:'3天',d:3},{l:'7天',d:7},{l:'全部',d:0}].map(opt => (
              <button key={opt.d} onClick={() => setDays(opt.d)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${days === opt.d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {opt.l}
              </button>
            ))}
          </div>
          {filteredHistories.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-4">暂无历史分析</div>
          ) : filteredHistories.map(h => (
            <div
              key={h.id}
              data-testid={`history-${h.id}`}
              className={`cursor-pointer rounded-lg border bg-card shadow-sm p-3 hover:bg-accent/50 ${selectedId === h.id ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
              onClick={() => onSelect(h.id)}
            >
              <div className="flex items-start gap-2">
                <Badge variant="outline" className={`text-[10px] ${severityColor(h.severity)}`}>{h.severity}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{h.alert_name || '自由分析'}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{cleanSummary(h.summary)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
