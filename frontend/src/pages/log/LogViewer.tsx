import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ChevronDown, ChevronRight, Copy, Check,
  Search, X, Clock, RefreshCw, Filter, Pause, Play,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

// --- Types ---
interface LogEntry {
  timestamp: string
  level: string
  message: string
  namespace: string
  pod: string
  container: string
  app: string
  service_name: string
  labels: Record<string, string>
}

interface HistogramBucket {
  time: number
  total: number
  error: number
  warn: number
  info: number
  debug: number
}

interface LevelCount {
  level: string
  count: number
}

// --- Constants ---
const TIME_RANGES = [
  { label: '最近 5 分钟', value: '5m', ms: 5 * 60 * 1000 },
  { label: '最近 15 分钟', value: '15m', ms: 15 * 60 * 1000 },
  { label: '最近 1 小时', value: '1h', ms: 60 * 60 * 1000 },
  { label: '最近 3 小时', value: '3h', ms: 3 * 60 * 60 * 1000 },
  { label: '最近 6 小时', value: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '最近 12 小时', value: '12h', ms: 12 * 60 * 60 * 1000 },
  { label: '最近 24 小时', value: '24h', ms: 24 * 60 * 60 * 1000 },
]

const LEVEL_CONFIG: Record<string, { color: string; bg: string; barColor: string; label: string }> = {
  error:   { color: 'text-red-600',    bg: 'bg-red-50',    barColor: '#ef4444', label: 'ERROR' },
  warn:    { color: 'text-yellow-600', bg: 'bg-yellow-50', barColor: '#eab308', label: 'WARN' },
  warning: { color: 'text-yellow-600', bg: 'bg-yellow-50', barColor: '#eab308', label: 'WARN' },
  info:    { color: 'text-blue-600',   bg: 'bg-blue-50',   barColor: '#3b82f6', label: 'INFO' },
  debug:   { color: 'text-gray-500',   bg: 'bg-gray-50',   barColor: '#6b7280', label: 'DEBUG' },
}

function getLevelConfig(level: string) {
  return LEVEL_CONFIG[level?.toLowerCase()] || LEVEL_CONFIG.info
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
      title="复制"
    >
      {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} className="text-muted-foreground" />}
    </button>
  )
}

