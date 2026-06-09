import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Server, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Cluster, ApiResponse } from '@/types'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

export default function ClusterList() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Cluster | null>(null)
  const [deleting, setDeleting] = useState(false)

  const columns: Column<Cluster>[] = useMemo(() => [
    {
      key: 'cluster_name', header: '集群名称', className: 'font-medium', render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Server size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{c.cluster_name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">{c.cluster_type}</span>
              <span className="text-[10px] text-muted-foreground font-mono truncate">{c.api_server}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'status', header: '状态', render: (c) => <StatusBadge status={c.status || 'unknown'} /> },
    {
      key: 'actions', header: '', render: (c) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" title="编辑" render={<Link to={`/cluster/edit/${c.cluster_id}`} />}>
            <Pencil size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(c) }}>
            <Trash2 size={15} />
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
    setDeleting(true)
    try {
      await api('/mrboard/cluster/v1/Del?cluster_id=' + deleteTarget.cluster_id, { method: 'GET' })
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchClusters()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="集群管理" eyebrow="Infrastructure">
        <Button render={<Link to="/cluster/add" />}>
          <Plus size={16} className="mr-2" />添加集群
        </Button>
      </PageHeader>
      <DataTable columns={columns} data={clusters} loading={loading} emptyMessage="暂无集群" variant="cards" />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>确定删除集群 {deleteTarget?.cluster_name}？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
