import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Search, FileCode, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

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
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: GcItem[] }>('/mrboard/gatewayclass/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return items.slice(start, start + 20)
  }, [items, page])

  const columns: Column<GcItem>[] = [
    {
      key: 'name', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileCode size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">{d.controller}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'description', header: '描述', render: (d) => d.description || '-' },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/gatewayclass/detail?clusterId=' + clusterId + '&gcName=' + d.name) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/gatewayclass/yaml?clusterId=' + clusterId + '&gcName=' + d.name) }}>
            <FileCode size={15} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="网关控制器" description="GatewayClass 管理" eyebrow="K8s">
        <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
      </PageHeader>
      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={paged as unknown as Record<string, unknown>[]}
        loading={loading}
        pagination={{ page, limit: 20, total: items.length }}
        onPageChange={setPage}
        emptyMessage="暂无数据"
        variant="cards"
      />
    </div>
  )
}
