import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search, Crosshair, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import ServiceGraph from './ServiceGraph'

interface TraceEntry {
  traceID: string
  rootService: string
  rootOperation: string
  duration: number
  startTime: number
  spanCount: number
  status: string
}

const TIME_RANGES = [
  { label: '最近 1 小时', hours: 1 },
  { label: '最近 6 小时', hours: 6 },
  { label: '最近 24 小时', hours: 24 },
  { label: '最近 3 天', hours: 72 },
]

export default function TraceViewer() {
  const navigate = useNavigate()
  const [traces, setTraces] = useState<TraceEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [serviceName, setServiceName] = useState('')
  const [tags, setTags] = useState('')
  const [limit, setLimit] = useState('20')
  const [tab, setTab] = useState<'list' | 'graph'>('list')
  const [clusterId, setClusterId] = useState(localStorage.getItem('clusterId') || '')

  // Search mode
  const [searchMode, setSearchMode] = useState<'trace' | 'spanid'>('trace')
  const [spanID, setSpanID] = useState('')

  // Filters
  const [operation, setOperation] = useState('')
  const [timeRange, setTimeRange] = useState('0')
  const [minDuration, setMinDuration] = useState('')
  const [maxDuration, setMaxDuration] = useState('')

  // Auto-detect clusterId
  useEffect(() => {
    if (clusterId) return
    const timer = setInterval(() => {
      const id = localStorage.getItem('clusterId')
      if (id) { setClusterId(id); clearInterval(timer) }
    }, 500)
    return () => clearInterval(timer)
  }, [clusterId])

  const handleSearch = async () => {
    if (!clusterId) { toast.warning('请先选择集群'); return }
    setLoading(true)
    setHasSearched(true)
    try {
      const params = new URLSearchParams({ clusterId })
      if (serviceName) params.set('service', serviceName)
      if (tags) params.set('tags', tags)
      params.set('limit', limit)
      if (operation) params.set('operation', operation)
      const range = TIME_RANGES[Number(timeRange)]
      const nowNs = Date.now() * 1000000
      params.set('start', String(nowNs - range.hours * 3600 * 1000000000))
      params.set('end', String(nowNs))
      if (minDuration) params.set('minDuration', minDuration)
      if (maxDuration) params.set('maxDuration', maxDuration)
      const res = await api<{ code: number; data: TraceEntry[] }>('/mrboard/trace/v1/Search?' + params.toString())
      setTraces(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  const handleSpanIDSearch = async () => {
    if (!/^[0-9a-fA-F]{32}$/.test(spanID)) {
      toast.error('SpanID 必须为 32 位十六进制字符')
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({ clusterId, spanID })
      const res = await api<{ code: number; data: { traceID: string } }>('/mrboard/trace/v1/TraceBySpanID?' + params.toString())
      if (res.code === 0 && res.data?.traceID) {
        navigate('/log/trace/detail?clusterId=' + clusterId + '&traceId=' + res.data.traceID)
      } else {
        toast.error('未找到该 SpanID 对应的链路')
      }
    } catch {
      toast.error('未找到该 SpanID 对应的链路')
    } finally { setLoading(false) }
  }

  const handleViewTrace = (traceId: string) => {
    navigate('/log/trace/detail?clusterId=' + clusterId + '&traceId=' + traceId)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">链路追踪</h1>
        <div className="flex gap-1">
          <Button variant={tab === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setTab('list')}>链路列表</Button>
          <Button variant={tab === 'graph' ? 'default' : 'outline'} size="sm" onClick={() => setTab('graph')}>服务拓扑</Button>
        </div>
      </div>

      {tab === 'list' && (
        <>
          <Card><CardContent className="py-3 space-y-3">
            {/* Mode toggle */}
            <div className="flex gap-1">
              <Button variant={searchMode === 'trace' ? 'default' : 'outline'} size="sm" onClick={() => setSearchMode('trace')}>
                <Search size={14} className="mr-1" />链路搜索
              </Button>
              <Button variant={searchMode === 'spanid' ? 'default' : 'outline'} size="sm" onClick={() => setSearchMode('spanid')}>
                <Crosshair size={14} className="mr-1" />SpanID 定位
              </Button>
            </div>

            {searchMode === 'trace' ? (
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">服务名称</label>
                  <Input placeholder="my-service" value={serviceName} onChange={e => setServiceName(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">操作名称</label>
                  <Input placeholder="GET /api/v1" value={operation} onChange={e => setOperation(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">标签</label>
                  <Input placeholder="key=value" value={tags} onChange={e => setTags(e.target.value)} className="w-44" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">时间范围</label>
                  <Select value={timeRange} onValueChange={(v: string | null) => { if (v) setTimeRange(v) }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIME_RANGES.map((r, i) => (
                        <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">耗时范围</label>
                  <div className="flex gap-1">
                    <Input placeholder="最小 ms" value={minDuration} onChange={e => setMinDuration(e.target.value)} className="w-24" />
                    <Input placeholder="最大 ms" value={maxDuration} onChange={e => setMaxDuration(e.target.value)} className="w-24" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">数量</label>
                  <Input placeholder="20" value={limit} onChange={e => setLimit(e.target.value)} className="w-20" />
                </div>
                <Button onClick={handleSearch} disabled={loading}>
                  {loading ? <RefreshCw size={14} className="mr-1 animate-spin" /> : <Search size={14} className="mr-1" />}搜索
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">SpanID (32位十六进制)</label>
                  <Input placeholder="a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" value={spanID} onChange={e => setSpanID(e.target.value)} className="w-96 font-mono" />
                </div>
                <Button onClick={handleSpanIDSearch} disabled={loading}>
                  <Crosshair size={14} className="mr-1" />定位
                </Button>
              </div>
            )}
          </CardContent></Card>

          {searchMode === 'trace' && (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>TraceID</TableHead><TableHead>服务</TableHead><TableHead>操作</TableHead><TableHead>耗时(ms)</TableHead><TableHead>Span数</TableHead><TableHead>开始时间</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">搜索中...</TableCell></TableRow>
                  : !hasSearched ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">输入条件后点击搜索</TableCell></TableRow>
                  : traces.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无链路数据</TableCell></TableRow>
                  : traces.map(t => (
                    <TableRow key={t.traceID} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewTrace(t.traceID)}>
                      <TableCell className="font-mono text-xs">{t.traceID.slice(0, 16)}...</TableCell>
                      <TableCell>{t.rootService}</TableCell>
                      <TableCell className="font-medium">{t.rootOperation}</TableCell>
                      <TableCell>
                        <Badge variant={t.duration > 100000000 ? 'destructive' : t.duration > 50000000 ? 'secondary' : 'default'}>
                          {(t.duration / 1000000).toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.spanCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {t.startTime ? new Date(t.startTime / 1000000).toLocaleString('zh-CN', { hour12: false }) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </>
      )}

      {tab === 'graph' && <ServiceGraph />}
    </div>
  )
}
