import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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
    }
  }

  const handleDelete = async (item: ClusterUser) => {
    if (!confirm('确定取消授权？')) return
    try {
      await api(`/rbac/cluster/Delete?id=${item.id}`)
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">集群授权</h1>
        <Button onClick={() => { setForm({ username: '', clusterId: '' }); setDialogOpen(true) }}>
          <Plus size={16} className="mr-2" />添加
        </Button>
      </div>

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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>集群</TableHead>
                <TableHead>用户</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="font-medium">{item.clusterId}</TableCell>
                  <TableCell>{item.username}</TableCell>
                  <TableCell>{item.createtime}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(item)}>
                      <Trash2 size={14} className="mr-1" />取消授权
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleAdd}>确认添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
