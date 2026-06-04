import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search, FileCode, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface CrdItem {
  cdrName: string
  cdrKind: string
  apiGroup: string
  apiVersion: string
  scope: string
}

export default function CrdList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CrdItem[]>([])
  const [filtered, setFiltered] = useState<CrdItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: CrdItem[] }>('/mrboard/cdr/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.cdrName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  const handleDelete = async (name: string) => {
    if (!confirm('确定删除 CRD ' + name + '？')) return
    try {
      await api('/mrboard/cdr/v1/Del?clusterId=' + clusterId + '&crdName=' + name)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">自定义资源[CRD]</h1>
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索CRD名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
          <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>名称</TableHead><TableHead>组</TableHead><TableHead>版本</TableHead><TableHead>Kind</TableHead><TableHead>范围</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">加载中...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            : filtered.map(d => (
              <TableRow key={d.cdrName}>
                <TableCell className="font-medium">{d.cdrName}</TableCell>
                <TableCell>{d.apiGroup}</TableCell>
                <TableCell>{d.apiVersion}</TableCell>
                <TableCell>{d.cdrKind}</TableCell>
                <TableCell><Badge variant="outline">{d.scope}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/crd/yaml?clusterId=' + clusterId + '&crdName=' + d.cdrName)}><FileCode size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(d.cdrName)}><Trash2 size={14} className="text-destructive" /></Button>
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
