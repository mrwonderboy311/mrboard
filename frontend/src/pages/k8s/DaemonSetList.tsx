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

interface DsItem {
  daemonsetName: string
  nameSpace: string
  podNumber: number
  imgUrl: string
  labels: string
  createTime: string
  status: string
  strategy: string
  selector: string
}

export default function DaemonSetList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<DsItem[]>([])
  const [filtered, setFiltered] = useState<DsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: DsItem[] }>('/mrboard/ds/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.daemonsetName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  const handleDelete = async (item: DsItem) => {
    if (!confirm('确定删除 ' + item.daemonsetName + '？')) return
    try {
      await api('/mrboard/ds/v1/Del?clusterId=' + clusterId + '&nameSpace=' + item.nameSpace + '&dsName=' + item.daemonsetName)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">守护进程集[DaemonSet]</h1>
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
          <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>名称</TableHead><TableHead>命名空间</TableHead><TableHead>Pod数</TableHead><TableHead>状态</TableHead><TableHead>镜像</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">加载中...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            : filtered.map(d => (
              <TableRow key={d.nameSpace + '/' + d.daemonsetName}>
                <TableCell className="font-medium">{d.daemonsetName}</TableCell>
                <TableCell>{d.nameSpace}</TableCell>
                <TableCell>{d.podNumber}</TableCell>
                <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                <TableCell className="font-mono text-xs max-w-xs truncate" title={d.imgUrl}>{d.imgUrl}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/daemonset/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&dsName=' + d.daemonsetName)}><Eye size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/daemonset/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&dsName=' + d.daemonsetName)}><FileCode size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(d)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
