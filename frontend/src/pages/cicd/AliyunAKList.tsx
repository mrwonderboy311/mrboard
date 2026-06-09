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
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiResponse, AliyunAK, AliyunOrganization } from '@/types'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

const emptyForm = {
  aliyun_id: '', accesskey_id: '', accesskey_secret: '', organization_id: '', remarks: '',
}

export default function AliyunAKList() {
  const [items, setItems] = useState<AliyunAK[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [verifying, setVerifying] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AliyunAK | null>(null)

  const fetchList = async () => {
    setLoading(true)
    try {
      const resp = await api<ApiResponse<AliyunAK[]>>('/cicd/v1/AkList')
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

  const openEdit = (item: AliyunAK) => {
    setEditMode(true)
    setEditId(item.id)
    setForm({
      aliyun_id: item.aliyun_id,
      accesskey_id: item.accesskey_id,
      accesskey_secret: item.accesskey_secret,
      organization_id: item.organization_id || '',
      remarks: item.remarks || '',
    })
    setDialogOpen(true)
  }

  const handleVerifyAK = async () => {
    if (!form.accesskey_id.trim() || !form.accesskey_secret.trim()) {
      toast.error('请先填写accesskeyId和accesskeySecret')
      return
    }
    setVerifying(true)
    try {
      const resp = await api<{ success: boolean; organizations?: AliyunOrganization[]; msg?: string }>(
        '/cicd/v1/GetOrganizationsByAk',
        {
          method: 'POST',
          body: JSON.stringify({
            accesskey_id: form.accesskey_id.trim(),
            accesskey_secret: form.accesskey_secret.trim(),
          }),
        }
      )
      if (resp.success && resp.organizations) {
        update('organization_id', JSON.stringify(resp.organizations))
        toast.success('验证成功，已获取组织ID')
      } else {
        toast.error(resp.msg || '验证失败')
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.aliyun_id.trim()) { toast.error('阿里云帐号不能为空'); return }
    if (!form.accesskey_id.trim()) { toast.error('accesskeyId不能为空'); return }
    if (!form.accesskey_secret.trim()) { toast.error('accesskeySecret不能为空'); return }

    try {
      const body = {
        ...form,
        aliyun_id: form.aliyun_id.trim(),
        accesskey_id: form.accesskey_id.trim(),
        accesskey_secret: form.accesskey_secret.trim(),
        id: editId || 0,
      }
      await api<ApiResponse<unknown>>('/cicd/v1/AkAdd', { method: 'POST', body: JSON.stringify(body) })
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
      await api<ApiResponse<unknown>>(`/cicd/v1/AkDel?id=${deleteTarget.id}&aliyunId=${deleteTarget.aliyun_id}`)
      toast.success('删除成功')
      fetchList()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">阿里云AK管理</h1>
        <Button onClick={openAdd}>
          <Plus size={14} className="mr-1" />添加阿里云AK
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>阿里云帐号</TableHead>
                <TableHead>accesskeyId</TableHead>
                <TableHead>云效组织ID</TableHead>
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
                  <TableCell className="font-medium">{item.aliyun_id}</TableCell>
                  <TableCell className="font-mono text-sm">{item.accesskey_id}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm" title={item.organization_id}>
                    {item.organization_id || '-'}
                  </TableCell>
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
            <DialogTitle>{editMode ? '编辑阿里云帐号' : '添加阿里云帐号'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">阿里云帐号 <span className="text-red-500">*</span></label>
              <Input value={form.aliyun_id} onChange={e => update('aliyun_id', e.target.value)} disabled={editMode} />
              {editMode && <p className="text-xs text-muted-foreground">已使用的帐号名称不能更改</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">accesskeyId <span className="text-red-500">*</span></label>
              <Input value={form.accesskey_id} onChange={e => update('accesskey_id', e.target.value)} placeholder="AccessKey ID" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">accesskeySecret <span className="text-red-500">*</span></label>
              <Input type="password" value={form.accesskey_secret} onChange={e => update('accesskey_secret', e.target.value)} placeholder="AccessKey Secret" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">组织ID <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <Input value={form.organization_id} onChange={e => update('organization_id', e.target.value)} placeholder="填写完ak以后点击右侧按钮读取" className="flex-1" />
                <Button variant="outline" onClick={handleVerifyAK} disabled={verifying}>
                  <KeyRound size={14} className="mr-1" />
                  {verifying ? '验证中...' : '验证AK并获取组织ID'}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input value={form.remarks} onChange={e => update('remarks', e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              注意：填写完accesskeyId和accesskey_secret需要点击"验证AK并获取组织ID"加载云效组织
            </p>
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
        description={`确定删除 ${deleteTarget?.aliyun_id}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
