import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
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
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">管理员列表</h1>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
          <Plus size={16} className="mr-2" />添加
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>电话</TableHead>
                <TableHead>名字</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>上次登录</TableHead>
                <TableHead>登录IP</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : users.map(u => (
                <TableRow key={u.Id}>
                  <TableCell>{u.Id}</TableCell>
                  <TableCell className="font-medium">{u.Username}</TableCell>
                  <TableCell>{u.Telphone}</TableCell>
                  <TableCell>{u.Nickname}</TableCell>
                  <TableCell>{u.Department}</TableCell>
                  <TableCell>{u.Lastlogintime}</TableCell>
                  <TableCell>{u.Lastloginip}</TableCell>
                  <TableCell>
                    <Badge variant={u.Status === '1' ? 'default' : 'secondary'}>
                      {u.Status === '1' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.Remark}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" render={<Link to={`/rbac/admin/edit/${u.Id}`} />}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(u)}>
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
            <Button onClick={handleAdd}>确认添加</Button>
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
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
