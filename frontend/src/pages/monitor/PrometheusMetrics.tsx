import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ChevronDown, ChevronLeft, Pause, Play, RefreshCw, Search, X, Maximize2,
  Filter, Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { Cluster, ApiResponse } from '@/types'

// --- Types ---
interface MetricSeries {
  metric: Record<string, string>
  values: [number, string][]
}

interface QueryRangeResult {
  resultType: string
  result: MetricSeries[]
}

interface MetricCard {
  name: string
  series: MetricSeries[]
  loading: boolean
  error: string | null
  lastValue: string
  type: string // counter, gauge, histogram, summary
}

interface LabelBreakdown {
  label: string
  values: { value: string; count: number }[]
}

// --- Constants ---
const TIME_RANGES = [
  { label: '5m', value: '5m', duration: 300 },
  { label: '15m', value: '15m', duration: 900 },
  { label: '1h', value: '1h', duration: 3600 },
  { label: '3h', value: '3h', duration: 10800 },
  { label: '6h', value: '6h', duration: 21600 },
  { label: '24h', value: '24h', duration: 86400 },
]

const COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ef4444', '#06b6d4', '#eab308', '#ec4899', '#14b8a6', '#8b5cf6']

function getStepForDuration(duration: number): number {
  if (duration <= 300) return 15
  if (duration <= 900) return 30
  if (duration <= 3600) return 60
  if (duration <= 10800) return 120
  if (duration <= 21600) return 300
  return 600
}

