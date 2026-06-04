import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ChevronDown, ChevronLeft, Layers, Pause, Play, RefreshCw, Search, X, Maximize2,
  Filter, Info, BarChart3, Network,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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
  unit: string
}

type MetricTypeInfo = {
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
  unit: string
  rate: boolean
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

// Grafana-inspired color palette — vibrant, high contrast
const COLORS = [
  '#73BF69', // green
  '#F2CC0C', // yellow
  '#8AB8FF', // blue
  '#FF780A', // orange
  '#FF5286', // red
  '#C78DFA', // purple
  '#0099CC', // cyan
  '#FADE2A', // gold
  '#B877D9', // violet
  '#56D68B', // lime
]

// --- AutoQueryEngine (Grafana-style suffix-based PromQL generation) ---

function detectMetricInfo(name: string): MetricTypeInfo {
  const parts = name.split('_')
  const last = parts[parts.length - 1]
  const secondLast = parts.length > 1 ? parts[parts.length - 2] : ''

  if (last === 'bucket') {
    return { type: 'histogram', unit: secondLast || '', rate: false }
  }
  if (last === 'sum' || last === 'count') {
    return { type: 'counter', unit: inferUnit(parts, parts.length - 1), rate: true }
  }
  if (last === 'total') {
    return { type: 'counter', unit: inferUnit(parts, parts.length - 1), rate: true }
  }
  if (last === 'created') {
    return { type: 'counter', unit: '', rate: true }
  }
  return { type: 'gauge', unit: inferUnit(parts, parts.length), rate: false }
}

function inferUnit(parts: string[], endIdx: number): string {
  if (endIdx >= 2) {
    const candidate = parts[endIdx - 2]
    const unitMap: Record<string, string> = {
      http: 'requests', request: 'requests', response: 'responses',
      connection: 'connections', message: 'messages', packet: 'packets',
      byte: 'bytes', operation: 'ops', query: 'queries',
      error: 'errors', job: 'jobs', task: 'tasks',
    }
    if (unitMap[candidate]) return unitMap[candidate]
  }
  return ''
}

/** Generate PromQL for a metric based on its type, following Grafana's AutoQueryEngine pattern */
function autoQuery(metric: string, filters: string, groupBy?: string): string {
  const info = detectMetricInfo(metric)
  const sel = filters ? `${metric}{${filters}}` : metric
  const by = groupBy ? ` by (${groupBy})` : ''

  if (info.type === 'histogram') {
    // Histogram: use histogram_quantile for percentiles
    if (groupBy) {
      return `histogram_quantile(0.99, sum(rate(${metric}{${filters}}[5m])) by (le, ${groupBy}))`
    }
    return `histogram_quantile(0.99, sum(rate(${metric}{${filters}}[5m])) by (le))`
  }

  if (info.rate) {
    // Counter: wrap with rate()
    return `sum(rate(${sel}[5m]))${by}`
  }

  // Gauge: direct value
  return `avg(${sel})${by}`
}

function metricTypeLabel(type: string): string {
  switch (type) {
    case 'counter': return 'Counter'
    case 'gauge': return 'Gauge'
    case 'histogram': return 'Histogram'
    case 'summary': return 'Summary'
    default: return type
  }
}

function metricTypeBadgeColor(type: string): string {
  switch (type) {
    case 'counter': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'gauge': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'histogram': return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'summary': return 'bg-green-100 text-green-700 border-green-200'
    default: return ''
  }
}

// --- Utilities ---

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

/** Multi-word AND search (Grafana-style regex lookahead matching) */
function matchesSearch(name: string, search: string): boolean {
  if (!search) return true
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
  const lower = name.toLowerCase()
  return terms.every(t => lower.includes(t))
}

// --- Sparkline mini chart (Grafana-style gradient fill) ---
function Sparkline({ data, color = '#73BF69', height = 36 }: { data: [number, string][]; color?: string; height?: number }) {
  if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-xs text-muted-foreground">-</div>
  const chartData = data.map(([t, v]) => ({ t, v: parseFloat(v) }))
  const id = `spark-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 6)}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          fill={`url(#${id})`}
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// --- Grafana-style crosshair tooltip ---
function GrafanaTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color?: string; name?: string; value?: number }>; label?: string | number }) {
  if (!active || !payload || payload.length === 0) return null
  const time = new Date(Number(label) * 1000).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  return (
    <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg shadow-xl px-3 py-2 text-xs min-w-[180px]">
      <div className="text-slate-300 mb-1.5 font-mono text-[11px]">{time}</div>
      <div className="space-y-0.5">
        {payload.map((entry: { color?: string; name?: string; value?: number }, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300 truncate max-w-[200px]" title={entry.name}>{entry.name}</span>
            </div>
            <span className="font-mono font-medium text-white shrink-0">{formatValue(entry.value as number)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Full time series chart (Grafana-style) ---
function MetricTimeSeriesChart({ series, height = 300, syncId, showLegend = true }: {
  series: MetricSeries[]; height?: number; syncId?: string; showLegend?: boolean
}) {
  if (!series || series.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
        <div className="text-center">
          <div className="text-2xl mb-1 opacity-30">📊</div>
          暂无数据
        </div>
      </div>
    )
  }

  // Build chart data
  const allTs = new Set<number>()
  series.forEach(s => s.values.forEach(([t]) => allTs.add(t)))
  const timestamps = Array.from(allTs).sort((a, b) => a - b)

  const chartData = timestamps.map(t => {
    const point: Record<string, number | null> = { t }
    series.forEach((s, i) => {
      const val = s.values.find(([vt]) => vt === t)
      point[`s${i}`] = val ? parseFloat(val[1]) : null
    })
    return point
  })

  // Build legend items with latest values
  const legendItems = series.map((s, i) => {
    const label = Object.entries(s.metric).filter(([k]) => k !== '__name__').map(([, v]) => v).join('/') || `series ${i}`
    const lastVal = s.values.length > 0 ? formatValue(parseFloat(s.values[s.values.length - 1][1])) : '-'
    return { label, lastVal, color: COLORS[i % COLORS.length] }
  })

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} syncId={syncId} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <defs>
            {series.map((_, i) => (
              <linearGradient key={i} id={`grad-${syncId || 'm'}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.25} />
                <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="t"
            tickFormatter={formatTimestamp}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            minTickGap={60}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={formatValue}
            domain={['auto', 'auto']}
          />
          <Tooltip
            content={<GrafanaTooltip />}
            cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
            isAnimationActive={false}
          />
          {series.map((s, i) => {
            const label = Object.entries(s.metric).filter(([k]) => k !== '__name__').map(([, v]) => v).join('/') || `s${i}`
            return (
              <Area
                key={i}
                type="monotone"
                dataKey={`s${i}`}
                stroke={COLORS[i % COLORS.length]}
                fill={`url(#grad-${syncId || 'm'}-${i})`}
                dot={false}
                strokeWidth={1.5}
                name={label}
                connectNulls={false}
                isAnimationActive={false}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend (Grafana-style inline legend with values) */}
      {showLegend && series.length > 0 && series.length <= 10 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-1 mt-1">
          {legendItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] group cursor-default">
              <span className="w-2.5 h-[3px] rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[160px]" title={item.label}>
                {item.label}
              </span>
              <span className="font-mono font-medium text-foreground/80">{item.lastVal}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Small single-value chart for breakdown panels (Grafana-style) ---
function BreakdownChart({ series, height = 120, syncId }: { series: MetricSeries[]; height?: number; syncId?: string }) {
  if (!series || series.length === 0) {
    return <div className="flex items-center justify-center h-[120px] text-muted-foreground text-xs">暂无数据</div>
  }
  return <MetricTimeSeriesChart series={series} height={height} syncId={syncId} showLegend={false} />
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
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Sidebar: label filters
  const [labelNames] = useState<string[]>(['namespace', 'pod', 'container', 'service', 'node', 'job', 'instance', 'endpoint'])
  const [selectedLabel, setSelectedLabel] = useState('')
  const [labelValues, setLabelValues] = useState<string[]>([])
  const [selectedLabelValue, setSelectedLabelValue] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Detail mode state
  const [detailMetric, setDetailMetric] = useState('')
  const [detailMetricInfo, setDetailMetricInfo] = useState<MetricTypeInfo>({ type: 'gauge', unit: '', rate: false })
  const [detailSeries, setDetailSeries] = useState<MetricSeries[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('overview')

  // Breakdown state (Grafana-style label breakdown)
  const [breakdownLabel, setBreakdownLabel] = useState('namespace')
  const [breakdownSeries, setBreakdownSeries] = useState<Map<string, MetricSeries[]>>(new Map())
  const [breakdownLoading, setBreakdownLoading] = useState(false)
  const [breakdownLabels, setBreakdownLabels] = useState<string[]>([])

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

  // Fetch label values when label selected (sidebar filter)
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

  // Build filter string for current sidebar selection
  const buildFilters = useCallback((extraNamespace?: string) => {
    const ns = extraNamespace || (selectedLabel === 'namespace' ? selectedLabelValue : '')
    if (ns) return `namespace="${ns}"`
    return ''
  }, [selectedLabel, selectedLabelValue])

  // Fetch metric data for a single metric (browse mode cards)
  const fetchMetricData = useCallback(async (metricName: string) => {
    if (!clusterId) return
    const { start, end, step } = getTimeWindow()
    try {
      const info = detectMetricInfo(metricName)
      const filters = buildFilters()
      const query = autoQuery(metricName, filters)

      const params = new URLSearchParams({
        clusterId,
        metric: query,
        start: String(start),
        end: String(end),
        step: String(step),
      })
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
          next.set(metricName, { ...existing!, series, loading: false, error: null, lastValue: lastVal, unit: info.unit })
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
  }, [clusterId, getTimeWindow, buildFilters])

  // Get filtered metrics
  const filteredMetrics = useMemo(() => {
    let filtered = allMetricNames
    if (metricSearch) {
      filtered = filtered.filter(n => matchesSearch(n, metricSearch))
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => detectMetricInfo(n).type === typeFilter)
    }
    return filtered
  }, [allMetricNames, metricSearch, typeFilter])

  // Sort for display only: non-empty metrics first, empty ones at bottom (Grafana pattern)
  // NOT used in any useEffect dependency — purely for rendering order
  const sortedMetrics = useMemo(() => {
    return [...filteredMetrics].sort((a, b) => {
      const cardA = metricCards.get(a)
      const cardB = metricCards.get(b)
      const emptyA = !cardA || cardA.loading || cardA.error || !cardA.series.length
      const emptyB = !cardB || cardB.loading || cardB.error || !cardB.series.length
      if (emptyA && !emptyB) return 1
      if (!emptyA && emptyB) return -1
      return a.localeCompare(b)
    })
  }, [filteredMetrics, metricCards])

  // Fetch visible metrics — depends ONLY on filteredMetrics, not sortedMetrics (avoids infinite loop)
  useEffect(() => {
    if (!clusterId || allMetricNames.length === 0) return

    const visible = filteredMetrics.slice(0, showCount)

    setMetricCards(prev => {
      const next = new Map(prev)
      for (const name of visible) {
        if (!next.has(name)) {
          const info = detectMetricInfo(name)
          next.set(name, { name, series: [], loading: true, error: null, lastValue: '-', type: info.type, unit: info.unit })
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
  }, [clusterId, allMetricNames, filteredMetrics, showCount, refreshKey, selectedLabel, selectedLabelValue]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => setRefreshKey(k => k + 1), 30000)
    }
    return () => {
      if (refreshTimerRef.current) { clearInterval(refreshTimerRef.current); refreshTimerRef.current = null }
    }
  }, [autoRefresh])

  // Drill-down into a metric (Grafana-style: fetch main chart + discover labels for breakdown)
  const handleDrilldown = async (metricName: string) => {
    setViewMode('detail')
    setDetailMetric(metricName)
    setDetailLoading(true)
    setDetailTab('overview')
    setBreakdownSeries(new Map())
    setBreakdownLabels([])

    const info = detectMetricInfo(metricName)
    setDetailMetricInfo(info)

    const { start, end, step } = getTimeWindow()
    const filters = buildFilters()

    // Build auto-query for the main chart
    const query = autoQuery(metricName, filters)

    try {
      // Fetch main chart data
      const params = new URLSearchParams({
        clusterId,
        metric: query,
        start: String(start),
        end: String(end),
        step: String(step),
      })
      const res = await api<{ code: number; data: { raw: string } }>('/mrboard/prometheus/v1/query_range?' + params.toString())
      if (res.code === 0 && res.data?.raw) {
        const parsed = JSON.parse(res.data.raw)
        const result: QueryRangeResult = parsed.data || { resultType: '', result: [] }
        setDetailSeries(result.result || [])
      }

      // Discover label names for breakdown (Grafana: label_names(metric{filters}))
      // We use a raw query to get series labels
      const rawQuery = filters ? `${metricName}{${filters}}` : metricName
      const rawParams = new URLSearchParams({
        clusterId,
        metric: rawQuery,
        start: String(start),
        end: String(end),
        step: String(step),
      })
      const rawRes = await api<{ code: number; data: { raw: string } }>('/mrboard/prometheus/v1/query_range?' + rawParams.toString())
      if (rawRes.code === 0 && rawRes.data?.raw) {
        const rawParsed = JSON.parse(rawRes.data.raw)
        const rawResult: QueryRangeResult = rawParsed.data || { resultType: '', result: [] }
        // Extract unique label names from all series
        const labelSet = new Set<string>()
        for (const s of (rawResult.result || [])) {
          for (const k of Object.keys(s.metric)) {
            if (k !== '__name__') labelSet.add(k)
          }
        }
        const discovered = Array.from(labelSet).sort()
        setBreakdownLabels(discovered)
        if (discovered.length > 0 && !discovered.includes(breakdownLabel)) {
          setBreakdownLabel(discovered[0])
        }
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDetailLoading(false)
    }
  }

  // Fetch breakdown data when breakdown label changes (Grafana: breakdown by label)
  useEffect(() => {
    if (viewMode !== 'detail' || !detailMetric || !breakdownLabel || detailTab !== 'breakdown') return

    const fetchBreakdown = async () => {
      setBreakdownLoading(true)
      const { start, end, step } = getTimeWindow()
      const filters = buildFilters()

      try {
        // Get label values for the breakdown label
        const labelRes = await api<{ code: number; data: string[] }>(
          '/mrboard/prometheus/v1/label_values?clusterId=' + clusterId + '&label=' + breakdownLabel
        )
        const values = (labelRes.data || []).slice(0, 30) // Cap at 30 values

        // Fetch data for each label value
        const newSeries = new Map<string, MetricSeries[]>()
        await Promise.all(values.map(async (val) => {
          const valueFilters = filters
            ? `${filters},${breakdownLabel}="${val}"`
            : `${breakdownLabel}="${val}"`
          const query = autoQuery(detailMetric, valueFilters)
          const params = new URLSearchParams({
            clusterId,
            metric: query,
            start: String(start),
            end: String(end),
            step: String(step),
          })
          try {
            const res = await api<{ code: number; data: { raw: string } }>('/mrboard/prometheus/v1/query_range?' + params.toString())
            if (res.code === 0 && res.data?.raw) {
              const parsed = JSON.parse(res.data.raw)
              const result: QueryRangeResult = parsed.data || { resultType: '', result: [] }
              newSeries.set(val, result.result || [])
            }
          } catch {
            // Skip failed values
          }
        }))
        setBreakdownSeries(newSeries)
      } catch (err) {
        toast.error((err as Error).message)
      } finally {
        setBreakdownLoading(false)
      }
    }

    fetchBreakdown()
  }, [viewMode, detailMetric, breakdownLabel, detailTab, clusterId, getTimeWindow, buildFilters]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const visibleNames = sortedMetrics.slice(0, showCount)
  const hasMore = sortedMetrics.length > showCount

  // Type counts for filter badges
  const typeCounts = useMemo(() => {
    const counts = { all: allMetricNames.length, counter: 0, gauge: 0, histogram: 0, summary: 0 }
    for (const n of allMetricNames) {
      const t = detectMetricInfo(n).type
      if (t in counts) counts[t as keyof typeof counts]++
    }
    return counts
  }, [allMetricNames])

  // Refresh detail view
  const refreshDetail = useCallback(() => {
    setRefreshKey(k => k + 1)
    handleDrilldown(detailMetric)
  }, [detailMetric]) // eslint-disable-line react-hooks/exhaustive-deps

  // ===== DETAIL VIEW =====
  if (viewMode === 'detail') {
    const generatedQuery = autoQuery(detailMetric, buildFilters())

    return (
      <div className="space-y-4">
        {/* Header with back button (sticky for Grafana-style UX) */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-3 -mt-4 pt-4 -mx-4 px-4 border-b">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setViewMode('browse')} className="gap-1">
              <ChevronLeft size={16} />返回
            </Button>
            <h1 className="text-lg font-bold font-mono">{detailMetric}</h1>
            <Badge variant="outline" className={`text-xs ${metricTypeBadgeColor(detailMetricInfo.type)}`}>
              {metricTypeLabel(detailMetricInfo.type)}
            </Badge>
            {detailMetricInfo.unit && (
              <Badge variant="secondary" className="text-xs">{detailMetricInfo.unit}</Badge>
            )}
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
            <Button variant="outline" size="sm" onClick={refreshDetail} className="h-8">
              <RefreshCw size={12} />
            </Button>
          </div>

          {/* Auto-generated PromQL display */}
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="font-bold text-amber-600 font-mono shrink-0 text-[11px] tracking-wider uppercase">PromQL</span>
            <code className="flex-1 bg-muted/60 px-3 py-1.5 rounded-md font-mono text-[11px] truncate border border-border/50 text-foreground/80" title={generatedQuery}>
              {generatedQuery}
            </code>
            <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => {
              navigator.clipboard.writeText(generatedQuery)
              toast.success('已复制 PromQL')
            }}>
              复制
            </Button>
          </div>
        </div>

        {/* Main chart (always visible at top, Grafana sticky graph pattern) */}
        <Card>
          <CardContent className="pt-4">
            {detailLoading ? (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                <RefreshCw size={16} className="animate-spin mr-2" />加载中...
              </div>
            ) : (
              <>
                <MetricTimeSeriesChart series={detailSeries} height={350} syncId="detail-main" />
                <div className="mt-2 text-xs text-muted-foreground">
                  {detailSeries.length} 条序列
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action tabs (Grafana: Overview / Breakdown / Related) */}
        <Tabs value={detailTab} onValueChange={setDetailTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-1">
              <Info size={14} />概览
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="gap-1">
              <BarChart3 size={14} />标签分解
            </TabsTrigger>
            <TabsTrigger value="related" className="gap-1">
              <Network size={14} />关联指标
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Metric metadata */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="text-sm font-medium mb-2">指标信息</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground mb-1">名称</div>
                    <div className="font-mono font-medium break-all">{detailMetric}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">类型</div>
                    <Badge variant="outline" className={`text-xs ${metricTypeBadgeColor(detailMetricInfo.type)}`}>
                      {metricTypeLabel(detailMetricInfo.type)}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">单位</div>
                    <div className="font-medium">{detailMetricInfo.unit || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">序列数</div>
                    <div className="font-medium">{detailSeries.length}</div>
                  </div>
                </div>
                {detailMetricInfo.rate && (
                  <div className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                    Counter 类型指标，已自动应用 <code className="font-mono">rate()</code> 计算每秒速率
                  </div>
                )}
                {detailMetricInfo.type === 'histogram' && (
                  <div className="text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                    Histogram 类型指标，已自动应用 <code className="font-mono">histogram_quantile()</code> 计算 P99 分位数
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Series list */}
            {detailSeries.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm font-medium mb-2">序列列表 ({detailSeries.length})</div>
                  <div className="max-h-[300px] overflow-y-auto space-y-1">
                    {detailSeries.map((s, i) => {
                      const labels = Object.entries(s.metric).filter(([k]) => k !== '__name__')
                      const lastVal = s.values.length > 0 ? formatValue(parseFloat(s.values[s.values.length - 1][1])) : '-'
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/30">
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
          </TabsContent>

          {/* Breakdown Tab (Grafana: per-label breakdown with group-by selector) */}
          <TabsContent value="breakdown" className="space-y-4 mt-4">
            {/* Group-by label selector */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">按标签分组</span>
              <Select value={breakdownLabel} onValueChange={(v: string | null) => { if (v) setBreakdownLabel(v) }}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {breakdownLabels.map(l => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {breakdownLoading && <RefreshCw size={14} className="animate-spin text-muted-foreground" />}
              {breakdownSeries.size > 0 && (
                <span className="text-xs text-muted-foreground">{breakdownSeries.size} 个分组</span>
              )}
            </div>

            {/* Breakdown panels grid */}
            {breakdownLoading ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="h-4 w-24 bg-muted/50 rounded animate-pulse mb-3" />
                      <div className="h-[120px] bg-muted/30 rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : breakdownSeries.size > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Array.from(breakdownSeries.entries()).map(([value, series]) => {
                  const lastVal = series.length > 0 && series[0].values.length > 0
                    ? formatValue(parseFloat(series[0].values[series[0].values.length - 1][1]))
                    : '-'
                  return (
                    <Card key={value} className="hover:border-blue-300 transition-all">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium font-mono truncate flex-1" title={value}>{value}</div>
                          <span className="text-sm font-bold font-mono ml-2 shrink-0">{lastVal}</span>
                        </div>
                        <BreakdownChart series={series} height={120} syncId="detail-breakdown" />
                        <div className="mt-1 text-[10px] text-muted-foreground">{series.length} 条序列</div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
                    选择标签查看分解视图
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Related Metrics Tab */}
          <TabsContent value="related" className="space-y-4 mt-4">
            <RelatedMetrics
              metricName={detailMetric}
              allMetricNames={allMetricNames}
              metricCards={metricCards}
              onSelect={(name) => handleDrilldown(name)}
            />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // ===== BROWSE VIEW =====
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">指标查看</h1>
            <p className="text-xs text-muted-foreground">Prometheus 指标探索与下钻</p>
          </div>
        </div>
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
            <span className="font-bold text-amber-500 dark:text-amber-400 font-mono shrink-0 text-[11px] tracking-wider uppercase">PromQL</span>
            <Input
              value={customPromQL}
              onChange={e => setCustomPromQL(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCustomQuery()}
              placeholder='rate(http_requests_total[5m])'
              className="h-8 font-mono text-sm bg-muted/40 border-border/50 placeholder:text-muted-foreground/50"
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
            <Card className="bg-muted/30">
              <CardContent className="py-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">指标类型</div>
                {(['all', 'counter', 'gauge', 'histogram'] as const).map(t => {
                  const active = typeFilter === t
                  const dotColor = t === 'counter' ? 'bg-orange-500' : t === 'gauge' ? 'bg-blue-500' : t === 'histogram' ? 'bg-purple-500' : 'bg-primary'
                  return (
                    <button
                      key={t}
                      onClick={() => { setTypeFilter(t); setShowCount(20) }}
                      className={`flex items-center justify-between w-full px-2.5 py-2 rounded-lg text-xs transition-all ${
                        active ? 'bg-primary/10 text-primary font-medium shadow-sm' : 'hover:bg-muted/60 text-foreground/70'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {t !== 'all' && <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
                        {t === 'all' ? '全部' : metricTypeLabel(t)}
                      </span>
                      <span className={`tabular-nums ${active ? 'text-primary/70' : 'text-muted-foreground'}`}>{typeCounts[t as keyof typeof typeCounts] || 0}</span>
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            {/* Label filter */}
            <Card className="bg-muted/30">
              <CardContent className="py-3 space-y-2">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">标签过滤</div>
                <Select value={selectedLabel} onValueChange={(v: string | null) => { if (v) { setSelectedLabel(v); setSelectedLabelValue('') } else { setSelectedLabel(''); setSelectedLabelValue('') } }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择标签" /></SelectTrigger>
                  <SelectContent>
                    {labelNames.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedLabel && labelValues.length > 0 && (
                  <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                    <button
                      onClick={() => setSelectedLabelValue('')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all ${!selectedLabelValue ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/60 text-foreground/70'}`}
                    >
                      全部
                    </button>
                    {labelValues.slice(0, 50).map(v => (
                      <button
                        key={v}
                        onClick={() => setSelectedLabelValue(v)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs truncate transition-all ${selectedLabelValue === v ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/60 text-foreground/70'}`}
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
          {/* Search + toggle sidebar */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-8 px-2">
              <Filter size={14} />
            </Button>
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索指标名称...（支持多词搜索，空格分隔）"
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {visibleNames.length} / {sortedMetrics.length}
            </span>
          </div>

          {/* Metric cards grid */}
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleNames.map(name => {
              const card = metricCards.get(name)
              const loading = card?.loading ?? true
              const error = card?.error
              const series = card?.series ?? []
              const lastValue = card?.lastValue ?? '-'
              const info = detectMetricInfo(name)
              const isEmpty = !loading && !error && series.length === 0
              const accentColor = info.type === 'counter' ? '#f97316' : info.type === 'histogram' ? '#a855f7' : '#3b82f6'

              return (
                <Card
                  key={name}
                  className={`cursor-pointer hover:ring-2 hover:ring-primary/20 hover:shadow-md transition-[box-shadow,ring] group relative overflow-hidden ${isEmpty ? 'opacity-40' : ''}`}
                  onClick={() => handleDrilldown(name)}
                >
                  {/* Left accent bar by metric type */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ backgroundColor: accentColor }} />
                  <CardContent className="pl-4 pr-3 py-3">
                    <div className="flex items-start justify-between mb-1">
                      <div className="text-xs font-medium font-mono truncate flex-1 text-foreground/80" title={name}>{name}</div>
                      <Maximize2 size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1.5" />
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg font-bold font-mono tabular-nums">
                        {loading ? <span className="text-muted-foreground text-xs animate-pulse">加载中</span> : error ? <span className="text-destructive text-xs">错误</span> : lastValue}
                      </span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${metricTypeBadgeColor(info.type)}`}>
                        {metricTypeLabel(info.type)}
                      </Badge>
                    </div>
                    <div className="h-[48px] -mx-1">
                      {loading ? (
                        <div className="h-full space-y-1.5">
                          <div className="h-2 w-3/4 bg-muted/40 rounded animate-pulse" />
                          <div className="h-[30px] bg-muted/30 rounded animate-pulse" />
                        </div>
                      ) : error ? (
                        <div className="flex items-center h-full">
                          <span className="text-[10px] text-destructive bg-destructive/5 px-2 py-1 rounded">{error}</span>
                        </div>
                      ) : (
                        <Sparkline data={series[0]?.values || []} height={48} />
                      )}
                    </div>
                    {series.length > 1 && (
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Layers size={10} />
                        {series.length} 条序列
                      </div>
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
                <ChevronDown size={14} className="mr-1" />查看更多 ({sortedMetrics.length - showCount})
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Related Metrics sub-component (Grafana: RelatedMetricsScene) ---
function RelatedMetrics({ metricName, allMetricNames, metricCards, onSelect }: {
  metricName: string
  allMetricNames: string[]
  metricCards: Map<string, MetricCard>
  onSelect: (name: string) => void
}) {
  // Find related metrics by shared prefix (Grafana pattern)
  const related = useMemo(() => {
    const parts = metricName.split('_')
    // Find the best prefix (2+ parts that match other metrics)
    let bestPrefix = ''
    for (let i = parts.length - 1; i >= 1; i--) {
      const prefix = parts.slice(0, i).join('_')
      const matches = allMetricNames.filter(n => n !== metricName && n.startsWith(prefix))
      if (matches.length >= 2 && matches.length <= 50) {
        bestPrefix = prefix
        break
      }
    }
    if (!bestPrefix) {
      // Fallback: use first 2 parts
      bestPrefix = parts.slice(0, Math.min(2, parts.length)).join('_')
    }
    return allMetricNames
      .filter(n => n !== metricName && n.startsWith(bestPrefix))
      .slice(0, 30)
  }, [metricName, allMetricNames])

  if (related.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
            未找到关联指标
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">找到 {related.length} 个关联指标</div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {related.map(name => {
          const card = metricCards.get(name)
          const info = detectMetricInfo(name)
          const lastVal = card?.lastValue ?? '-'
          const loading = card?.loading ?? true

          return (
            <Card
              key={name}
              className="cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
              onClick={() => onSelect(name)}
            >
              <CardContent className="p-2.5">
                <div className="text-[11px] font-medium truncate mb-1" title={name}>{name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-mono">
                    {loading ? <span className="text-muted-foreground text-xs">...</span> : lastVal}
                  </span>
                  <span className={`text-[10px] px-1 py-0.5 rounded border ${metricTypeBadgeColor(info.type)}`}>
                    {metricTypeLabel(info.type)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
