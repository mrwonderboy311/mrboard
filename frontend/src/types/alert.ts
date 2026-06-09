// Alert types

export interface AlertRule {
  id: number
  cluster_id: string
  name: string
  expr: string
  source: 'prometheus' | 'loki' | 'mrboard'
  duration: string
  severity: 'critical' | 'warning' | 'info'
  labels: string
  annotations: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface ActiveAlert {
  labels: Record<string, string>
  annotations: Record<string, string>
  status: 'firing' | 'resolved'
  startsAt: string
  endsAt: string
  fingerprint: string
}

export interface AlertHistoryItem {
  id: number
  cluster_id: string
  rule_name: string
  severity: string
  status: string
  labels: string
  annotations: string
  starts_at: string
  ends_at: string
  notified: boolean
  created_at: string
}

export interface AlertChannel {
  id: number
  name: string
  type: 'webhook'
  url: string
  headers: Record<string, string>
  enabled: boolean
  created_at: string
}

export const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: 'text-destructive', label: 'CRITICAL' },
  warning:  { color: 'text-chart-3', label: 'WARNING' },
  info:     { color: 'text-chart-2', label: 'INFO' },
}
