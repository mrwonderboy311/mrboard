import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, FileCode } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface SaItem { name: string; nameSpace: string; secrets: number; createTime: string }

export default function ServiceAccountsList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<SaItem[]>([])
  const [filtered, setFiltered] = useState<SaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: SaItem[] }>('/mrboard/serviceaccounts/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.name.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">服务帐号[ServiceAccount]</h1>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>名称</TableHead><TableHead>命名空间</TableHead><TableHead>Secrets</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
        <TableBody>{loading ? <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
        : filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
        : filtered.map(d => (<TableRow key={d.nameSpace + '/' + d.name}><TableCell className="font-medium">{d.name}</TableCell><TableCell>{d.nameSpace}</TableCell><TableCell>{d.secrets}</TableCell><TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell><TableCell><Button variant="outline" size="sm" onClick={() => navigate('/k8s/serviceaccounts/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&name=' + d.name)}><FileCode size={14} /></Button></TableCell></TableRow>))}</TableBody>
      </Table></CardContent></Card>
    </div>
  )
}
