import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search, FileCode, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface NodeItem {
  nodeName: string
  nodeState: string
  nodeRole: string
  nodeIp: string
  nodeInfo: string
  cpuUsage: string
  memUsage: string
  podNum: string
  capacity: string
  allocatable: string
  unschedulable: string
  podCIDR: string
  createTime: string
}

export default function NodeK8sList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NodeItem[]>([])
  const [filtered, setFiltered] = useState<NodeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: NodeItem[] }>('/mrboard/node/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [clusterId])

  useEffect(() => {
    setFiltered(searchName ? items.filter(i => i.nodeName.toLowerCase().includes(searchName.toLowerCase())) : items)
  }, [items, searchName])

  const handleDelete = async (name: string) => {
    if (!confirm('确定删除节点 ' + name + '？')) return
    try {
      await api('/mrboard/node/v1/Del?clusterId=' + clusterId + '&nodeName=' + name)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">节点列表</h1>
      </div>
      <Card>
        <CardContent className="py-3">
          <div className="flex gap-3 items-center">
            <Input placeholder="搜索节点名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
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
                <TableHead>状态</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>节点信息</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>内存</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : filtered.map(n => (
                <TableRow key={n.nodeName}>
                  <TableCell className="font-medium">{n.nodeName}</TableCell>
                  <TableCell><Badge variant={n.nodeState === 'Ready' ? 'default' : 'destructive'}>{n.nodeState}</Badge></TableCell>
                  <TableCell>{n.nodeRole}</TableCell>
                  <TableCell className="font-mono text-sm">{n.nodeIp}</TableCell>
                  <TableCell className="text-xs">{n.nodeInfo || '-'}</TableCell>
                  <TableCell>{n.cpuUsage}</TableCell>
                  <TableCell>{n.memUsage}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => navigate('/node/detail?clusterId=' + clusterId + '&nodeName=' + n.nodeName)}><Eye size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/node/yaml?clusterId=' + clusterId + '&nodeName=' + n.nodeName)}><FileCode size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(n.nodeName)}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
