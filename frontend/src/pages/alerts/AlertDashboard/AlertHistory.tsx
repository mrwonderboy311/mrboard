import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertHistoryItem, SEVERITY_CONFIG } from '@/types/alert'

interface Props {
  clusterId: string
}

export function AlertHistory({ clusterId }: Props) {
  const [history, setHistory] = useState<AlertHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [severity, setSeverity] = useState('')
  const [status, setStatus] = useState('')

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (clusterId) params.set('clusterId', clusterId)
      if (severity) params.set('severity', severity)
      if (status) params.set('status', status)
      params.set('limit', '50')
      const res = await api<{ code: number; data: AlertHistoryItem[] }>(
        '/mrboard/alert/v1/history?' + params.toString()
      )
      setHistory(res.data || [])
    } catch { /* optional */ }
    finally { setLoading(false) }
  }, [clusterId, severity, status])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue placeholder="全部级别" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="" className="text-xs">全部级别</SelectItem>
            <SelectItem value="critical" className="text-xs">Critical</SelectItem>
            <SelectItem value="warning" className="text-xs">Warning</SelectItem>
            <SelectItem value="info" className="text-xs">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue placeholder="全部状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="" className="text-xs">全部状态</SelectItem>
            <SelectItem value="firing" className="text-xs">Firing</SelectItem>
            <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="text-center text-muted-foreground py-8">加载中...</div>
      ) : history.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">暂无告警历史</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2">规则</th>
                <th className="text-left px-3 py-2">级别</th>
                <th className="text-left px-3 py-2">状态</th>
                <th className="text-left px-3 py-2">集群</th>
                <th className="text-left px-3 py-2">开始时间</th>
                <th className="text-left px-3 py-2">结束时间</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => {
                const cfg = SEVERITY_CONFIG[h.severity] || SEVERITY_CONFIG.info
                return (
                  <tr key={h.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{h.rule_name}</td>
                    <td className={`px-3 py-2 font-bold ${cfg.color}`}>{cfg.label}</td>
                    <td className="px-3 py-2">
                      <Badge variant={h.status === 'firing' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {h.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">{h.cluster_id}</td>
                    <td className="px-3 py-2">{h.starts_at ? new Date(h.starts_at).toLocaleString('zh-CN') : '-'}</td>
                    <td className="px-3 py-2">{h.ends_at ? new Date(h.ends_at).toLocaleString('zh-CN') : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
