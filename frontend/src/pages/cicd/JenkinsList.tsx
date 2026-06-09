import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiResponse, JenkinsConfig } from '@/types'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const emptyForm = { jks_id: '', jks_url: '', jks_user: '', jks_passwd: '', remarks: '' }

export default function JenkinsList() {
  const [items, setItems] = useState<JenkinsConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<JenkinsConfig | null>(null)

  const fetchList = async () => {
    setLoading(true)
    try {
      const resp = await api<ApiResponse<JenkinsConfig[]>>('/cicd/v1/JksList')
      setItems(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList() }, [])

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const openAdd = () => {
    setEditMode(false)
    setEditId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (item: JenkinsConfig) => {
    setEditMode(true)
    setEditId(item.id)
    setForm({
      jks_id: item.jks_id,
      jks_url: item.jks_url,
      jks_user: item.jks_user,
      jks_passwd: item.jks_passwd,
      remarks: item.remarks || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.jks_id.trim()) { toast.error('jks名称不能为空'); return }
    if (!form.jks_url.trim()) { toast.error('URL不能为空'); return }
    if (!form.jks_user.trim()) { toast.error('帐号不能为空'); return }
    if (!form.jks_passwd.trim()) { toast.error('密码不能为空'); return }

    try {
      const body = {
        ...form,
        jks_id: form.jks_id.trim(),
        jks_url: form.jks_url.trim(),
        jks_user: form.jks_user.trim(),
        jks_passwd: form.jks_passwd.trim(),
        id: editId || 0,
      }
      await api<ApiResponse<unknown>>('/cicd/v1/JksAdd', { method: 'POST', body: JSON.stringify(body) })
      toast.success(editMode ? '修改成功' : '添加成功')
      setDialogOpen(false)
      fetchList()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api<ApiResponse<unknown>>(`/cicd/v1/JksDel?id=${deleteTarget.id}`)
      toast.success('删除成功')
      fetchList()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jenkins帐号管理</h1>
        <Button onClick={openAdd}>
          <Plus size={14} className="mr-1" />添加Jenkins
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>jks名称</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>用户名</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell className="font-medium">{item.jks_id}</TableCell>
                  <TableCell className="font-mono text-sm">{item.jks_url}</TableCell>
                  <TableCell>{item.jks_user}</TableCell>
                  <TableCell>{item.remarks || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.createtime || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(item)}>
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
            <DialogTitle>{editMode ? '编辑Jenkins' : '添加Jenkins'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">jks名称 <span className="text-red-500">*</span></label>
              <Input value={form.jks_id} onChange={e => update('jks_id', e.target.value)} disabled={editMode} placeholder="eg:dx-jenkins" />
              {editMode && <p className="text-xs text-muted-foreground">已使用的名称不能更改</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL <span className="text-red-500">*</span></label>
              <Input value={form.jks_url} onChange={e => update('jks_url', e.target.value)} placeholder="eg:http://192.168.1.100:8080" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">帐号 <span className="text-red-500">*</span></label>
              <Input value={form.jks_user} onChange={e => update('jks_user', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">密码 <span className="text-red-500">*</span></label>
              <Input type="password" value={form.jks_passwd} onChange={e => update('jks_passwd', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input value={form.remarks} onChange={e => update('remarks', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editMode ? '保存' : '添加'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description={`确定删除 ${deleteTarget?.jks_id}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