function formatValue(val: number): string {
  if (Math.abs(val) >= 1e9) return (val / 1e9).toFixed(2) + 'B'
  if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(2) + 'M'
  if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(2) + 'K'
  if (Math.abs(val) >= 1) return val.toFixed(2)
  if (Math.abs(val) >= 0.001) return (val * 1000).toFixed(1) + 'm'
  return val.toFixed(6)
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// --- Sparkline mini chart ---
function Sparkline({ data, color = '#3b82f6', height = 36 }: { data: [number, string][]; color?: string; height?: number }) {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">-</div>
  const chartData = data.map(([t, v]) => ({ t, v: parseFloat(v) }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// --- Full time series chart ---
function MetricTimeSeriesChart({ series, height = 300 }: { series: MetricSeries[]; height?: number }) {
  if (!series || series.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">暂无数据</div>
  }

  const allTs = new Set<number>()
  series.forEach(s => s.values.forEach(([t]) => allTs.add(t)))
  const timestamps = Array.from(allTs).sort((a, b) => a - b)

  const chartData = timestamps.map(t => {
    const point: Record<string, number> = { t }
    series.forEach((s, i) => {
      const key = `s${i}`
      const val = s.values.find(([vt]) => vt === t)
      point[key] = val ? parseFloat(val[1]) : 0
    })
    return point
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="t"
          tickFormatter={formatTimestamp}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={formatValue}
        />
        <Tooltip
          labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleString('zh-CN', { hour12: false })}
          contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0' }}
        />
        {series.map((s, i) => {
          const label = Object.entries(s.metric).filter(([k]) => k !== '__name__').map(([, v]) => v).join('/') || `s${i}`
          return (
            <Line
              key={i}
              type="monotone"
              dataKey={`s${i}`}
              stroke={COLORS[i % COLORS.length]}
              dot={false}
              strokeWidth={1.5}
              name={label}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}

// --- Main component ---
export default function PrometheusMetrics() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [clusterId, setClusterId] = useState(localStorage.getItem('clusterId') || '')
  const [timeRange, setTimeRange] = useState('1h')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // View mode: 'browse' | 'detail'
  const [viewMode, setViewMode] = useState<'browse' | 'detail'>('browse')

  // Browse mode state
  const [allMetricNames, setAllMetricNames] = useState<string[]>([])
  const [metricSearch, setMetricSearch] = useState('')
  const [showCount, setShowCount] = useState(20)
  const [metricCards, setMetricCards] = useState<Map<string, MetricCard>>(new Map())
  const [sortBy, setSortBy] = useState<'name' | 'value'>('name')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Sidebar: label filters
  const [labelNames, setLabelNames] = useState<string[]>([])
  const [selectedLabel, setSelectedLabel] = useState('')
  const [labelValues, setLabelValues] = useState<string[]>([])
  const [selectedLabelValue, setSelectedLabelValue] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Detail mode state
  const [detailMetric, setDetailMetric] = useState('')
  const [detailSeries, setDetailSeries] = useState<MetricSeries[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailBreakdown, setDetailBreakdown] = useState<LabelBreakdown[]>([])
  const [detailPromQL, setDetailPromQL] = useState('')

  // PromQL custom query (browse mode)
  const [customPromQL, setCustomPromQL] = useState('')
  const [customResults, setCustomResults] = useState<MetricSeries[]>([])
  const [customLoading, setCustomLoading] = useState(false)

  // Fetch clusters
  useEffect(() => {
    api<ApiResponse<Cluster[]>>('/mrboard/cluster/v1/List')
      .then(resp => {
        setClusters(resp.data || [])
        const defaultId = localStorage.getItem('clusterId')
        if (defaultId) setClusterId(defaultId)
      })
      .catch(() => {})
  }, [])

  // Fetch all metric names
  useEffect(() => {
    if (!clusterId) return
    api<{ code: number; data: string[] }>('/mrboard/prometheus/v1/label_values?clusterId=' + clusterId + '&label=__name__')
      .then(res => {
        const names = (res.data || [])
          .filter(n => !n.startsWith('go_') && !n.startsWith('scrape_') && !n.startsWith('prometheus_') && !n.startsWith('process_'))
          .sort()
        setAllMetricNames(names)
      })
      .catch(() => {})
  }, [clusterId])

  // Fetch label names for sidebar
  useEffect(() => {
    if (!clusterId) return
    api<{ code: number; data: string[] }>('/mrboard/prometheus/v1/label_values?clusterId=' + clusterId + '&label=__name__')
      .then(() => {
        // Use common labels for sidebar
        setLabelNames(['namespace', 'pod', 'container', 'service', 'node', 'job', 'instance', 'endpoint'])
      })
      .catch(() => {})
  }, [clusterId])

  // Fetch label values when label selected
  useEffect(() => {
    if (!clusterId || !selectedLabel) { setLabelValues([]); return }
    api<{ code: number; data: string[] }>('/mrboard/prometheus/v1/label_values?clusterId=' + clusterId + '&label=' + selectedLabel)
      .then(res => setLabelValues(res.data || []))
      .catch(() => {})
  }, [clusterId, selectedLabel])

  // Compute time window
  const getTimeWindow = useCallback(() => {
    const r = TIME_RANGES.find(t => t.value === timeRange)
    const duration = r?.duration || 3600
    const end = Math.floor(Date.now() / 1000)
    const start = end - duration
    const step = getStepForDuration(duration)
    return { start, end, step }
  }, [timeRange])

  // Fetch metric data for a single metric
  const fetchMetricData = useCallback(async (metricName: string) => {
    if (!clusterId) return
    const { start, end, step } = getTimeWindow()
    try {
      const params = new URLSearchParams({
        clusterId,
        metric: metricName,
        start: String(start),
        end: String(end),
        step: String(step),
      })
      if (selectedLabel && selectedLabelValue) {
        params.set('namespace', selectedLabelValue)
      }
      const res = await api<{ code: number; data: { raw: string } }>('/mrboard/prometheus/v1/query_range?' + params.toString())
      if (res.code === 0 && res.data?.raw) {
        const parsed = JSON.parse(res.data.raw)
        const result: QueryRangeResult = parsed.data || { resultType: '', result: [] }
        const series = result.result || []
        let lastVal = '-'
        if (series.length > 0 && series[0].values.length > 0) {
          const last = series[0].values[series[0].values.length - 1]
          lastVal = formatValue(parseFloat(last[1]))
        }
        setMetricCards(prev => {
          const next = new Map(prev)
          const existing = next.get(metricName)
          next.set(metricName, { ...existing!, series, loading: false, error: null, lastValue: lastVal })
          return next
        })
      }
    } catch (err) {
      setMetricCards(prev => {
        const next = new Map(prev)
        const existing = next.get(metricName)
        if (existing) next.set(metricName, { ...existing, loading: false, error: (err as Error).message })
        return next
      })
    }
  }, [clusterId, getTimeWindow, selectedLabel, selectedLabelValue])

  // Fetch visible metrics
  useEffect(() => {
    if (!clusterId || allMetricNames.length === 0) return

    const filtered = getFilteredMetrics()
    const visible = filtered.slice(0, showCount)

    setMetricCards(prev => {
      const next = new Map(prev)
      for (const name of visible) {
        if (!next.has(name)) {
          next.set(name, { name, series: [], loading: true, error: null, lastValue: '-', type: detectMetricType(name) })
        }
      }
      return next
    })

    visible.forEach(name => {
      setMetricCards(prev => {
        const next = new Map(prev)
        const existing = next.get(name)
        if (existing) next.set(name, { ...existing, loading: true })
        return next
      })
      fetchMetricData(name)
    })
  }, [clusterId, allMetricNames, metricSearch, showCount, refreshKey, selectedLabel, selectedLabelValue]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => setRefreshKey(k => k + 1), 30000)
    }
    return () => {
      if (refreshTimerRef.current) { clearInterval(refreshTimerRef.current); refreshTimerRef.current = null }
    }
  }, [autoRefresh])

  // Detect metric type from name
  function detectMetricType(name: string): string {
    if (name.endsWith('_total') || name.endsWith('_count') || name.endsWith('_sum')) return 'counter'
    if (name.endsWith('_bucket')) return 'histogram'
    if (name.endsWith('_created')) return 'counter'
    if (name.includes('_seconds') || name.includes('_duration')) return 'gauge'
    return 'gauge'
  }

  // Get filtered metrics
  function getFilteredMetrics(): string[] {
    let filtered = allMetricNames
    if (metricSearch) {
      const search = metricSearch.toLowerCase()
      filtered = filtered.filter(n => n.toLowerCase().includes(search))
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => detectMetricType(n) === typeFilter)
    }
    if (sortBy === 'name') {
      filtered = [...filtered].sort()
    }
    return filtered
  }

  // Drill-down into a metric
  const handleDrilldown = async (metricName: string) => {
    setViewMode('detail')
    setDetailMetric(metricName)
    setDetailLoading(true)
    setDetailBreakdown([])

    const { start, end, step } = getTimeWindow()
    const basePromQL = `{__name__="${metricName}"}`
    setDetailPromQL(basePromQL)

    try {
      const params = new URLSearchParams({
        clusterId,
        metric: metricName,
        start: String(start),
        end: String(end),
        step: String(step),
      })
      if (selectedLabel && selectedLabelValue) {
        params.set('namespace', selectedLabelValue)
      }
      const res = await api<{ code: number; data: { raw: string } }>('/mrboard/prometheus/v1/query_range?' + params.toString())
      if (res.code === 0 && res.data?.raw) {
        const parsed = JSON.parse(res.data.raw)
        const result: QueryRangeResult = parsed.data || { resultType: '', result: [] }
        setDetailSeries(result.result || [])

        // Build label breakdown
        const breakdown = buildBreakdown(result.result || [])
        setDetailBreakdown(breakdown)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }

  // Build label breakdown from series
  function buildBreakdown(series: MetricSeries[]): LabelBreakdown[] {
    const labelMap = new Map<string, Map<string, number>>()
    for (const s of series) {
      for (const [k, v] of Object.entries(s.metric)) {
        if (k === '__name__') continue
        if (!labelMap.has(k)) labelMap.set(k, new Map())
        const valMap = labelMap.get(k)!
        valMap.set(v, (valMap.get(v) || 0) + 1)
      }
    }
    const breakdown: LabelBreakdown[] = []
    for (const [label, valMap] of labelMap) {
      if (valMap.size > 1 && valMap.size <= 20) {
        breakdown.push({
          label,
          values: Array.from(valMap.entries()).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
        })
      }
    }
    return breakdown.sort((a, b) => b.values.length - a.values.length)
  }

  // Custom PromQL query
  const handleCustomQuery = async () => {
    if (!customPromQL.trim()) return
    setCustomLoading(true)
    try {
      const { start, end, step } = getTimeWindow()
      const params = new URLSearchParams({
        clusterId,
        metric: customPromQL.trim(),
        start: String(start),
        end: String(end),
        step: String(step),
      })
      const res = await api<{ code: number; data: { raw: string } }>('/mrboard/prometheus/v1/query_range?' + params.toString())
      if (res.code === 0 && res.data?.raw) {
        const parsed = JSON.parse(res.data.raw)
        const result: QueryRangeResult = parsed.data || { resultType: '', result: [] }
        setCustomResults(result.result || [])
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setCustomLoading(false)
    }
  }

  const filteredMetrics = getFilteredMetrics()
  const visibleNames = filteredMetrics.slice(0, showCount)
  const hasMore = filteredMetrics.length > showCount

  // Type counts for filter badges
  const typeCounts = { all: allMetricNames.length, counter: 0, gauge: 0, histogram: 0 }
  for (const n of allMetricNames) {
    const t = detectMetricType(n)
    if (t in typeCounts) typeCounts[t as keyof typeof typeCounts]++
  }

  // ===== DETAIL VIEW =====
  if (viewMode === 'detail') {
    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setViewMode('browse')} className="gap-1">
            <ChevronLeft size={16} />返回
          </Button>
          <h1 className="text-lg font-bold font-mono">{detailMetric}</h1>
          <Badge variant="outline" className="text-xs">{detectMetricType(detailMetric)}</Badge>
          <div className="flex-1" />
          <Select value={timeRange} onValueChange={(v: string | null) => { if (v) setTimeRange(v) }}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="h-8 text-xs">
            {autoRefresh ? <><Pause size={12} className="mr-1" />暂停</> : <><Play size={12} className="mr-1" />实时</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setRefreshKey(k => k + 1); handleDrilldown(detailMetric) }} className="h-8">
            <RefreshCw size={12} />
          </Button>
        </div>

        {/* PromQL editor */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-orange-500 font-mono shrink-0">PromQL</span>
              <Input
                value={detailPromQL}
                onChange={e => setDetailPromQL(e.target.value)}
                className="h-8 font-mono text-sm"
              />
              <Button size="sm" onClick={() => {
                // Re-query with custom PromQL
                const { start, end, step } = getTimeWindow()
                const params = new URLSearchParams({ clusterId, metric: detailPromQL, start: String(start), end: String(end), step: String(step) })
                setDetailLoading(true)
                api<{ code: number; data: { raw: string } }>('/mrboard/prometheus/v1/query_range?' + params.toString())
                  .then(res => {
                    if (res.code === 0 && res.data?.raw) {
                      const parsed = JSON.parse(res.data.raw)
                      const result: QueryRangeResult = parsed.data || { resultType: '', result: [] }
                      setDetailSeries(result.result || [])
                      setDetailBreakdown(buildBreakdown(result.result || []))
                    }
                  })
                  .catch(err => toast.error((err as Error).message))
                  .finally(() => setDetailLoading(false))
              }} className="h-8 px-3">查询</Button>
            </div>
          </CardContent>
        </Card>

        {/* Main chart */}
        <Card>
          <CardContent className="pt-4">
            {detailLoading ? (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                <RefreshCw size={16} className="animate-spin mr-2" />加载中...
              </div>
            ) : (
              <>
                <MetricTimeSeriesChart series={detailSeries} height={350} />
                <div className="mt-2 text-xs text-muted-foreground">
                  {detailSeries.length} 条序列
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Label breakdown */}
        {detailBreakdown.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {detailBreakdown.map(bd => (
              <Card key={bd.label}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={14} className="text-muted-foreground" />
                    <span className="text-sm font-medium">{bd.label}</span>
                    <Badge variant="outline" className="text-[10px]">{bd.values.length} 值</Badge>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto space-y-1">
                    {bd.values.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/30">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="flex-1 truncate font-mono">{v.value}</span>
                        <span className="text-muted-foreground shrink-0">{v.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Series list */}
        {detailSeries.length > 1 && (
          <Card>
            <CardContent className="pt-4">
              <div className="text-sm font-medium mb-2">序列列表 ({detailSeries.length})</div>
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {detailSeries.map((s, i) => {
                  const labels = Object.entries(s.metric).filter(([k]) => k !== '__name__')
                  const lastVal = s.values.length > 0 ? formatValue(parseFloat(s.values[s.values.length - 1][1])) : '-'
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-border/30">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="flex-1 min-w-0 truncate">
                        {labels.map(([k, v]) => `${k}="${v}"`).join(', ')}
                      </div>
                      <span className="font-mono font-medium shrink-0">{lastVal}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ===== BROWSE VIEW =====
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">指标查看</h1>
        <div className="flex items-center gap-2">
          <Select value={clusterId} onValueChange={(v: string | null) => { if (v) setClusterId(v) }}>
            <SelectTrigger className="w-48 h-8 text-xs"><SelectValue placeholder="选择集群" /></SelectTrigger>
            <SelectContent>
              {clusters.map(c => <SelectItem key={c.cluster_id} value={c.cluster_id}>{c.cluster_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={(v: string | null) => { if (v) setTimeRange(v) }}>
            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="h-8 text-xs">
            {autoRefresh ? <><Pause size={12} className="mr-1" />暂停</> : <><Play size={12} className="mr-1" />实时</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} className="h-8">
            <RefreshCw size={12} />
          </Button>
        </div>
      </div>

      {/* PromQL custom query */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-500 font-mono shrink-0">PromQL</span>
            <Input
              value={customPromQL}
              onChange={e => setCustomPromQL(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomQuery()}
              placeholder='rate(http_requests_total[5m])'
              className="h-8 font-mono text-sm"
            />
            <Button size="sm" onClick={handleCustomQuery} disabled={customLoading} className="h-8 px-3 shrink-0">
              {customLoading ? <RefreshCw size={12} className="animate-spin" /> : '查询'}
            </Button>
            {customResults.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setCustomResults([]); setCustomPromQL('') }} className="h-8">
                <X size={12} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custom PromQL results */}
      {customResults.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm font-medium mb-2">自定义查询结果</div>
            <MetricTimeSeriesChart series={customResults} height={250} />
            <div className="mt-2 flex flex-wrap gap-2">
              {customResults.map((s, i) => {
                const label = Object.entries(s.metric).filter(([k]) => k !== '__name__').map(([k, v]) => `${k}=${v}`).join(', ')
                return label ? <Badge key={i} variant="outline" className="text-xs" style={{ borderColor: COLORS[i % COLORS.length] }}>{label}</Badge> : null
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content: sidebar + metric list */}
      <div className="flex gap-4">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-[220px] shrink-0 space-y-3">
            {/* Type filter */}
            <Card>
              <CardContent className="py-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">指标类型</div>
                {(['all', 'counter', 'gauge', 'histogram'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTypeFilter(t); setShowCount(20) }}
                    className={`flex items-center justify-between w-full px-2 py-1.5 rounded text-xs transition-colors ${
                      typeFilter === t ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-muted/50'
                    }`}
                  >
                    <span>{t === 'all' ? '全部' : t}</span>
                    <span className="text-muted-foreground">{typeCounts[t]}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Label filter */}
            <Card>
              <CardContent className="py-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">标签过滤</div>
                <Select value={selectedLabel} onValueChange={(v: string | null) => { if (v) { setSelectedLabel(v); setSelectedLabelValue('') } else { setSelectedLabel(''); setSelectedLabelValue('') } }}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择标签" /></SelectTrigger>
                  <SelectContent>
                    {labelNames.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedLabel && labelValues.length > 0 && (
                  <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                    <button
                      onClick={() => setSelectedLabelValue('')}
                      className={`w-full text-left px-2 py-1 rounded text-xs ${!selectedLabelValue ? 'bg-blue-50 text-blue-700' : 'hover:bg-muted/50'}`}
                    >
                      全部
                    </button>
                    {labelValues.slice(0, 50).map(v => (
                      <button
                        key={v}
                        onClick={() => setSelectedLabelValue(v)}
                        className={`w-full text-left px-2 py-1 rounded text-xs truncate ${selectedLabelValue === v ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-muted/50'}`}
                        title={v}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                {selectedLabel && selectedLabelValue && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    {selectedLabel}={selectedLabelValue}
                    <X size={10} className="cursor-pointer" onClick={() => setSelectedLabelValue('')} />
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Metric list */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Search + sort + toggle sidebar */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-8 px-2">
              <Filter size={14} />
            </Button>
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索指标名称..."
                value={metricSearch}
                onChange={e => { setMetricSearch(e.target.value); setShowCount(20) }}
                className="h-8 pl-9 pr-8"
              />
              {metricSearch && (
                <button onClick={() => { setMetricSearch(''); setShowCount(20) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
            <Select value={sortBy} onValueChange={(v: string | null) => { if (v) setSortBy(v as 'name' | 'value') }}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="name">按名称</SelectItem>
                <SelectItem value="value">按值</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {visibleNames.length} / {filteredMetrics.length}
            </span>
          </div>

          {/* Metric cards grid */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleNames.map(name => {
              const card = metricCards.get(name)
              const loading = card?.loading ?? true
              const error = card?.error
              const series = card?.series ?? []
              const lastValue = card?.lastValue ?? '-'
              const type = card?.type ?? detectMetricType(name)

              return (
                <Card
                  key={name}
                  className="cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group"
                  onClick={() => handleDrilldown(name)}
                >
                  <CardContent className="p-2.5">
                    <div className="flex items-start justify-between mb-0.5">
                      <div className="text-[11px] font-medium truncate flex-1" title={name}>{name}</div>
                      <Maximize2 size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-base font-bold">
                        {loading ? <span className="text-muted-foreground text-xs">...</span> : error ? <span className="text-destructive text-xs">-</span> : lastValue}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{type}</span>
                    </div>
                    <div className="h-[36px]">
                      {loading ? (
                        <div className="h-full bg-muted/30 rounded animate-pulse" />
                      ) : error ? (
                        <div className="text-[10px] text-destructive truncate">{error}</div>
                      ) : (
                        <Sparkline data={series[0]?.values || []} />
                      )}
                    </div>
                    {series.length > 1 && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">{series.length} 条序列</div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Show more */}
          {hasMore && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setShowCount(prev => prev + 20)}>
                <ChevronDown size={14} className="mr-1" />查看更多 ({filteredMetrics.length - showCount})
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
