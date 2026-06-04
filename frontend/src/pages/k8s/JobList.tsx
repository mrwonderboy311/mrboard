import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface JobItem {
  jobName: string
  nameSpace: string
  completions: number
  parallelism: number
  succeeded: number
  failed: number
  active: number
  imageUrl: string
  createTime: string
}

export default function JobK8sList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<JobItem[]>([])
  const [filtered, setFiltered] = useState<JobItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''
  const [deleteTarget, setDeleteTarget] = useState<JobItem | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: JobItem[] }>('/mrboard/job/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.jobName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/mrboard/job/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&jobName=' + deleteTarget.jobName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">任务[Job]</h1>
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
          <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>名称</TableHead><TableHead>命名空间</TableHead><TableHead>完成数</TableHead><TableHead>成功</TableHead><TableHead>失败</TableHead><TableHead>活跃</TableHead><TableHead>镜像</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={9} className="text-center py-8">加载中...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            : filtered.map(d => (
              <TableRow key={d.nameSpace + '/' + d.jobName}>
                <TableCell className="font-medium">{d.jobName}</TableCell>
                <TableCell>{d.nameSpace}</TableCell>
                <TableCell>{d.completions}</TableCell>
                <TableCell><Badge variant="default">{d.succeeded}</Badge></TableCell>
                <TableCell><Badge variant={d.failed > 0 ? 'destructive' : 'secondary'}>{d.failed}</Badge></TableCell>
                <TableCell>{d.active}</TableCell>
                <TableCell className="font-mono text-xs max-w-xs truncate" title={d.imageUrl}>{d.imageUrl}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/job/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&jobName=' + d.jobName)}><Eye size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/job/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&jobName=' + d.jobName)}><FileCode size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteTarget(d)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p>确定删除 {deleteTarget?.jobName}？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
