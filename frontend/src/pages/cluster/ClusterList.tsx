import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Cluster, ApiResponse } from '@/types'

export default function ClusterList() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Cluster | null>(null)

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">集群列表</h1>
        <Button render={<Link to="/cluster/add" />}>
          <Plus size={16} className="mr-2" />添加集群
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>集群名称</TableHead>
                <TableHead>集群类型</TableHead>
                <TableHead>API Server</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : clusters.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无集群</TableCell></TableRow>
              ) : clusters.map(c => (
                <TableRow key={c.cluster_id}>
                  <TableCell className="font-medium">{c.cluster_name}</TableCell>
                  <TableCell>{c.cluster_type}</TableCell>
                  <TableCell className="font-mono text-sm">{c.api_server}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'running' ? 'default' : 'secondary'}>
                      {c.status || 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" render={<Link to={`/cluster/edit/${c.cluster_id}`} />}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(c)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
