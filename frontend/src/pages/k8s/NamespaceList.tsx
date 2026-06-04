import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FileCode, Trash2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface NsItem {
  nameSpace: string
  status: string
  labels: string
  createTime: string
}

const defaultYaml = `apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace`

export default function NamespaceList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NsItem[]>([])
  const [loading, setLoading] = useState(true)
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formName, setFormName] = useState('')
  const [formLabels, setFormLabels] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }])
  const [deleteTarget, setDeleteTarget] = useState<NsItem | null>(null)

  const addLabel = () => setFormLabels([...formLabels, { key: '', value: '' }])
  const removeLabel = (idx: number) => setFormLabels(formLabels.filter((_, i) => i !== idx))
  const updateLabel = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...formLabels]
    next[idx] = { ...next[idx], [field]: val }
    setFormLabels(next)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: NsItem[] } | NsItem[]>('/mrboard/ns/v1/List?clusterId=' + clusterId)
      const list = Array.isArray(res) ? res : (res as { code: number; data: NsItem[] }).data || []
      setItems(list)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [clusterId])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/mrboard/ns/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (createTab === 'form') {
        if (!formName) { toast.error('请输入名称'); setSubmitting(false); return }
        await api('/mrboard/ns/v1/Create', { method: 'POST', body: JSON.stringify({ clusterId, nameSpace: formName }), headers: { 'Content-Type': 'application/json' } })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormName('')
      setFormLabels([{ key: '', value: '' }])
      setYamlContent(defaultYaml)
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">命名空间</h1>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : items.map(n => (
                <TableRow key={n.nameSpace}>
                  <TableCell className="font-medium">{n.nameSpace}</TableCell>
                  <TableCell><Badge variant="default">{n.status}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{n.labels || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{n.createTime}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => navigate('/k8s/namespace/yaml?clusterId=' + clusterId + '&nameSpace=' + n.nameSpace)}><FileCode size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(n)}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增命名空间</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-namespace" /></div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">标签</label>
                  <Button variant="outline" size="sm" onClick={addLabel}><Plus size={14} className="mr-1" />添加</Button>
                </div>
                {formLabels.map((lbl, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input value={lbl.key} onChange={e => updateLabel(idx, 'key', e.target.value)} placeholder="键 (如 app)" className="flex-1" />
                    <Input value={lbl.value} onChange={e => updateLabel(idx, 'value', e.target.value)} placeholder="值 (如 nginx)" className="flex-1" />
                    {formLabels.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeLabel(idx)}><X size={14} /></Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <textarea value={yamlContent} onChange={e => setYamlContent(e.target.value)} className="w-full h-80 rounded-md border border-input bg-slate-950 text-green-400 font-mono text-sm p-4 resize-y" spellCheck={false} />
          )}
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button><Button onClick={handleCreate} disabled={submitting}>{submitting ? '创建中...' : '创建'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>确定删除命名空间 {deleteTarget?.nameSpace}？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
