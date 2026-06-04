import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, RefreshCw, Pause, Play, Search, X } from 'lucide-react'
import { toast } from 'sonner'

import { useLogFilters } from '@/hooks/useLogFilters'
import type {
  LabelWithValues, DetectedField, LogPattern, LogEntry, HistogramBucket,
} from '@/types/log'
import { FacetPanel } from './LogDrilldown/FacetPanel'
import { FilterTagBar } from './LogDrilldown/FilterTagBar'
import { VolumeHistogram } from './LogDrilldown/VolumeHistogram'
import { PatternList } from './LogDrilldown/PatternList'
import { LogEntryList } from './LogDrilldown/LogEntryList'
import { FieldBreakdown } from './LogDrilldown/FieldBreakdown'

const TIME_RANGES = [
  { label: '最近 5 分钟', value: '5m', ms: 5 * 60 * 1000 },
  { label: '最近 15 分钟', value: '15m', ms: 15 * 60 * 1000 },
  { label: '最近 1 小时', value: '1h', ms: 60 * 60 * 1000 },
  { label: '最近 6 小时', value: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '最近 24 小时', value: '24h', ms: 24 * 60 * 60 * 1000 },
]

export default function LogDrilldown() {
  const clusterId = localStorage.getItem('clusterId') || ''
  const {
    filters, toggleLabelValue, toggleFieldValue, toggleLevel,
    setSearch, setLogql, removeFilter, clearAll, hasActiveFilters,
  } = useLogFilters()

  const [timeRange, setTimeRange] = useState('1h')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Data state
  const [labels, setLabels] = useState<LabelWithValues[]>([])
  const [fields, setFields] = useState<DetectedField[]>([])
  const [patterns, setPatterns] = useState<LogPattern[]>([])
  const [histogram, setHistogram] = useState<HistogramBucket[]>([])
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({})
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

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

  const fetchLabels = useCallback(async () => {
    if (!clusterId) return
    const { start, end } = computeTimeWindow(timeRange)
    try {
      const res = await api<{ code: number; data: LabelWithValues[] }>(
        `/mrboard/log/v1/LabelsV2?clusterId=${clusterId}&start=${start}&end=${end}`
      )
      setLabels(res.data || [])
    } catch { /* optional */ }
  }, [clusterId, timeRange, computeTimeWindow])

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

  const fetchLogs = useCallback(async () => {
    if (!clusterId) return
    setLoading(true)
    try {
      const params = buildBaseParams()
      params.set('limit', '500')
      params.set('direction', 'backward')
      if (filters.logql) params.set('logql', filters.logql)
      const res = await api<{ code: number; data: { entries: LogEntry[]; total: number } }>(
        '/mrboard/log/v1/Query?' + params.toString()
      )
      setLogs(res.data?.entries || [])
      setTotal(res.data?.total || 0)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [clusterId, buildBaseParams, filters.logql])

  const fetchAll = useCallback(() => {
    fetchLabels()
    fetchHistogram()
    fetchLevels()
    fetchLogs()
    fetchFields()
    fetchPatterns()
  }, [fetchLabels, fetchHistogram, fetchLevels, fetchLogs, fetchFields, fetchPatterns])

  // Auto-fetch with debounce when filters/timeRange change
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!clusterId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { fetchAll() }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [clusterId, filters, timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(fetchAll, 5000)
    }
    return () => {
      if (refreshTimerRef.current) { clearInterval(refreshTimerRef.current); refreshTimerRef.current = null }
    }
  }, [autoRefresh, fetchAll])

  const handleClickBucket = useCallback((time: number) => {
    const bucketStart = String((time - 30) * 1_000_000)
    const bucketEnd = String((time + 30) * 1_000_000)
    const params = new URLSearchParams()
    params.set('clusterId', clusterId)
    params.set('start', bucketStart)
    params.set('end', bucketEnd)
    params.set('limit', '200')
    params.set('direction', 'backward')
    setLoading(true)
    api<{ code: number; data: { entries: LogEntry[]; total: number } }>('/mrboard/log/v1/Query?' + params.toString())
      .then(res => { setLogs(res.data?.entries || []); setTotal(res.data?.total || 0) })
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

  const [selectedBreakdownField, setSelectedBreakdownField] = useState<string | null>(null)
  const breakdownValues = selectedBreakdownField
    ? fields.find(f => f.name === selectedBreakdownField)?.values || []
    : []

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <FacetPanel
        labels={labels} fields={fields} levels={levelCounts}
        selectedLabels={filters.labels} excludeLabels={filters.excludeLabels}
        selectedFields={filters.fields} excludeFields={filters.excludeFields}
        selectedLevels={filters.levels}
        onToggleLabel={toggleLabelValue}
        onToggleField={(name, value, exclude) => { toggleFieldValue(name, value, exclude); setSelectedBreakdownField(name) }}
        onToggleLevel={toggleLevel}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="shrink-0 border-b bg-card px-4 py-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-500 shrink-0 font-mono">LogQL</span>
            <Input value={buildLogQLDisplay()} onChange={e => setLogql(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchAll()} className="h-8 font-mono text-sm" />
            <Button size="sm" onClick={fetchAll} disabled={loading} className="h-8 px-3 shrink-0">
              <Play size={13} className="mr-1" />查询
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={timeRange} onValueChange={(v: string | null) => { if (v) setTimeRange(v) }}>
              <SelectTrigger className="w-[140px] h-7 text-xs">
                <Clock size={12} className="mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="h-4 w-px bg-border" />

            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索日志..." value={filters.search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchAll()} className="h-7 w-48 pl-7 pr-7 text-xs" />
              {filters.search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>
              )}
            </div>

            <div className="flex-1" />

            <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="h-7 text-xs">
              {autoRefresh ? <><Pause size={12} className="mr-1" />暂停</> : <><RefreshCw size={12} className="mr-1" />自动刷新</>}
            </Button>
          </div>

          {hasActiveFilters && <FilterTagBar filters={filters} onRemove={removeFilter} onClearAll={clearAll} />}
        </div>

        <VolumeHistogram data={histogram} onClickBucket={handleClickBucket} />

        <div className="flex-1 overflow-auto">
          <PatternList patterns={patterns} onPatternClick={(p) => setSearch(p)} />
          {selectedBreakdownField && breakdownValues.length > 0 && (
            <FieldBreakdown fieldName={selectedBreakdownField} values={breakdownValues} />
          )}
          <LogEntryList logs={logs} loading={loading} total={total} />
        </div>
      </div>
    </div>
  )
}
