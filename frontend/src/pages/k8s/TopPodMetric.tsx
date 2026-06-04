import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import type { Pod } from '@/types'

export default function TopPodMetric() {
  const [items, setItems] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [sortBy, setSortBy] = useState<'cpu' | 'mem'>('cpu')
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: Pod[] }>('/mrboard/metrics/v1/PodList?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])

  const filtered = items
    .filter(i => !searchName || i.podName.toLowerCase().includes(searchName.toLowerCase()))
    .sort((a, b) => sortBy === 'cpu' ? (b.cpuUsage || 0) - (a.cpuUsage || 0) : (b.memUsage || 0) - (a.memUsage || 0))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pod Top指标</h1>
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索Pod名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
          <Button variant="outline" size="sm" onClick={() => setSortBy(sortBy === 'cpu' ? 'mem' : 'cpu')}>
            <ArrowUpDown size={14} className="mr-1" />{sortBy === 'cpu' ? '按CPU排序' : '按内存排序'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Pod名称</TableHead><TableHead>命名空间</TableHead><TableHead>CPU (cores)</TableHead><TableHead>内存 (Mi)</TableHead><TableHead>节点</TableHead><TableHead>状态</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">加载中...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            : filtered.map(p => (
              <TableRow key={p.nameSpace + '/' + p.podName}>
                <TableCell className="font-medium max-w-xs truncate" title={p.podName}>{p.podName}</TableCell>
                <TableCell>{p.nameSpace}</TableCell>
                <TableCell className="font-mono">{p.cpuUsage ? p.cpuUsage.toFixed(3) : '-'}</TableCell>
                <TableCell className="font-mono">{p.memUsage ? p.memUsage.toFixed(0) : '-'}</TableCell>
                <TableCell>{p.nodeName}</TableCell>
                <TableCell>{p.podPhase}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
