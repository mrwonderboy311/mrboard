import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Play, Search, X, ChevronLeft, Radio, Maximize2,
} from 'lucide-react'
import { toast } from 'sonner'

import { useLogFilters } from '@/hooks/useLogFilters'
import type {
  LabelWithValues, DetectedField, LogPattern, LogEntry, HistogramBucket,
} from '@/types/log'
import { FacetPanel } from './LogDrilldown/FacetPanel'
import { FilterTagBar } from './LogDrilldown/FilterTagBar'
import { VolumeHistogram } from './LogDrilldown/VolumeHistogram'
import { PatternList } from './LogDrilldown/PatternList'
import { LogEntryRow } from './LogDrilldown/LogEntryRow'

const TIME_RANGES = [
  { label: '5m', value: '5m', ms: 5 * 60 * 1000 },
  { label: '15m', value: '15m', ms: 15 * 60 * 1000 },
  { label: '1h', value: '1h', ms: 60 * 60 * 1000 },
  { label: '6h', value: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '24h', value: '24h', ms: 24 * 60 * 60 * 1000 },
]

type ViewMode = 'summary' | 'expanded'

export default function LogDrilldown() {
  const clusterId = localStorage.getItem('clusterId') || ''
  const {
    filters, toggleLabelValue, toggleFieldValue, toggleLevel,
    setSearch, setLogql, removeFilter, clearAll, hasActiveFilters,
  } = useLogFilters()

  const [timeRange, setTimeRange] = useState('1h')
  const [liveTail, setLiveTail] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  // View mode: summary shows histogram + preview, expanded shows full logs
  const [viewMode, setViewMode] = useState<ViewMode>('summary')
  const [expandedService, setExpandedService] = useState<string | null>(null)

  // Data state
  const [labels, setLabels] = useState<LabelWithValues[]>([])
  const [fields, setFields] = useState<DetectedField[]>([])
  const [patterns, setPatterns] = useState<LogPattern[]>([])
  const [histogram, setHistogram] = useState<HistogramBucket[]>([])
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({})
  const [previewLogs, setPreviewLogs] = useState<LogEntry[]>([])
  const [expandedLogs, setExpandedLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Service summary (aggregated from labels)
  const [serviceList, setServiceList] = useState<{ name: string; count: number }[]>([])

  const computeTimeWindow = useCallback((range: string) => {
    const r = TIME_RANGES.find(t => t.value === range)
    const now = Date.now()
    const ms = r?.ms || 3600000
    return { start: String((now - ms) * 1_000_000), end: String(now * 1_000_000) }
  }, [])

  const buildBaseParams = useCallback(() => {
    const { start, end } = computeTimeWindow(timeRange)
    const params = new URLSearchParams()
    params.set('clusterId', clusterId)
    const nsValues = filters.labels['namespace']
    if (nsValues && nsValues.length > 0) params.set('namespace', nsValues[0])
    const svcValues = filters.labels['service_name'] || filters.labels['service']
    if (svcValues && svcValues.length > 0) params.set('services', svcValues.join(','))
    if (filters.levels.length > 0 && filters.levels.length < 4) params.set('levels', filters.levels.join(','))
    if (filters.search) params.set('search', filters.search)
    params.set('start', start)
    params.set('end', end)
    return params
  }, [clusterId, filters, timeRange, computeTimeWindow])

  // Fetch histogram
  const fetchHistogram = useCallback(async () => {
    if (!clusterId) return
    const params = buildBaseParams()
    try {
      const res = await api<{ code: number; data: HistogramBucket[] }>(
        '/mrboard/log/v1/Histogram?' + params.toString()
      )
      setHistogram(res.data || [])
    } catch { /* optional */ }
  }, [clusterId, buildBaseParams])

  // Fetch preview logs (only 10 for summary view)
  const fetchPreview = useCallback(async () => {
    if (!clusterId) return
    setLoading(true)
    try {
      const params = buildBaseParams()
      params.set('limit', '10')
      params.set('direction', 'backward')
      const res = await api<{ code: number; data: { entries: LogEntry[]; total: number } }>(
        '/mrboard/log/v1/Query?' + params.toString()
      )
      setPreviewLogs(res.data?.entries || [])
      setTotal(res.data?.total || 0)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [clusterId, buildBaseParams])

  // Fetch labels for facet panel and service list
  const fetchLabels = useCallback(async () => {
    if (!clusterId) return
    const { start, end } = computeTimeWindow(timeRange)
    try {
      const res = await api<{ code: number; data: LabelWithValues[] }>(
        `/mrboard/log/v1/LabelsV2?clusterId=${clusterId}&start=${start}&end=${end}`
      )
      const data = res.data || []
      setLabels(data)
      // Extract service list from labels
      const svcLabel = data.find(l => l.name === 'service_name' || l.name === 'service')
      if (svcLabel?.values) {
        setServiceList(svcLabel.values.map(v => ({ name: v.value, count: v.count })))
      }
    } catch { /* optional */ }
  }, [clusterId, timeRange, computeTimeWindow])

  // Fetch levels
  const fetchLevels = useCallback(async () => {
    if (!clusterId) return
    const params = buildBaseParams()
    try {
      const res = await api<{ code: number; data: Record<string, number> }>(
        '/mrboard/log/v1/Levels?' + params.toString()
      )
      setLevelCounts(res.data || {})
    } catch { /* optional */ }
  }, [clusterId, buildBaseParams])

  // Fetch patterns
  const fetchPatterns = useCallback(async () => {
    if (!clusterId) return
    const params = buildBaseParams()
    try {
      const res = await api<{ code: number; data: { patterns: LogPattern[] } }>(
        '/mrboard/log/v1/Patterns?' + params.toString()
      )
      setPatterns(res.data?.patterns || [])
    } catch { /* degrade gracefully */ }
  }, [clusterId, buildBaseParams])

  // Fetch fields
  const fetchFields = useCallback(async () => {
    if (!clusterId) return
    const params = buildBaseParams()
    try {
      const res = await api<{ code: number; data: { fields: DetectedField[] } }>(
        '/mrboard/log/v1/DetectedFields?' + params.toString()
      )
      setFields(res.data?.fields || [])
    } catch { /* degrade gracefully */ }
  }, [clusterId, buildBaseParams])

  // Fetch all summary data
  const fetchSummary = useCallback(() => {
    fetchLabels()
    fetchHistogram()
    fetchLevels()
    fetchPreview()
    fetchPatterns()
    fetchFields()
  }, [fetchLabels, fetchHistogram, fetchLevels, fetchPreview, fetchPatterns, fetchFields])

  // Fetch expanded logs for a specific service
  const fetchExpandedLogs = useCallback(async (service: string) => {
    if (!clusterId) return
    setLoading(true)
    try {
      const params = buildBaseParams()
      params.set('services', service)
      params.set('limit', '500')
      params.set('direction', 'backward')
      const res = await api<{ code: number; data: { entries: LogEntry[]; total: number } }>(
        '/mrboard/log/v1/Query?' + params.toString()
      )
      setExpandedLogs(res.data?.entries || [])
      setTotal(res.data?.total || 0)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [clusterId, buildBaseParams])

  // Auto-fetch summary on filter/time change
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!clusterId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { fetchSummary() }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [clusterId, filters, timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket live tail
  useEffect(() => {
    if (!liveTail || !clusterId) {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
      return
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/mrboard/log/v1/Tail?clusterId=${clusterId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry
        if (viewMode === 'expanded' && expandedService) {
          setExpandedLogs(prev => [entry, ...prev].slice(0, 500))
        } else {
          setPreviewLogs(prev => [entry, ...prev].slice(0, 10))
        }
      } catch { /* ignore parse errors */ }
    }

    ws.onerror = () => { toast.error('WebSocket 连接错误') }
    ws.onclose = () => { if (liveTail) setLiveTail(false) }

    return () => { ws.close() }
  }, [liveTail, clusterId, viewMode, expandedService]) // eslint-disable-line react-hooks/exhaustive-deps

  // Enter expanded view for a service
  const handleExpandService = useCallback((service: string) => {
    setExpandedService(service)
    setViewMode('expanded')
    fetchExpandedLogs(service)
  }, [fetchExpandedLogs])

  // Back to summary
  const handleBackToSummary = useCallback(() => {
    setViewMode('summary')
    setExpandedService(null)
    setExpandedLogs([])
  }, [])

  // Click histogram bucket
  const handleClickBucket = useCallback((time: number) => {
    const bucketStart = String((time - 30) * 1_000_000)
    const bucketEnd = String((time + 30) * 1_000_000)
    const params = new URLSearchParams()
    params.set('clusterId', clusterId)
    params.set('start', bucketStart)
    params.set('end', bucketEnd)
    params.set('limit', '10')
    params.set('direction', 'backward')
    setLoading(true)
    api<{ code: number; data: { entries: LogEntry[]; total: number } }>('/mrboard/log/v1/Query?' + params.toString())
      .then(res => { setPreviewLogs(res.data?.entries || []); setTotal(res.data?.total || 0) })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setLoading(false))
  }, [clusterId])

  const buildLogQLDisplay = useCallback(() => {
    if (filters.logql) return filters.logql
    const selectors: string[] = []
    const nsValues = filters.labels['namespace']
    if (nsValues && nsValues.length > 0) selectors.push(`namespace="${nsValues[0]}"`)
    const svcValues = filters.labels['service_name'] || filters.labels['service']
    if (svcValues && svcValues.length === 1) selectors.push(`service_name="${svcValues[0]}"`)
    else if (svcValues && svcValues.length > 1) selectors.push(`service_name=~"${svcValues.join('|')}"`)
    const selector = selectors.length > 0 ? `{${selectors.join(', ')}}` : '{}'
    const filter = filters.search ? ` |= \`${filters.search}\`` : ''
    return `${selector}${filter}`
  }, [filters])

  // Toggle live tail
  const toggleLiveTail = useCallback(() => {
    setLiveTail(prev => !prev)
  }, [])

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left sidebar: facets */}
      <FacetPanel
        labels={labels} fields={fields} levels={levelCounts}
        selectedLabels={filters.labels} excludeLabels={filters.excludeLabels}
        selectedFields={filters.fields} excludeFields={filters.excludeFields}
        selectedLevels={filters.levels}
        onToggleLabel={toggleLabelValue}
        onToggleField={(name, value, exclude) => { toggleFieldValue(name, value, exclude) }}
        onToggleLevel={toggleLevel}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Controls bar */}
        <div className="shrink-0 border-b bg-card px-4 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-500 shrink-0 font-mono">LogQL</span>
            <Input value={buildLogQLDisplay()} onChange={e => setLogql(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchSummary()} className="h-8 font-mono text-sm" />
            <Button size="sm" onClick={fetchSummary} disabled={loading} className="h-8 px-3 shrink-0">
              <Play size={13} className="mr-1" />查询
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={timeRange} onValueChange={(v: string | null) => { if (v) setTimeRange(v) }}>
              <SelectTrigger className="w-20 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="h-4 w-px bg-border" />

            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索..." value={filters.search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchSummary()} className="h-7 w-40 pl-7 pr-7 text-xs" />
              {filters.search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>
              )}
            </div>

            <div className="flex-1" />

            {/* Live tail button */}
            <Button
              variant={liveTail ? 'default' : 'outline'}
              size="sm"
              onClick={toggleLiveTail}
              className={`h-7 text-xs gap-1 ${liveTail ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              <Radio size={12} className={liveTail ? 'animate-pulse' : ''} />
              {liveTail ? 'Live' : 'Live Tail'}
            </Button>
          </div>

          {hasActiveFilters && <FilterTagBar filters={filters} onRemove={removeFilter} onClearAll={clearAll} />}
        </div>

        {/* Histogram — always visible */}
        <VolumeHistogram data={histogram} onClickBucket={handleClickBucket} />

        {/* Content area: summary or expanded */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'summary' ? (
            /* ===== SUMMARY MODE ===== */
            <div className="space-y-0">
              {/* Service summary cards */}
              {serviceList.length > 0 && (
                <div className="px-4 py-3 border-b">
                  <div className="text-xs text-muted-foreground mb-2">服务 ({serviceList.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {serviceList.slice(0, 20).map(svc => (
                      <button
                        key={svc.name}
                        onClick={() => handleExpandService(svc.name)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent hover:border-blue-300 transition-colors text-xs group"
                      >
                        <span className="font-medium">{svc.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1 h-4">{svc.count}</Badge>
                        <Maximize2 size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Patterns */}
              {patterns.length > 0 && (
                <div className="border-b">
                  <PatternList patterns={patterns} onPatternClick={(p) => setSearch(p)} />
                </div>
              )}

              {/* Preview: latest 10 log lines */}
              <div>
                <div className="flex items-center justify-between px-4 py-1.5 border-b bg-muted/30 text-[11px] text-muted-foreground">
                  <span>最新日志 ({total.toLocaleString()} 条)</span>
                  {loading && <span className="animate-pulse">加载中...</span>}
                </div>
                {previewLogs.length === 0 && !loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                    暂无日志，尝试调整过滤条件
                  </div>
                ) : (
                  <div className="font-mono text-[12px]">
                    {previewLogs.map((log, idx) => (
                      <LogEntryRow key={idx} entry={log} expanded={false} onToggle={() => {}} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===== EXPANDED MODE ===== */
            <div className="flex flex-col h-full">
              {/* Expanded header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
                <Button variant="ghost" size="sm" onClick={handleBackToSummary} className="h-7 gap-1 text-xs">
                  <ChevronLeft size={14} />返回
                </Button>
                <span className="font-mono font-medium text-sm">{expandedService}</span>
                <Badge variant="secondary" className="text-xs">{total.toLocaleString()} 条</Badge>
                <div className="flex-1" />
                {loading && <span className="text-xs text-muted-foreground animate-pulse">加载中...</span>}
              </div>

              {/* Expanded log list with virtualization */}
              <ExpandedLogList logs={expandedLogs} liveTail={liveTail} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Virtualized log list for expanded mode
const ROW_HEIGHT = 28
const OVERSCAN = 15

function ExpandedLogList({ logs, liveTail }: { logs: LogEntry[]; liveTail: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [autoScroll, setAutoScroll] = useState(true)

  const toggleRow = useCallback((idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setContainerHeight(entry.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Auto-scroll to top when new logs arrive (live tail)
  useEffect(() => {
    if (liveTail && autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0
    }
  }, [logs.length, liveTail, autoScroll])

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
      // Detect if user scrolled away from top
      setAutoScroll(containerRef.current.scrollTop < 50)
    }
  }, [])

  if (logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {liveTail ? '等待日志...' : '暂无日志'}
      </div>
    )
  }

  const totalHeight = logs.length * ROW_HEIGHT
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2
  const endIdx = Math.min(logs.length, startIdx + visibleCount)

  return (
    <div ref={containerRef} className="flex-1 overflow-auto font-mono text-[12px]" onScroll={handleScroll}>
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {logs.slice(startIdx, endIdx).map((log, i) => {
          const idx = startIdx + i
          return (
            <div
              key={`${log.timestamp}-${idx}`}
              style={{ position: 'absolute', top: `${idx * ROW_HEIGHT}px`, left: 0, right: 0 }}
            >
              <LogEntryRow entry={log} expanded={expandedRows.has(idx)} onToggle={() => toggleRow(idx)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
