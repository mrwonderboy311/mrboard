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

import { Plus, Pencil, Trash2, UserCog, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface AdminUser {
  Id: number
  Username: string
  Nickname: string
  Telphone: string
  Email: string
  Company: string
  Department: string
  Lastlogintime: string
  Lastloginip: string
  Createtime: string
  Status: string
  Remark: string
}

interface Role {
  Id: number
  Name: string
  Status: string
}

export default function AdminList() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [form, setForm] = useState({
    Username: '', Nickname: '', Telphone: '', Email: '',
    Company: '', Department: '', Password: '', Repassword: '',
    Status: '1', Remark: '',
  })
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const columns: Column<AdminUser>[] = useMemo(() => [
    {
      key: 'Username', header: '用户名', className: 'font-medium', render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <UserCog size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{u.Username}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">{u.Nickname}</span>
              <span className="text-[10px] text-muted-foreground truncate">{u.Department}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'Telphone', header: '电话', className: 'text-xs', render: (u) => u.Telphone },
    { key: 'Email', header: '邮箱', className: 'text-xs', render: (u) => u.Email },
    { key: 'Lastlogintime', header: '上次登录', className: 'text-xs text-muted-foreground', render: (u) => u.Lastlogintime },
    { key: 'Status', header: '状态', render: (u) => <StatusBadge status={u.Status === '1' ? 'Active' : 'Inactive'} /> },
    {
      key: 'actions', header: '', render: (u) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" title="编辑" render={<Link to={`/rbac/admin/edit/${u.Id}`} />}>
            <Pencil size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(u) }}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ], [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const resp = await api<{ data: AdminUser[]; status: boolean }>('/rbac/user/List')
      setUsers(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const resp = await api<{ data: Role[] }>('/rbac/role/List')
      setRoles(resp.data || [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const toggleRole = (id: string) => {
    setSelectedRoles(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  const resetForm = () => {
    setForm({
      Username: '', Nickname: '', Telphone: '', Email: '',
      Company: '', Department: '', Password: '', Repassword: '',
      Status: '1', Remark: '',
    })
    setSelectedRoles([])
  }

  const handleAdd = async () => {
    if (!form.Username || !form.Telphone || !form.Email || !form.Password) {
      toast.error('请填写必填字段')
      return
    }
    if (form.Password !== form.Repassword) {
      toast.error('两次密码不一致')
      return
    }
    setSaving(true)
    try {
      await api('/rbac/user/Add', {
        method: 'POST',
        body: JSON.stringify({ ...form, Roleid: selectedRoles.join(',') }),
      })
      toast.success('添加成功')
      setDialogOpen(false)
      resetForm()
      fetchUsers()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api('/rbac/user/Delete', {
        method: 'POST',
        body: JSON.stringify(deleteTarget),
      })
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchUsers()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="管理员" eyebrow="RBAC">
        <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
          <Plus size={16} className="mr-2" />添加
        </Button>
      </PageHeader>

      <DataTable columns={columns} data={users} loading={loading} emptyMessage="暂无数据" variant="cards" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>添加管理员</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">用户名 *</label>
                <Input value={form.Username} onChange={e => update('Username', e.target.value)} placeholder="小写英文字母" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">中文名</label>
                <Input value={form.Nickname} onChange={e => update('Nickname', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">手机 *</label>
                <Input value={form.Telphone} onChange={e => update('Telphone', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">邮箱 *</label>
                <Input value={form.Email} onChange={e => update('Email', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">组织机构</label>
                <Input value={form.Company} onChange={e => update('Company', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">部门</label>
                <Input value={form.Department} onChange={e => update('Department', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">密码 *</label>
                <Input type="password" value={form.Password} onChange={e => update('Password', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">确认密码 *</label>
                <Input type="password" value={form.Repassword} onChange={e => update('Repassword', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">角色</label>
              <div className="flex flex-wrap gap-2">
                {roles.map(r => (
                  <label key={r.Id} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(String(r.Id))}
                      onChange={() => toggleRole(String(r.Id))}
                    />
                    {r.Name}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">状态</label>
                <Select value={form.Status} onValueChange={v => update('Status', v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">启用</SelectItem>
                    <SelectItem value="0">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">备注</label>
                <Input value={form.Remark} onChange={e => update('Remark', e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              {saving ? '添加中...' : '确认创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>确定删除用户 {deleteTarget?.Username}？</p>
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
