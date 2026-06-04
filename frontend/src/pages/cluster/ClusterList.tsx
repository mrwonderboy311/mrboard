import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Cluster, ApiResponse } from '@/types'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

export default function ClusterList() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Cluster | null>(null)

  const columns: Column<Cluster>[] = useMemo(() => [
    { key: 'cluster_name', header: '集群名称', render: (c) => <span className="font-medium">{c.cluster_name}</span> },
    { key: 'cluster_type', header: '集群类型', render: (c) => c.cluster_type },
    { key: 'api_server', header: 'API Server', render: (c) => <span className="font-mono text-sm">{c.api_server}</span> },
    { key: 'status', header: '状态', render: (c) => <StatusBadge status={c.status || 'unknown'} /> },
    {
      key: 'actions', header: '操作', render: (c) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link to={`/cluster/edit/${c.cluster_id}`} />}>
            <Pencil size={14} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteTarget(c)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ], [])

  const fetchClusters = async () => {
    setLoading(true)
    try {
      const resp = await api<ApiResponse<Cluster[]>>('/mrboard/cluster/v1/List')
      setClusters(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClusters() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/mrboard/cluster/v1/Del?cluster_id=' + deleteTarget.cluster_id, { method: 'GET' })
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchClusters()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="集群管理">
        <Button render={<Link to="/cluster/add" />}>
          <Plus size={16} className="mr-2" />添加集群
        </Button>
      </PageHeader>
      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} data={clusters} loading={loading} emptyMessage="暂无集群" />
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>确定删除集群 {deleteTarget?.cluster_name}？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
