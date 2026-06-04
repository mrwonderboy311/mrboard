import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
    { key: 'name', header: '名称', className: 'font-medium', render: (d) => d.name },
    { key: 'controller', header: '控制器', render: (d) => d.controller },
    { key: 'description', header: '描述', render: (d) => d.description || '-' },
    { key: 'createTime', header: '创建时间', className: 'text-sm text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '操作', render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/k8s/gatewayclass/detail?clusterId=' + clusterId + '&gcName=' + d.name) }}><Eye size={14} /></Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/k8s/gatewayclass/yaml?clusterId=' + clusterId + '&gcName=' + d.name) }}><FileCode size={14} /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="网关控制器" description="GatewayClass 管理">
        <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
      </PageHeader>
      <Card><CardContent className="p-0">
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={paged as unknown as Record<string, unknown>[]}
          loading={loading}
          pagination={{ page, limit: 20, total: items.length }}
          onPageChange={setPage}
          emptyMessage="暂无数据"
        />
      </CardContent></Card>
    </div>
  )
}
