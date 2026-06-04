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
import { Plus, Trash2, Users, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface Role {
  Id: number
  Name: string
  Status: string
  Remark: string
}

export default function RoleList() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ Name: '', Status: '2', Remark: '' })
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  const fetchRoles = async () => {
    setLoading(true)
    try {
      const resp = await api<{ data: Role[]; status: boolean }>('/rbac/role/List')
      setRoles(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRoles() }, [])

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleAdd = async () => {
    if (!form.Name || form.Name.length < 2) {
      toast.error('角色名至少2个字符')
      return
    }
    try {
      await api('/rbac/role/AddAndEdit', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('添加成功')
      setDialogOpen(false)
      setForm({ Name: '', Status: '2', Remark: '' })
      fetchRoles()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/rbac/role/Delete', {
        method: 'POST',
        body: JSON.stringify(deleteTarget),
      })
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchRoles()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">角色列表</h1>
        <Button onClick={() => { setForm({ Name: '', Status: '2', Remark: '' }); setDialogOpen(true) }}>
          <Plus size={16} className="mr-2" />添加
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>角色名</TableHead>
                <TableHead className="w-20">状态</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : roles.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : roles.map(r => (
                <TableRow key={r.Id}>
                  <TableCell>{r.Id}</TableCell>
                  <TableCell className="font-medium">{r.Name}</TableCell>
                  <TableCell>
                    <Badge variant={r.Status === '2' ? 'default' : 'secondary'}>
                      {r.Status === '2' ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.Remark}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" render={<Link to={`/rbac/role/nodeList/${r.Id}`} />}>
                        <Shield size={14} className="mr-1" />授权列表
                      </Button>
                      <Button variant="outline" size="sm" render={<Link to={`/rbac/role/userList/${r.Id}`} />}>
                        <Users size={14} className="mr-1" />用户列表
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(r)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加角色</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">角色名 *</label>
              <Input value={form.Name} onChange={e => update('Name', e.target.value)} />
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
            <div className="space-y-1">
              <label className="text-sm font-medium">备注</label>
              <Input value={form.Remark} onChange={e => update('Remark', e.target.value)} />
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
          <p>确定删除角色 {deleteTarget?.Name}？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
