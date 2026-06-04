import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, ArrowLeft, Copy, Check, Database, Globe, Zap, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams, useNavigate } from 'react-router-dom'

interface Span {
  spanID: string
  traceID: string
  parentSpanID: string
  operationName: string
  serviceName: string
  startTime: number
  duration: number
  status: string
  tags: Record<string, string>
}

interface TraceData {
  traceID: string
  spans: Span[]
  services: string[]
  rootService: string
  rootOperation: string
  duration: number
}

interface SpanNode extends Span {
  children: SpanNode[]
  depth: number
}

interface LogEntry {
  timestamp: string
  level: string
  message: string
  namespace: string
  pod: string
  container: string
  app: string
  labels: Record<string, string>
}

const PALETTE = [
  '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899',
  '#14b8a6', '#ef4444', '#eab308', '#6366f1', '#06b6d4',
]

function getServiceColor(service: string, services: string[]): string {
  return PALETTE[services.indexOf(service) % PALETTE.length]
}

function buildSpanTree(spans: Span[]): SpanNode[] {
  const map = new Map<string, SpanNode>()
  const roots: SpanNode[] = []
  for (const s of spans) map.set(s.spanID, { ...s, children: [], depth: 0 })
  for (const node of map.values()) {
    if (node.parentSpanID && map.has(node.parentSpanID)) {
      const parent = map.get(node.parentSpanID)!
      node.depth = parent.depth + 1
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sort = (a: SpanNode, b: SpanNode) => a.startTime - b.startTime
  roots.sort(sort)
  for (const node of map.values()) node.children.sort(sort)
  return roots
}

function flattenVisible(roots: SpanNode[], expanded: Set<string>): SpanNode[] {
  const result: SpanNode[] = []
  const walk = (nodes: SpanNode[]) => {
    for (const n of nodes) {
      result.push(n)
      if (expanded.has(n.spanID)) walk(n.children)
    }
  }
  walk(roots)
  return result
}

function formatDuration(ns: number): string {
  if (ns < 1000) return ns + 'ns'
  if (ns < 1000000) return (ns / 1000).toFixed(1) + 'us'
  if (ns < 1000000000) return (ns / 1000000).toFixed(2) + 'ms'
  return (ns / 1000000000).toFixed(2) + 's'
}

function formatTime(ns: number): string {
  const d = new Date(ns / 1000000)
  return d.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

function getSpanIcon(span: Span) {
  const op = span.operationName.toLowerCase()
  const db = span.tags['db.system'] || span.tags['db.type'] || ''
  if (db || op.includes('sql') || op.includes('query') || op.includes('mongo') || op.includes('redis')) return <Database size={12} />
  if (op.includes('http') || op.includes('get') || op.includes('post') || op.includes('put') || op.includes('delete')) return <Globe size={12} />
  return <Zap size={12} />
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200) }}
      className="p-0.5 rounded hover:bg-muted/50" title="复制">
      {ok ? <Check size={11} className="text-green-500" /> : <Copy size={11} className="text-muted-foreground" />}
    </button>
  )
}

