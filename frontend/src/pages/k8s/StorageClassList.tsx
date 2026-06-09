import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, FileCode, Eye, Database } from 'lucide-react'
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
    {
      key: 'name', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Database size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-mono truncate">{d.provisioner}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'reclaimPolicy', header: '回收策略', render: (d) => <Badge variant="secondary" className="text-xs">{d.reclaimPolicy}</Badge> },
    { key: 'volumeBindingMode', header: '绑定模式', render: (d) => <span className="text-xs">{d.volumeBindingMode}</span> },
    { key: 'allowVolumeExpansion', header: '允许扩展', render: (d) => <Badge variant={d.allowVolumeExpansion ? 'default' : 'outline'} className="text-xs">{d.allowVolumeExpansion ? '是' : '否'}</Badge> },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/storageclass/detail?clusterId=' + clusterId + '&scName=' + d.name) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/storageclass/yaml?clusterId=' + clusterId + '&scName=' + d.name) }}>
            <FileCode size={15} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="存储类" description="StorageClass 管理" eyebrow="K8s" />
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={paged as unknown as Record<string, unknown>[]}
        loading={loading}
        pagination={{ page, limit: 20, total: filtered.length }}
        onPageChange={setPage}
        emptyMessage="暂无数据"
        variant="cards"
      />
    </div>
  )
}
