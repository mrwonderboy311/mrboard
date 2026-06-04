import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search } from 'lucide-react'
import { toast } from 'sonner'

interface NodePool {
  name: string
  nodeCount: number
  labels: string
  status: string
}

export default function NodePoolList() {
  const [items, setItems] = useState<NodePool[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: NodePool[] }>('/mrboard/node/v1/PoolList?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [clusterId])

  const filtered = searchName ? items.filter(i => i.name.toLowerCase().includes(searchName.toLowerCase())) : items

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">节点池</h1>
      <Card>
        <CardContent className="py-3">
          <div className="flex gap-3 items-center">
            <Input placeholder="搜索节点池" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
            <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>节点数</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : filtered.map(n => (
                <TableRow key={n.name}>
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell>{n.nodeCount}</TableCell>
                  <TableCell className="font-mono text-xs">{n.labels}</TableCell>
                  <TableCell>{n.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
