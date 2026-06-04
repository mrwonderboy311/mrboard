import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

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
  const [page, setPage] = useState(1)
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
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/mrboard/job/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&jobName=' + deleteTarget.jobName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const columns: Column<JobItem>[] = [
    { key: 'jobName', header: '名称', className: 'font-medium', render: (d) => d.jobName },
    { key: 'nameSpace', header: '命名空间', render: (d) => d.nameSpace },
    { key: 'completions', header: '完成数', render: (d) => d.completions },
    { key: 'succeeded', header: '成功', render: (d) => <StatusBadge status={d.succeeded > 0 ? 'Succeeded' : 'Inactive'} /> },
    { key: 'failed', header: '失败', render: (d) => <StatusBadge status={d.failed > 0 ? 'Failed' : 'Inactive'} /> },
    { key: 'active', header: '活跃', render: (d) => d.active },
    { key: 'imageUrl', header: '镜像', className: 'font-mono text-xs max-w-xs truncate', render: (d) => <span title={d.imageUrl}>{d.imageUrl}</span> },
    { key: 'createTime', header: '创建时间', className: 'text-sm text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '操作', render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => navigate('/k8s/job/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&jobName=' + d.jobName)}><Eye size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/k8s/job/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&jobName=' + d.jobName)}><FileCode size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteTarget(d)}><Trash2 size={14} className="text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="任务" description="Job 管理" />

      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
          <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={paged as unknown as Record<string, unknown>[]}
          loading={loading}
          pagination={{ page, limit: 20, total: filtered.length }}
          onPageChange={setPage}
          emptyMessage="暂无数据"
        />
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
