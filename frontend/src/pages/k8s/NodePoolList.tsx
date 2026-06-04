import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
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
    { key: 'name', header: '名称', className: 'font-medium', render: (n) => n.name },
    { key: 'nodeCount', header: '节点数', render: (n) => n.nodeCount },
    { key: 'labels', header: '标签', className: 'font-mono text-xs', render: (n) => n.labels },
    { key: 'status', header: '状态', render: (n) => n.status },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="节点池" description="Node Pool 管理" />
      <Card>
        <CardContent className="py-3">
          <div className="flex gap-3 items-center">
            <Input placeholder="搜索节点池" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
            <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            data={paged as unknown as Record<string, unknown>[]}
            loading={loading}
            pagination={{ page, limit: 20, total: filtered.length }}
            onPageChange={setPage}
            emptyMessage="暂无数据"
          />
        </CardContent>
      </Card>
    </div>
  )
}
