import { useState, useCallback, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import type { QueryRangeResponse, MetricName, MetricFilters, TimeRange } from '@/types/prometheus'

export function usePrometheusQuery(
  clusterId: string | null,
  metric: MetricName,
  filters: MetricFilters,
  timeRange: TimeRange
) {
  const [data, setData] = useState<QueryRangeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!clusterId) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        clusterId,
        metric,
        start: String(timeRange.start),
        end: String(timeRange.end),
        step: String(timeRange.step),
      })
      if (filters.namespace) params.set('namespace', filters.namespace)
      if (filters.node) params.set('node', filters.node)
      if (filters.pod) params.set('pod', filters.pod)
      if (filters.service) params.set('service', filters.service)
      const res = await api<{ code: number; msg: string; data: { raw: string; query: string } }>(
        `/mrboard/prometheus/v1/query_range?${params}`
      )
      if (res.code === 0 && res.data?.raw) {
        const parsed = JSON.parse(res.data.raw)
        setData(parsed.data || parsed)
      } else {
        setError(res.msg || '查询失败')
      }
    } catch (e: any) {
      setError(e.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }, [clusterId, metric, filters.namespace, filters.node, filters.pod, filters.service, timeRange.start, timeRange.end, timeRange.step])

  useEffect(() => {
    fetchData()
    return () => abortRef.current?.abort()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function useLabelValues(clusterId: string | null, label: string, match?: string) {
  const [values, setValues] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clusterId) return
    setLoading(true)
    const params = new URLSearchParams({ clusterId, label })
    if (match) params.set('match', match)
    api<{ code: number; data: string[] }>(`/mrboard/prometheus/v1/label_values?${params}`)
      .then(res => {
        if (res.code === 0 && res.data?.length > 0) {
          try {
            const parsed = JSON.parse(res.data[0])
            setValues(parsed.data || [])
          } catch {
            setValues(res.data || [])
          }
        }
      })
      .catch(() => setValues([]))
      .finally(() => setLoading(false))
  }, [clusterId, label, match])

  return { values, loading }
}
