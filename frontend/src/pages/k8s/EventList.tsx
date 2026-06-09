import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, AlertTriangle, Info } from 'lucide-react'
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
    {
      key: 'objName', header: '名称', className: 'font-medium', render: (e) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${e.eventType === 'Warning' ? 'bg-destructive/10' : 'bg-primary/10'}`}>
            {e.eventType === 'Warning' ? <AlertTriangle size={14} className="text-destructive" /> : <Info size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{e.objName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{e.kind}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{e.reason}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'eventType', header: '类型', render: (e) => <StatusBadge status={e.eventType} /> },
    { key: 'message', header: '消息', className: 'max-w-md truncate', render: (e) => <span title={e.message} className="text-xs">{e.message}</span> },
    { key: 'createTime', header: '时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (e) => e.createTime },
  ]

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="事件中心" description="集群事件" eyebrow="K8s">
        <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
      </PageHeader>
      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={paged as unknown as Record<string, unknown>[]}
        loading={loading}
        pagination={{ page, limit: 20, total: items.length }}
        onPageChange={setPage}
        emptyMessage="暂无事件"
        variant="cards"
      />
    </div>
  )
}
