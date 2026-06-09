import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, List, FolderTree, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface Group {
  Id: number
  Name: string
  Title: string
  Sort: string
  Status: string
}

export default function GroupList() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ Name: '', Title: '', Sort: '', Status: '2' })
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)
  const [addLoading, setAddLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const columns: Column<Group>[] = useMemo(() => [
    {
      key: 'Name', header: '组名', className: 'font-medium', render: (g) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FolderTree size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{g.Name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">{g.Title}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'Sort', header: '排序', className: 'text-xs', render: (g) => g.Sort },
    { key: 'Status', header: '状态', render: (g) => <StatusBadge status={g.Status === '2' ? 'Active' : 'Inactive'} /> },
    {
      key: 'actions', header: '', render: (g) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="URL列表" render={<Link to={`/rbac/node/listByGroup/${g.Id}`} />}>
            <List size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(g) }}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ], [])

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const resp = await api<{ data: Group[]; status: boolean }>('/rbac/group/List')
      setGroups(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleAdd = async () => {
    if (!form.Name || form.Name.length < 3) {
      toast.error('组名至少3个字符')
      return
    }
    if (!form.Title) {
      toast.error('请填写标题')
      return
    }
    if (!form.Sort || !/^\d+$/.test(form.Sort)) {
      toast.error('排序必须为数字')
      return
    }
    setAddLoading(true)
    try {
      await api('/rbac/group/Add', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('添加成功')
      setDialogOpen(false)
      setForm({ Name: '', Title: '', Sort: '', Status: '2' })
      fetchGroups()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api('/rbac/group/Delete', {
        method: 'POST',
        body: JSON.stringify(deleteTarget),
      })
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchGroups()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="目录分组" eyebrow="RBAC">
        <Button onClick={() => { setForm({ Name: '', Title: '', Sort: '', Status: '2' }); setDialogOpen(true) }}>
          <Plus size={16} className="mr-2" />添加
        </Button>
      </PageHeader>

      <DataTable columns={columns} data={groups} loading={loading} emptyMessage="暂无数据" variant="cards" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加分组</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">组名 *</label>
              <Input value={form.Name} onChange={e => update('Name', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">标题 *</label>
              <Input value={form.Title} onChange={e => update('Title', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">排序 *</label>
              <Input value={form.Sort} onChange={e => update('Sort', e.target.value)} placeholder="数字" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">状态</label>
              <Select value={form.Status} onValueChange={v => update('Status', v ?? '')}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">启用</SelectItem>
                  <SelectItem value="1">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={addLoading}>取消</Button>
            <Button onClick={handleAdd} disabled={addLoading}>{addLoading ? <><Loader2 size={14} className="animate-spin mr-1.5" />处理中...</> : '确认添加'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>确定删除分组 {deleteTarget?.Name}？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>{deleteLoading ? <><Loader2 size={14} className="animate-spin mr-1.5" />处理中...</> : '确认删除'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
