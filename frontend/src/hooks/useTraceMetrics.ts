import { useState, useEffect, useCallback } from 'react'
import { fetchREDMetrics, type REDServiceMetrics } from '@/lib/api'

interface UseTraceMetricsOptions {
  clusterId: string
  service?: string
  timeRange: string
  refreshKey?: number
}

interface TraceMetricsState {
  services: REDServiceMetrics[]
  loading: boolean
  error: string | null
}

const TIME_RANGE_MAP: Record<string, number> = {
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '6h': 21600,
  '24h': 86400,
}

function getStepForDuration(duration: number): number {
  if (duration <= 300) return 15
  if (duration <= 900) return 30
  if (duration <= 3600) return 60
  if (duration <= 21600) return 300
  return 600
}

export function useTraceMetrics({ clusterId, service, timeRange, refreshKey = 0 }: UseTraceMetricsOptions) {
  const [state, setState] = useState<TraceMetricsState>({
    services: [],
    loading: false,
    error: null,
  })

  const fetchMetrics = useCallback(async () => {
    if (!clusterId) return
    setState(prev => ({ ...prev, loading: true, error: null }))

    const duration = TIME_RANGE_MAP[timeRange] || 3600
    const end = Math.floor(Date.now() / 1000)
    const start = end - duration
    const step = getStepForDuration(duration)

    try {
      const res = await fetchREDMetrics({
        clusterId,
        service,
        start: String(start),
        end: String(end),
        step: String(step),
      })
      if (res.code === 0) {
        setState({ services: res.data.services || [], loading: false, error: null })
      } else {
        setState({ services: [], loading: false, error: 'Failed to fetch metrics' })
      }
    } catch (err) {
      setState({ services: [], loading: false, error: (err as Error).message })
    }
  }, [clusterId, service, timeRange])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics, refreshKey])

  return { ...state, refetch: fetchMetrics }
}
