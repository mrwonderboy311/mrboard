import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import type { KubeEvent } from '@/types'

export default function EventK8sList() {
  const [items, setItems] = useState<KubeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: KubeEvent[] }>('/mrboard/event/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">事件中心</h1>
        <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>类型</TableHead><TableHead>资源</TableHead><TableHead>名称</TableHead><TableHead>原因</TableHead><TableHead>消息</TableHead><TableHead>时间</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">加载中...</TableCell></TableRow>
            : items.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无事件</TableCell></TableRow>
            : items.map((e, i) => (
              <TableRow key={i}>
                <TableCell><Badge variant={e.eventType === 'Warning' ? 'destructive' : 'default'}>{e.eventType}</Badge></TableCell>
                <TableCell>{e.kind}</TableCell>
                <TableCell className="font-medium">{e.objName}</TableCell>
                <TableCell>{e.reason}</TableCell>
                <TableCell className="max-w-md truncate" title={e.message}>{e.message}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{e.createTime}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