function formatTimestamp(ts: string) {
  if (!ts) return '-'
  const d = new Date(Number(ts) / 1_000_000)
  return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

function formatFullTime(ts: string) {
  if (!ts) return '-'
  const d = new Date(Number(ts) / 1_000_000)
  return d.toLocaleString('zh-CN', { hour12: false })
}

function buildLogQL(namespace: string, services: string[], searchText: string): string {
  const selectors: string[] = []
  if (namespace) selectors.push(`namespace="${namespace}"`)
  if (services.length === 1) selectors.push(`service_name="${services[0]}"`)
  else if (services.length > 1) selectors.push(`service_name=~"${services.join('|')}"`)
  const selector = selectors.length > 0 ? `{${selectors.join(', ')}}` : '{}'
  const filter = searchText ? ` |= \`${searchText}\`` : ''
  return `${selector}${filter}`
}

// --- Main component ---
export default function LogViewer() {
  const clusterId = localStorage.getItem('clusterId') || ''

  // Time range
  const [timeRange, setTimeRange] = useState('1h')

  // Label browser state
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [namespace, setNamespace] = useState('')
  const [availableServices, setAvailableServices] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [nsExpanded, setNsExpanded] = useState(true)
  const [svcExpanded, setSvcExpanded] = useState(true)
  const [nsSearch, setNsSearch] = useState('')
  const [svcSearch, setSvcSearch] = useState('')

  // Query
  const [searchText, setSearchText] = useState('')
  const [logql, setLogql] = useState('')

  // Level filters
  const [activeLevels, setActiveLevels] = useState<Set<string>>(new Set(['error', 'warn', 'info', 'debug']))

  // Data
  const [histogram, setHistogram] = useState<HistogramBucket[]>([])
  const [levelCounts, setLevelCounts] = useState<LevelCount[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasQueried, setHasQueried] = useState(false)

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // UI state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Compute time window
  const computeTimeWindow = useCallback((range: string) => {
    const r = TIME_RANGES.find(t => t.value === range)
    const now = Date.now()
    const s = String((now - (r?.ms || 3600000)) * 1_000_000)
    const e = String(now * 1_000_000)
    return { start: s, end: e }
  }, [])

  // Fetch namespaces
  useEffect(() => {
    if (!clusterId) return
    api<{ code: number; data: string[] }>('/mrboard/log/v1/Labels?clusterId=' + clusterId + '&label=namespace')
      .then(res => setNamespaces(res.data || []))
      .catch(() => {})
  }, [clusterId])

  // Fetch services when namespace changes
  useEffect(() => {
    if (!clusterId || !namespace) { setAvailableServices([]); setSelectedServices([]); return }
    api<{ code: number; data: string[] }>('/mrboard/log/v1/LabelValues?clusterId=' + clusterId + '&label=service_name&namespace=' + namespace)
      .then(res => setAvailableServices(res.data || []))
      .catch(() => {})
  }, [clusterId, namespace])

  // Update LogQL
  useEffect(() => {
    setLogql(buildLogQL(namespace, selectedServices, searchText))
  }, [namespace, selectedServices, searchText])

  // Build query params
  const buildParams = useCallback(() => {
    const { start: s, end: e } = computeTimeWindow(timeRange)
    const params = new URLSearchParams()
    params.set('clusterId', clusterId)
    if (namespace) params.set('namespace', namespace)
    if (selectedServices.length > 0) params.set('services', selectedServices.join(','))
    const lvl = Array.from(activeLevels)
    if (lvl.length > 0 && lvl.length < 4) params.set('levels', lvl.join(','))
    if (searchText) params.set('search', searchText)
    params.set('start', s)
    params.set('end', e)
    return params
  }, [clusterId, namespace, selectedServices, activeLevels, searchText, timeRange, computeTimeWindow])

  // Fetch histogram
  const fetchHistogram = useCallback(async () => {
    if (!clusterId || !namespace) return
    try {
      const params = buildParams()
      const res = await api<{ code: number; data: HistogramBucket[] }>('/mrboard/log/v1/Histogram?' + params.toString())
      setHistogram(res.data || [])
    } catch { /* optional */ }
  }, [clusterId, namespace, buildParams])

  // Fetch level counts
  const fetchLevels = useCallback(async () => {
    if (!clusterId || !namespace) return
    try {
      const params = buildParams()
      const res = await api<{ code: number; data: LevelCount[] }>('/mrboard/log/v1/Levels?' + params.toString())
      setLevelCounts(res.data || [])
    } catch { /* optional */ }
  }, [clusterId, namespace, buildParams])

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    if (!clusterId || !namespace) return
    setLoading(true)
    try {
      const params = buildParams()
      params.set('limit', '500')
      params.set('direction', 'backward')
      const res = await api<{ code: number; data: { entries: LogEntry[]; total: number } }>('/mrboard/log/v1/Query?' + params.toString())
      setLogs(res.data?.entries || [])
      setTotal(res.data?.total || 0)
      setExpandedRows(new Set())
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [clusterId, namespace, buildParams])

  // Fetch all data
  const fetchAll = useCallback(() => {
    if (!namespace) return
    fetchHistogram()
    fetchLevels()
    fetchLogs()
  }, [namespace, fetchHistogram, fetchLevels, fetchLogs])

  // Handle query button
  const handleQuery = useCallback(() => {
    if (!namespace) { toast.warning('请先选择命名空间'); return }
    setHasQueried(true)
    fetchAll()
  }, [namespace, fetchAll])

  // Auto-refresh: poll every 5s when enabled
  useEffect(() => {
    if (autoRefresh && namespace && hasQueried) {
      refreshTimerRef.current = setInterval(() => {
        fetchAll()
      }, 5000)
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [autoRefresh, namespace, hasQueried, fetchAll])

  // Auto-fetch histogram when namespace selected
  useEffect(() => {
    if (!clusterId || !namespace) { setHistogram([]); setLevelCounts([]); return }
    fetchHistogram()
    fetchLevels()
  }, [clusterId, namespace, selectedServices, timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleLevel = (level: string) => {
    setActiveLevels(prev => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const selectNamespace = (ns: string) => {
    setNamespace(ns)
    setSelectedServices([])
    setHasQueried(false)
    setLogs([])
    setHistogram([])
    setLevelCounts([])
    setTotal(0)
    setAutoRefresh(false)
  }

  const toggleService = (svc: string) => {
    setSelectedServices(prev =>
      prev.includes(svc) ? prev.filter(s => s !== svc) : [...prev, svc]
    )
  }

  const totalByLevel = levelCounts.reduce<Record<string, number>>((acc, lc) => {
    acc[lc.level] = lc.count
    return acc
  }, {})

  const filteredNamespaces = nsSearch ? namespaces.filter(n => n.includes(nsSearch)) : namespaces
  const filteredServices = svcSearch ? availableServices.filter(s => s.includes(svcSearch)) : availableServices

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* ===== Left Sidebar: Label Browser ===== */}
      <div className="w-[240px] shrink-0 border-r bg-card flex flex-col overflow-hidden">
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter size={14} className="text-muted-foreground" />
            标签浏览器
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Namespace section */}
          <div>
            <button
              className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50"
              onClick={() => setNsExpanded(!nsExpanded)}
            >
              {nsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              命名空间
              <span className="ml-auto text-muted-foreground/60 normal-case tracking-normal">{namespaces.length}</span>
            </button>
            {nsExpanded && (
              <div>
                <div className="px-3 pb-1">
                  <div className="relative">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="过滤..."
                      value={nsSearch}
                      onChange={e => setNsSearch(e.target.value)}
                      className="h-6 pl-7 text-xs"
                    />
                  </div>
                </div>
                {filteredNamespaces.map(ns => (
                  <button
                    key={ns}
                    onClick={() => selectNamespace(ns)}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors ${
                      namespace === ns
                        ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500 font-medium'
                        : 'text-foreground hover:bg-muted/50 border-l-2 border-transparent'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400/60 shrink-0" />
                    <span className="truncate">{ns}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Service list */}
          {namespace && (
            <div>
              <button
                className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50"
                onClick={() => setSvcExpanded(!svcExpanded)}
              >
                {svcExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                服务
                <span className="ml-auto text-muted-foreground/60 normal-case tracking-normal">{availableServices.length}</span>
              </button>
              {svcExpanded && (
                <div>
                  <div className="px-3 pb-1">
                    <div className="relative">
                      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="过滤..."
                        value={svcSearch}
                        onChange={e => setSvcSearch(e.target.value)}
                        className="h-6 pl-7 text-xs"
                      />
                    </div>
                  </div>
                  {filteredServices.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">暂无服务</div>
                  )}
                  {filteredServices.map(svc => {
                    const selected = selectedServices.includes(svc)
                    return (
                      <button
                        key={svc}
                        onClick={() => toggleService(svc)}
                        className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors ${
                          selected ? 'bg-green-50 text-green-700 font-medium' : 'text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${
                          selected ? 'bg-green-500 border-green-500' : 'border-muted-foreground/30'
                        }`}>
                          {selected && <Check size={10} className="text-white" />}
                        </div>
                        <span className="truncate">{svc}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected filters summary */}
        {(namespace || selectedServices.length > 0) && (
          <div className="p-3 border-t space-y-1.5">
            {namespace && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">ns:</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {namespace}
                  <X size={10} className="ml-1 cursor-pointer hover:text-destructive" onClick={() => selectNamespace('')} />
                </Badge>
              </div>
            )}
            {selectedServices.length > 0 && (
              <div className="flex items-center gap-1 text-xs flex-wrap">
                <span className="text-muted-foreground">svc:</span>
                {selectedServices.map(s => (
                  <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {s}
                    <X size={10} className="ml-1 cursor-pointer hover:text-destructive" onClick={() => toggleService(s)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Main Content ===== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar: LogQL + Time + Actions */}
        <div className="shrink-0 border-b bg-card px-4 py-2.5 space-y-2">
          {/* LogQL query bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-500 shrink-0 font-mono">LogQL</span>
            <Input
              value={logql}
              onChange={e => setLogql(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              placeholder='{namespace="default"} |= `error`'
              className="h-8 font-mono text-sm"
            />
            <Button size="sm" onClick={handleQuery} disabled={loading || !namespace} className="h-8 px-3 shrink-0">
              <Play size={13} className="mr-1" />查询
            </Button>
          </div>

          {/* Time range + level filters + auto-refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={timeRange} onValueChange={(v: string | null) => { if (v) setTimeRange(v) }}>
              <SelectTrigger className="w-[140px] h-7 text-xs">
                <Clock size={12} className="mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(r => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-4 w-px bg-border" />

            {/* Level toggles */}
            {['error', 'warn', 'info', 'debug'].map(lvl => {
              const cfg = getLevelConfig(lvl)
              const active = activeLevels.has(lvl)
              const count = totalByLevel[lvl] || 0
              return (
                <button
                  key={lvl}
                  onClick={() => toggleLevel(lvl)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    active ? `${cfg.bg} ${cfg.color}` : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? '' : 'opacity-30'}`} style={{ backgroundColor: cfg.barColor }} />
                  {cfg.label}
                  {count > 0 && <span className="opacity-60 ml-0.5">{count > 999 ? `${(count/1000).toFixed(1)}k` : count}</span>}
                </button>
              )
            })}

            <div className="h-4 w-px bg-border" />

            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索日志..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
                className="h-7 w-48 pl-7 pr-7 text-xs"
              />
              {searchText && (
                <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex-1" />

            {/* Auto-refresh toggle */}
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              disabled={!namespace || !hasQueried}
              className="h-7 text-xs"
            >
              {autoRefresh ? (
                <><Pause size={12} className="mr-1" />暂停刷新</>
              ) : (
                <><RefreshCw size={12} className="mr-1" />自动刷新</>
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={handleQuery} disabled={loading || !namespace} className="h-7">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Log volume histogram */}
        {histogram.length > 0 && (
          <div className="shrink-0 h-[100px] px-4 py-1 border-b">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={histogram}
                barGap={0}
                barCategoryGap="5%"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(e: any) => {
                  const bucket = e?.activePayload?.[0]?.payload
                  if (!bucket?.time) return
                  const bucketStart = String((bucket.time - 30) * 1_000_000)
                  const bucketEnd = String((bucket.time + 30) * 1_000_000)
                  const params = new URLSearchParams()
                  params.set('clusterId', clusterId)
                  params.set('namespace', namespace)
                  if (selectedServices.length > 0) params.set('services', selectedServices.join(','))
                  params.set('start', bucketStart)
                  params.set('end', bucketEnd)
                  params.set('limit', '200')
                  params.set('direction', 'backward')
                  setLoading(true)
                  api<{ code: number; data: { entries: LogEntry[]; total: number } }>('/mrboard/log/v1/Query?' + params.toString())
                    .then(res => { setLogs(res.data?.entries || []); setTotal(res.data?.total || 0); setHasQueried(true); setExpandedRows(new Set()) })
                    .catch(err => toast.error((err as Error).message))
                    .finally(() => setLoading(false))
                }}
              >
                <XAxis
                  dataKey="time"
                  tickFormatter={(t) => {
                    const d = new Date(t / 1_000_000)
                    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
                  }}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  labelFormatter={(t) => formatFullTime(String(t))}
                  formatter={(value: unknown, name: unknown) => [String(value), String(name)]}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0' }}
                  cursor={{ fill: 'rgba(59,130,246,0.1)' }}
                />
                <Bar dataKey="error" stackId="a" fill={LEVEL_CONFIG.error.barColor} cursor="pointer" />
                <Bar dataKey="warn" stackId="a" fill={LEVEL_CONFIG.warn.barColor} cursor="pointer" />
                <Bar dataKey="info" stackId="a" fill={LEVEL_CONFIG.info.barColor} cursor="pointer" />
                <Bar dataKey="debug" stackId="a" fill={LEVEL_CONFIG.debug.barColor} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status bar */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-1 border-b text-[11px] text-muted-foreground bg-muted/30">
          {autoRefresh && (
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              自动刷新中 (5s)
            </span>
          )}
          {loading ? (
            <span>查询中...</span>
          ) : hasQueried ? (
            <span>{total.toLocaleString()} 条日志{logs.length > 500 ? ` (显示前 500 条)` : ''}</span>
          ) : (
            <span>选择命名空间和服务后，点击查询</span>
          )}
        </div>

        {/* Log entries */}
        <div ref={logContainerRef} className="flex-1 overflow-auto">
          {!namespace ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <Filter size={32} className="text-muted-foreground/40" />
              <span>从左侧选择命名空间开始</span>
              <span className="text-xs">命名空间 → 服务 → 查询</span>
            </div>
          ) : !hasQueried ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-3">
              <Play size={32} className="text-muted-foreground/40" />
              <span>点击 <b>查询</b> 获取日志</span>
              <span className="text-xs">查询后可开启自动刷新</span>
            </div>
          ) : loading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <RefreshCw size={16} className="animate-spin mr-2" />加载中...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <span>暂无日志</span>
              <span className="text-xs">尝试调整时间范围或过滤条件</span>
            </div>
          ) : (
            <div className="font-mono text-[12px] leading-[1.6]">
              {logs.slice(0, 500).map((log, idx) => {
                const lvl = (log.level || 'info').toLowerCase()
                const cfg = getLevelConfig(lvl)
                const isExpanded = expandedRows.has(idx)
                const hasLabels = log.labels && Object.keys(log.labels).length > 0

                return (
                  <div
                    key={idx}
                    className={`group border-b border-border/40 hover:bg-muted/30 transition-colors ${
                      lvl === 'error' ? 'bg-red-50/50' : lvl === 'warn' ? 'bg-yellow-50/30' : ''
                    }`}
                  >
                    <div
                      className="flex items-start gap-0 cursor-pointer px-3 py-[2px]"
                      onClick={() => toggleRow(idx)}
                    >
                      <span className="w-4 shrink-0 pt-0.5 text-muted-foreground/40">
                        {hasLabels ? (isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />) : null}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap shrink-0 w-[95px] text-[11px]">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className={`shrink-0 w-[42px] text-center text-[10px] font-bold uppercase ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {(log.service_name || log.pod) && (
                        <span className="shrink-0 text-[11px] text-cyan-600/70 max-w-[140px] truncate mr-2" title={log.pod || log.service_name}>
                          {log.service_name || log.pod}
                        </span>
                      )}
                      <span className={`flex-1 min-w-0 break-all text-foreground/80 ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
                        {log.message}
                      </span>
                      <CopyButton text={log.message} />
                    </div>

                    {isExpanded && hasLabels && (
                      <div className="pl-10 pr-3 pb-2">
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                          {Object.entries(log.labels).map(([k, v]) => (
                            <span key={k}>
                              <span className="text-muted-foreground">{k}</span>=<span className="text-foreground">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                        {log.namespace && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            namespace: {log.namespace} | pod: {log.pod} | container: {log.container}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
