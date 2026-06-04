export interface MetricSeries {
  metric: Record<string, string>
  values: [number, string][]
}

export interface QueryRangeResponse {
  resultType: string
  result: MetricSeries[]
}

export interface DrilldownLevel {
  type: 'cluster' | 'node' | 'pod'
  label: string
  filters: MetricFilters
}

export interface MetricFilters {
  namespace?: string
  node?: string
  pod?: string
  service?: string
}

export interface TimeRange {
  start: number
  end: number
  step: number
  label?: string
}

export interface DrilldownState {
  levels: DrilldownLevel[]
  currentFilters: MetricFilters
  timeRange: TimeRange
  autoRefresh: boolean
}

export type MetricName = 'cpu' | 'memory' | 'network_receive' | 'network_transmit' | 'request_rate' | 'request_latency_p99'

export const METRIC_CONFIG: Record<MetricName, { title: string; unit: string; color: string }> = {
  cpu: { title: 'CPU 使用率', unit: 'cores', color: '#3b82f6' },
  memory: { title: '内存用量', unit: 'bytes', color: '#22c55e' },
  network_receive: { title: '网络接收', unit: 'bytes/s', color: '#a855f7' },
  network_transmit: { title: '网络发送', unit: 'bytes/s', color: '#f97316' },
  request_rate: { title: '请求速率', unit: 'req/s', color: '#06b6d4' },
  request_latency_p99: { title: 'P99 延迟', unit: 'seconds', color: '#ef4444' },
}
