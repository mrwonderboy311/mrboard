import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Server } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

interface NodePool {
  name: string
  nodeCount: number
  labels: string
  status: string
}

export default function NodePoolList() {
  const [items, setItems] = useState<NodePool[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: NodePool[] }>('/mrboard/node/v1/PoolList?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [clusterId])

  const filtered = searchName ? items.filter(i => i.name.toLowerCase().includes(searchName.toLowerCase())) : items

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const columns: Column<NodePool>[] = [
    {
      key: 'name', header: '名称', className: 'font-medium', render: (n) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Server size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{n.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-mono truncate">{n.labels}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'nodeCount', header: '节点数', render: (n) => <Badge variant="secondary" className="tabular-nums text-xs">{n.nodeCount}</Badge> },
    { key: 'status', header: '状态', render: (n) => <Badge variant="outline" className="text-xs">{n.status}</Badge> },
  ]

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="节点池" description="Node Pool 管理" eyebrow="K8s" />
      <Card>
        <CardContent className="py-3">
          <div className="flex gap-3 items-center">
            <Input placeholder="搜索节点池" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
            <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
          </div>
        </CardContent>
      </Card>
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
