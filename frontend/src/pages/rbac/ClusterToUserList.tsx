import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface ClusterUser {
  id: number
  clusterId: string
  username: string
  createtime: string
}

interface ClusterOption {
  cluster_id: string
}

interface UserOption {
  Username: string
}

export default function ClusterToUserList() {
  const [items, setItems] = useState<ClusterUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [clusters, setClusters] = useState<ClusterOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [form, setForm] = useState({ username: '', clusterId: '' })
  const [searchUser, setSearchUser] = useState('')
  const [searchCluster, setSearchCluster] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ClusterUser | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  const columns: Column<ClusterUser>[] = useMemo(() => [
    {
      key: 'clusterId', header: '集群', className: 'font-medium', render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Link2 size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{item.clusterId}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">{item.username}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'createtime', header: '创建时间', className: 'text-xs text-muted-foreground', render: (item) => item.createtime },
    {
      key: 'actions', header: '', render: (item) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="取消授权"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(item) }}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ], [])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const resp = await api<{ data: ClusterUser[]; code: number }>('/rbac/cluster/List')
      setItems(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const [clusterResp, userResp] = await Promise.all([
        api<{ data: ClusterOption[] }>('/mrboard/cluster/v1/List'),
        api<{ data: UserOption[] }>('/rbac/user/List'),
      ])
      setClusters(clusterResp.data || [])
      setUsers(userResp.data || [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchItems()
    fetchOptions()
  }, [])

  const handleAdd = async () => {
    if (!form.username || !form.clusterId) {
      toast.error('请选择用户和集群')
      return
    }
    setAddLoading(true)
    try {
      await api('/rbac/cluster/Add', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('添加成功')
      setDialogOpen(false)
      setForm({ username: '', clusterId: '' })
      fetchItems()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api(`/rbac/cluster/Delete?id=${deleteTarget.id}`)
      toast.success('删除成功')
      fetchItems()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleSearch = async () => {
    setLoading(true)
    try {
      const resp = await api<{ data: ClusterUser[]; code: number }>('/rbac/cluster/List', {
        method: 'POST',
        body: JSON.stringify({ username: searchUser, cluster_id: searchCluster }),
      })
      setItems(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="集群授权" eyebrow="RBAC">
        <Button onClick={() => { setForm({ username: '', clusterId: '' }); setDialogOpen(true) }}>
          <Plus size={16} className="mr-2" />添加
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">用户</label>
              <Select value={searchUser} onValueChange={v => setSearchUser(v ?? '')}>
                <SelectTrigger className="w-48"><SelectValue placeholder="请选择用户" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.Username} value={u.Username}>{u.Username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">集群</label>
              <Select value={searchCluster} onValueChange={v => setSearchCluster(v ?? '')}>
                <SelectTrigger className="w-48"><SelectValue placeholder="请选择集群" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  <SelectItem value="all">全部集群</SelectItem>
                  {clusters.map(c => (
                    <SelectItem key={c.cluster_id} value={c.cluster_id}>{c.cluster_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}>搜索</Button>
          </div>

          <DataTable columns={columns} data={items} loading={loading} emptyMessage="暂无数据" variant="cards" />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>集群授权用户</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">用户</label>
              <Select value={form.username} onValueChange={v => setForm(prev => ({ ...prev, username: v ?? '' }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="请选择用户" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.Username} value={u.Username}>{u.Username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">集群</label>
              <Select value={form.clusterId} onValueChange={v => setForm(prev => ({ ...prev, clusterId: v ?? '' }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="请选择集群" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部集群</SelectItem>
                  {clusters.map(c => (
                    <SelectItem key={c.cluster_id} value={c.cluster_id}>{c.cluster_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={addLoading}>取消</Button>
            <Button onClick={handleAdd} disabled={addLoading}>{addLoading ? <><Loader2 size={14} className="animate-spin mr-1.5" />处理中...</> : '确认创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description="确定取消授权？"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
