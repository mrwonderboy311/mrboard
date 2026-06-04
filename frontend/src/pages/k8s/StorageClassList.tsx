import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, FileCode, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface ScItem {
  name: string
  provisioner: string
  reclaimPolicy: string
  volumeBindingMode: string
  allowVolumeExpansion: boolean
  createTime: string
}

export default function StorageClassList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ScItem[]>([])
  const [filtered, setFiltered] = useState<ScItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: ScItem[] }>('/mrboard/storageclass/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.name.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">存储类[StorageClass]</h1>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>名称</TableHead><TableHead>供给者</TableHead><TableHead>回收策略</TableHead><TableHead>绑定模式</TableHead><TableHead>允许扩展</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
        <TableBody>{loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">加载中...</TableCell></TableRow>
        : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
        : filtered.map(d => (<TableRow key={d.name}><TableCell className="font-medium">{d.name}</TableCell><TableCell>{d.provisioner}</TableCell><TableCell>{d.reclaimPolicy}</TableCell><TableCell>{d.volumeBindingMode}</TableCell><TableCell><Badge variant={d.allowVolumeExpansion ? 'default' : 'secondary'}>{d.allowVolumeExpansion ? '是' : '否'}</Badge></TableCell><TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell><TableCell><div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => navigate('/k8s/storageclass/detail?clusterId=' + clusterId + '&scName=' + d.name)}><Eye size={14} /></Button><Button variant="outline" size="sm" onClick={() => navigate('/k8s/storageclass/yaml?clusterId=' + clusterId + '&scName=' + d.name)}><FileCode size={14} /></Button></div></TableCell></TableRow>))}</TableBody>
      </Table></CardContent></Card>
    </div>
  )
}
