import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, FileCode, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

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
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: ScItem[] }>('/mrboard/storageclass/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.name.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const columns: Column<ScItem>[] = [
    { key: 'name', header: '名称', className: 'font-medium', render: (d) => d.name },
    { key: 'provisioner', header: '供给者', render: (d) => d.provisioner },
    { key: 'reclaimPolicy', header: '回收策略', render: (d) => d.reclaimPolicy },
    { key: 'volumeBindingMode', header: '绑定模式', render: (d) => d.volumeBindingMode },
    { key: 'allowVolumeExpansion', header: '允许扩展', render: (d) => d.allowVolumeExpansion ? '是' : '否' },
    { key: 'createTime', header: '创建时间', className: 'text-sm text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '操作', render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => navigate('/k8s/storageclass/detail?clusterId=' + clusterId + '&scName=' + d.name)}><Eye size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/k8s/storageclass/yaml?clusterId=' + clusterId + '&scName=' + d.name)}><FileCode size={14} /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="存储类" description="StorageClass 管理" />
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
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
