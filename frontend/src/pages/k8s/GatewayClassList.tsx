import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search, FileCode, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface GcItem {
  name: string
  controller: string
  description: string
  createTime: string
}

export default function GatewayClassList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<GcItem[]>([])
  const [loading, setLoading] = useState(true)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: GcItem[] }>('/mrboard/gatewayclass/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">网关控制器[GatewayClass]</h1>
      <Card><CardContent className="py-3">
        <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>名称</TableHead><TableHead>控制器</TableHead><TableHead>描述</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
            : items.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            : items.map(d => (
              <TableRow key={d.name}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.controller}</TableCell>
                <TableCell>{d.description || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
                <TableCell><div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => navigate('/k8s/gatewayclass/detail?clusterId=' + clusterId + '&gcName=' + d.name)}><Eye size={14} /></Button><Button variant="outline" size="sm" onClick={() => navigate('/k8s/gatewayclass/yaml?clusterId=' + clusterId + '&gcName=' + d.name)}><FileCode size={14} /></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  )
}
