import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, FileCode, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

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
  const [page, setPage] = useState(1)
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
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async (item: DsItem) => {
    if (!confirm('确定删除 ' + item.daemonsetName + '？')) return
    try {
      await api('/mrboard/ds/v1/Del?clusterId=' + clusterId + '&nameSpace=' + item.nameSpace + '&dsName=' + item.daemonsetName)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const columns: Column<DsItem>[] = [
    { key: 'daemonsetName', header: '名称', className: 'font-medium', render: (d) => d.daemonsetName },
    { key: 'nameSpace', header: '命名空间', render: (d) => d.nameSpace },
    { key: 'podNumber', header: 'Pod数', render: (d) => d.podNumber },
    { key: 'status', header: '状态', render: (d) => <StatusBadge status={d.status} /> },
    { key: 'imgUrl', header: '镜像', className: 'font-mono text-xs max-w-xs truncate', render: (d) => <span title={d.imgUrl}>{d.imgUrl}</span> },
    { key: 'createTime', header: '创建时间', className: 'text-sm text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '操作', render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => navigate('/k8s/daemonset/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&dsName=' + d.daemonsetName)}><Eye size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/k8s/daemonset/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&dsName=' + d.daemonsetName)}><FileCode size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(d)}><Trash2 size={14} className="text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="守护进程集" description="DaemonSet 管理" />
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
    </div>
  )
}
