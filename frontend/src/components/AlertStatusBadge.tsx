import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import type { ActiveAlert } from '@/types/alert'

export function AlertStatusBadge() {
  const clusterId = localStorage.getItem('clusterId') || ''
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const navigate = useNavigate()

  const fetchAlerts = useCallback(async () => {
    if (!clusterId) return
    try {
      const res = await api<{ code: number; data: ActiveAlert[] }>(
        `/mrboard/alert/v1/active?clusterId=${clusterId}`
      )
      setAlerts(res.data || [])
    } catch { /* optional */ }
  }, [clusterId])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const criticalCount = alerts.filter(a => a.labels?.severity === 'critical').length
  const warningCount = alerts.filter(a => a.labels?.severity === 'warning').length

  if (alerts.length === 0) return null

  return (
    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/alerts')}>
      {criticalCount > 0 && (
        <Badge variant="destructive" className="text-[10px] animate-pulse">
          {criticalCount} critical
        </Badge>
      )}
      {warningCount > 0 && (
        <Badge variant="secondary" className="text-[10px]">
          {warningCount} warning
        </Badge>
      )}
    </div>
  )
}
