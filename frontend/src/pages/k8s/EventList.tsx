import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { KubeEvent } from '@/types'

export default function EventK8sList() {
  const [items, setItems] = useState<KubeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: KubeEvent[] }>('/mrboard/event/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return items.slice(start, start + 20)
  }, [items, page])

  const columns: Column<KubeEvent>[] = [
    { key: 'eventType', header: '类型', render: (e) => <StatusBadge status={e.eventType} /> },
    { key: 'kind', header: '资源', render: (e) => e.kind },
    { key: 'objName', header: '名称', className: 'font-medium', render: (e) => e.objName },
    { key: 'reason', header: '原因', render: (e) => e.reason },
    { key: 'message', header: '消息', className: 'max-w-md truncate', render: (e) => <span title={e.message}>{e.message}</span> },
    { key: 'createTime', header: '时间', className: 'text-sm text-muted-foreground whitespace-nowrap', render: (e) => e.createTime },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="事件中心" description="集群事件">
        <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
      </PageHeader>
      <Card><CardContent className="p-0">
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={paged as unknown as Record<string, unknown>[]}
          loading={loading}
          pagination={{ page, limit: 20, total: items.length }}
          onPageChange={setPage}
          emptyMessage="暂无事件"
        />
      </CardContent></Card>
    </div>
  )
}