// Minimap component
function Minimap({
  flatNodes, traceStart, traceDuration, selectedIdx, onSelect, services,
}: {
  flatNodes: SpanNode[]; traceStart: number; traceDuration: number; selectedIdx: number;
  onSelect: (idx: number) => void; services: string[]
}) {
  const h = 60
  const barH = Math.min(4, (h - 8) / flatNodes.length)

  return (
    <div className="relative bg-muted/30 rounded" style={{ height: h }}>
      {flatNodes.map((node, i) => {
        const left = traceDuration > 0 ? ((node.startTime - traceStart) / traceDuration) * 100 : 0
        const width = traceDuration > 0 ? Math.max((node.duration / traceDuration) * 100, 0.3) : 0.3
        const color = getServiceColor(node.serviceName, services)
        const isError = node.status === 'error'
        return (
          <div
            key={node.spanID}
            className={`absolute cursor-pointer hover:opacity-100 ${i === selectedIdx ? 'ring-1 ring-blue-500' : ''}`}
            style={{
              left: `${left}%`, width: `${width}%`,
              top: 4 + i * barH,
              height: Math.max(barH - 1, 2),
              backgroundColor: isError ? '#ef4444' : color,
              opacity: i === selectedIdx ? 1 : 0.6,
              minWidth: 1,
            }}
            onClick={() => onSelect(i)}
            title={`${node.operationName} (${node.serviceName}) - ${formatDuration(node.duration)}`}
          />
        )
      })}
      {/* Time labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-muted-foreground px-1">
        <span>0ms</span>
        <span>{formatDuration(traceDuration / 2)}</span>
        <span>{formatDuration(traceDuration)}</span>
      </div>
    </div>
  )
}

// Time axis
function TimeAxis({ traceDuration }: { traceDuration: number }) {
  const ticks = 6
  return (
    <div className="flex justify-between text-[10px] text-muted-foreground px-0">
      {Array.from({ length: ticks + 1 }, (_, i) => (
        <span key={i}>{formatDuration((traceDuration / ticks) * i)}</span>
      ))}
    </div>
  )
}

export default function TraceDetail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const clusterId = searchParams.get('clusterId') || localStorage.getItem('clusterId') || ''
  const traceId = searchParams.get('traceId') || ''

  const [trace, setTrace] = useState<TraceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [detailTab, setDetailTab] = useState<'tags' | 'timing' | 'logs'>('tags')
  const [spanLogs, setSpanLogs] = useState<LogEntry[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  useEffect(() => {
    if (!traceId) return
    setLoading(true)
    api<{ code: number; data: TraceData }>('/mrboard/trace/v1/Trace?clusterId=' + clusterId + '&traceId=' + traceId)
      .then(res => {
        setTrace(res.data)
        const autoExpand = new Set<string>()
        const tree = buildSpanTree(res.data.spans)
        const walk = (nodes: SpanNode[], depth: number) => {
          if (depth > 3) return
          for (const n of nodes) { autoExpand.add(n.spanID); walk(n.children, depth + 1) }
        }
        walk(tree, 0)
        setExpanded(autoExpand)
        setSelectedIdx(0)
      })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setLoading(false))
  }, [clusterId, traceId])

  const roots = useMemo(() => trace ? buildSpanTree(trace.spans) : [], [trace])
  const flatNodes = useMemo(() => flattenVisible(roots, expanded), [roots, expanded])
  const traceStart = flatNodes[0]?.startTime || 0
  const traceDuration = trace?.duration || 1

  const selectedSpan = selectedIdx >= 0 && selectedIdx < flatNodes.length ? flatNodes[selectedIdx] : null

  const nsPadding = useMemo(() => {
    if (!selectedSpan) return 5000000000
    const d = selectedSpan.duration
    if (d < 1000000000) return 2000000000
    if (d < 10000000000) return d
    return 5000000000
  }, [selectedSpan])

  // Fetch logs for selected span when Logs tab is active
  useEffect(() => {
    const span = selectedSpan
    if (detailTab !== 'logs' || !span) { setSpanLogs([]); return }
    const start = String(Math.max(0, span.startTime - nsPadding))
    const end = String(span.startTime + span.duration + nsPadding)
    setLogsLoading(true)
    api<{ code: number; data: { entries: LogEntry[] } }>(
      '/mrboard/log/v1/Query?clusterId=' + clusterId +
      '&services=' + encodeURIComponent(span.serviceName) +
      '&start=' + start + '&end=' + end + '&limit=200&direction=backward'
    )
      .then(res => {
        const sorted = (res.data?.entries || []).sort((a, b) => {
          const aMatch = (a.labels?.traceID === traceId || a.labels?.traceId === traceId || a.labels?.trace_id === traceId) ? 0 : 1
          const bMatch = (b.labels?.traceID === traceId || b.labels?.traceId === traceId || b.labels?.trace_id === traceId) ? 0 : 1
          return aMatch - bMatch
        })
        setSpanLogs(sorted)
      })
      .catch(() => setSpanLogs([]))
      .finally(() => setLogsLoading(false))
  }, [detailTab, selectedIdx, flatNodes, clusterId, traceId, nsPadding])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => {
    if (!trace) return
    const all = new Set(trace.spans.map(s => s.spanID))
    setExpanded(all)
  }

  const collapseAll = () => {
    setExpanded(new Set())
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">加载中...</div>
  if (!trace) return <div className="flex items-center justify-center h-64 text-muted-foreground">未找到链路数据</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}><ArrowLeft size={14} className="mr-1" />返回</Button>
        <h1 className="text-xl font-bold">Trace 详情</h1>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={expandAll}>全部展开</Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>全部折叠</Button>
      </div>

      {/* Trace info bar */}
      <Card><CardContent className="py-2.5 px-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">TraceID</span>
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{trace.traceID}</span>
            <CopyBtn text={trace.traceID} />
          </div>
          <div><span className="text-muted-foreground">Root: </span><span className="font-medium">{trace.rootService}</span><span className="text-muted-foreground ml-1">/</span><span className="ml-1">{trace.rootOperation}</span></div>
          <div><span className="text-muted-foreground">Duration: </span><span className="font-mono font-medium">{formatDuration(trace.duration)}</span></div>
          <div><span className="text-muted-foreground">Spans: </span>{trace.spans.length}</div>
          <div><span className="text-muted-foreground">Start: </span><span className="font-mono text-xs">{formatTime(trace.spans[0]?.startTime || 0)}</span></div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => navigate('/log/loki?traceId=' + traceId + '&clusterId=' + clusterId)}>
            <FileText size={14} className="mr-1" />查看日志
          </Button>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {trace.services.map(s => (
            <span key={s} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium text-white"
              style={{ backgroundColor: getServiceColor(s, trace.services) }}>
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              {s}
            </span>
          ))}
        </div>
      </CardContent></Card>

      {/* Minimap */}
      <Card><CardContent className="py-2 px-4">
        <Minimap flatNodes={flatNodes} traceStart={traceStart} traceDuration={traceDuration} selectedIdx={selectedIdx} onSelect={setSelectedIdx} services={trace.services} />
      </CardContent></Card>

      {/* Waterfall */}
      <Card className="overflow-hidden">
        {/* Time axis header */}
        <div className="px-4 pt-2 pb-1 border-b bg-muted/20" style={{ paddingLeft: 280 }}>
          <TimeAxis traceDuration={traceDuration} />
        </div>

        {/* Column header */}
        <div className="flex items-center border-b bg-muted/30 text-xs font-medium text-muted-foreground sticky top-0 z-10">
          <div className="shrink-0 flex items-center" style={{ width: 280, paddingLeft: 12 }}>
            <span>Operation</span>
          </div>
          <div className="flex-1 text-center">Duration</div>
          <div className="shrink-0 w-24 text-right pr-3">Time</div>
        </div>

        {/* Span rows */}
        <div className="max-h-[500px] overflow-auto">
          {flatNodes.map((node, idx) => {
            const hasChildren = node.children.length > 0
            const isExpanded = expanded.has(node.spanID)
            const isSelected = idx === selectedIdx
            const leftPct = traceDuration > 0 ? ((node.startTime - traceStart) / traceDuration) * 100 : 0
            const widthPct = traceDuration > 0 ? Math.max((node.duration / traceDuration) * 100, 0.2) : 0.2
            const color = getServiceColor(node.serviceName, trace.services)
            const isError = node.status === 'error'

            return (
              <div
                key={node.spanID}
                className={`flex items-center border-b border-border/30 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-muted/20'}`}
                style={{ minHeight: 30 }}
                onClick={() => setSelectedIdx(idx)}
              >
                {/* Indent + expand + name */}
                <div className="flex items-center shrink-0 overflow-hidden" style={{ width: 280, paddingLeft: node.depth * 16 + 8 }}>
                  {hasChildren ? (
                    <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.spanID) }} className="mr-0.5 p-0.5 hover:bg-muted rounded">
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  ) : <span className="w-5 mr-0.5" />}
                  <span className="mr-1 opacity-60">{getSpanIcon(node)}</span>
                  <div className="truncate text-xs flex-1 min-w-0">
                    <span className={isError ? 'text-red-600 font-medium' : 'font-medium'}>{node.operationName}</span>
                    <span className="text-muted-foreground ml-1 shrink-0">{node.serviceName}</span>
                  </div>
                </div>

                {/* Timeline bar */}
                <div className="flex-1 relative" style={{ height: 24 }}>
                  <div
                    className={`absolute top-1 h-5 rounded-sm cursor-pointer flex items-center px-1 transition-opacity ${isSelected ? 'opacity-100 ring-2 ring-blue-400' : 'opacity-75 hover:opacity-100'}`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      minWidth: 2,
                      backgroundColor: isError ? '#ef4444' : color,
                    }}
                    title={`${node.operationName}\n${node.serviceName}\n${formatDuration(node.duration)}`}
                  >
                    {widthPct > 4 && (
                      <span className="text-[10px] text-white font-medium truncate drop-shadow-sm">
                        {formatDuration(node.duration)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Duration text */}
                <div className="shrink-0 w-24 text-right pr-3 text-xs font-mono text-muted-foreground">
                  {formatDuration(node.duration)}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Span detail panel */}
      {selectedSpan && (
        <Card>
          <CardContent className="p-0">
            {/* Detail header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/20">
              <span className="opacity-60">{getSpanIcon(selectedSpan)}</span>
              <span className="font-medium text-sm">{selectedSpan.operationName}</span>
              <Badge variant="outline" className="text-xs" style={{ borderColor: getServiceColor(selectedSpan.serviceName, trace.services), color: getServiceColor(selectedSpan.serviceName, trace.services) }}>
                {selectedSpan.serviceName}
              </Badge>
              {selectedSpan.status === 'error' ? (
                <Badge variant="destructive" className="text-xs">ERROR</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-green-600 border-green-300">OK</Badge>
              )}
              <div className="flex-1" />
              <span className="text-xs text-muted-foreground font-mono">SpanID: {selectedSpan.spanID}</span>
              <CopyBtn text={selectedSpan.spanID} />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/50">
              <div className="bg-background px-4 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Duration</div>
                <div className="text-sm font-mono font-medium">{formatDuration(selectedSpan.duration)}</div>
              </div>
              <div className="bg-background px-4 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Start</div>
                <div className="text-sm font-mono">{formatTime(selectedSpan.startTime)}</div>
              </div>
              <div className="bg-background px-4 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Offset</div>
                <div className="text-sm font-mono">{formatDuration(selectedSpan.startTime - traceStart)}</div>
              </div>
              <div className="bg-background px-4 py-2">
                <div className="text-[10px] text-muted-foreground uppercase">Service</div>
                <div className="text-sm font-medium">{selectedSpan.serviceName}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b">
              <div className="flex gap-0">
                <button onClick={() => setDetailTab('tags')}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${detailTab === 'tags' ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  Attributes ({Object.keys(selectedSpan.tags).filter(k => selectedSpan.tags[k]).length})
                </button>
                <button onClick={() => setDetailTab('timing')}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${detailTab === 'timing' ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  Timing
                </button>
                <button onClick={() => setDetailTab('logs')}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${detailTab === 'logs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  日志
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div className="max-h-[300px] overflow-auto">
              {detailTab === 'tags' && (
                <table className="w-full text-xs">
                  <tbody>
                    {Object.entries(selectedSpan.tags).filter(([, v]) => v).map(([k, v]) => (
                      <tr key={k} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="py-1.5 px-4 text-muted-foreground w-1/3 font-mono">{k}</td>
                        <td className="py-1.5 px-4 font-mono break-all">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {detailTab === 'timing' && (
                <div className="p-4">
                  <div className="relative h-12 bg-muted rounded overflow-hidden">
                    <div
                      className="absolute top-0 h-full rounded flex items-center px-2"
                      style={{
                        left: '0%',
                        width: '100%',
                        backgroundColor: getServiceColor(selectedSpan.serviceName, trace.services) + '30',
                      }}
                    >
                      <div
                        className="h-full rounded"
                        style={{
                          width: '100%',
                          backgroundColor: getServiceColor(selectedSpan.serviceName, trace.services),
                          opacity: 0.6,
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-medium">
                      {formatDuration(selectedSpan.duration)}
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{formatTime(selectedSpan.startTime)}</span>
                    <span>{formatTime(selectedSpan.startTime + selectedSpan.duration)}</span>
                  </div>
                </div>
              )}
              {detailTab === 'logs' && (
                <div className="max-h-[300px] overflow-auto">
                  {logsLoading ? (
                    <div className="py-8 text-center text-muted-foreground text-xs">加载日志中...</div>
                  ) : spanLogs.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-xs">该时间段内暂无日志</div>
                  ) : (
                    <div>
                      <div className="px-4 py-1.5 text-[10px] text-muted-foreground bg-muted/30 border-b">
                        {selectedSpan.serviceName} | {formatTime(selectedSpan.startTime)} ± {formatDuration(nsPadding)} | {spanLogs.length} 条
                      </div>
                      {spanLogs.map((log, i) => {
                        const levelColors: Record<string, string> = {
                          error: 'border-l-red-500 bg-red-500/5',
                          warn: 'border-l-yellow-500 bg-yellow-500/5',
                          warning: 'border-l-yellow-500 bg-yellow-500/5',
                          info: 'border-l-blue-400',
                          debug: 'border-l-gray-400',
                        }
                        const lc = levelColors[log.level?.toLowerCase()] || 'border-l-gray-300'
                        const ts = log.timestamp ? new Date(Number(log.timestamp) / 1000000) : null
                        const timeStr = ts ? ts.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(ts.getMilliseconds()).padStart(3, '0') : '-'
                        return (
                          <div key={i} className={`border-l-2 ${lc} px-3 py-1 text-xs font-mono hover:bg-muted/20`}>
                            <span className="text-muted-foreground whitespace-nowrap mr-2">{timeStr}</span>
                            {log.level && <span className="text-[10px] mr-1.5 opacity-70">[{log.level}]</span>}
                            <span className="break-all">{log.message}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
