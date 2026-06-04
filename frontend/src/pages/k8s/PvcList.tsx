import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Eye, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface PvcItem {
  pvcName: string
  nameSpace: string
  status: string
  volumeName: string
  capacity: string
  accessMode: string
  storageClass: string
  createTime: string
}

const defaultYaml = `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi`

export default function PvcList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<PvcItem[]>([])
  const [filtered, setFiltered] = useState<PvcItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formName, setFormName] = useState('')
  const [formNamespace, setFormNamespace] = useState('default')
  const [formCapacity, setFormCapacity] = useState('5Gi')
  const [formAccessMode, setFormAccessMode] = useState('ReadWriteOnce')
  const [formStorageClass, setFormStorageClass] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: PvcItem[] }>('/mrboard/pvc/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.pvcName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  const handleDelete = async (ns: string, name: string) => {
    if (!confirm('确定删除 PVC ' + name + '？')) return
    try {
      await api('/mrboard/pvc/v1/Del?clusterId=' + clusterId + '&nameSpace=' + ns + '&pvcName=' + name)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      let yamlStr = yamlContent
      if (createTab === 'form') {
        if (!formName) { toast.error('请输入名称'); setSubmitting(false); return }
        yamlStr = `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${formName}
  namespace: ${formNamespace || 'default'}
spec:
  accessModes:
    - ${formAccessMode || 'ReadWriteOnce'}
${formStorageClass ? '  storageClassName: ' + formStorageClass + '\n' : ''}  resources:
    requests:
      storage: ${formCapacity || '5Gi'}`
      }
      await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlStr, headers: { 'Content-Type': 'text/plain' } })
      toast.success('创建成功')
      setCreateOpen(false)
      setFormName(''); setFormNamespace('default'); setFormCapacity('5Gi'); setFormAccessMode('ReadWriteOnce'); setFormStorageClass('')
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">存储声明[PVC]</h1>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
      </div>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>名称</TableHead><TableHead>命名空间</TableHead><TableHead>状态</TableHead><TableHead>卷</TableHead><TableHead>容量</TableHead><TableHead>访问模式</TableHead><TableHead>存储类</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
        <TableBody>{loading ? <TableRow><TableCell colSpan={9} className="text-center py-8">加载中...</TableCell></TableRow>
        : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
        : filtered.map(d => (<TableRow key={d.nameSpace + '/' + d.pvcName}>
          <TableCell className="font-medium">{d.pvcName}</TableCell>
          <TableCell>{d.nameSpace}</TableCell>
          <TableCell><Badge variant={d.status === 'Bound' ? 'default' : 'destructive'}>{d.status}</Badge></TableCell>
          <TableCell>{d.volumeName || '-'}</TableCell>
          <TableCell>{d.capacity || '-'}</TableCell>
          <TableCell>{d.accessMode}</TableCell>
          <TableCell>{d.storageClass}</TableCell>
          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => navigate('/k8s/pvc/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&pvcName=' + d.pvcName)}><Eye size={14} /></Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/k8s/pvc/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&pvcName=' + d.pvcName)}><FileCode size={14} /></Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(d.nameSpace, d.pvcName)}><Trash2 size={14} className="text-destructive" /></Button>
            </div>
          </TableCell>
        </TableRow>))}</TableBody>
      </Table></CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增 PersistentVolumeClaim</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-pvc" /></div>
                <div><label className="text-sm font-medium">命名空间</label><Input value={formNamespace} onChange={e => setFormNamespace(e.target.value)} placeholder="default" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium">容量 *</label><Input value={formCapacity} onChange={e => setFormCapacity(e.target.value)} placeholder="5Gi" /></div>
                <div>
                  <label className="text-sm font-medium">访问模式</label>
                  <select value={formAccessMode} onChange={e => setFormAccessMode(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="ReadWriteOnce">ReadWriteOnce (单节点读写)</option>
                    <option value="ReadOnlyMany">ReadOnlyMany (多节点只读)</option>
                    <option value="ReadWriteMany">ReadWriteMany (多节点读写)</option>
                    <option value="ReadWriteOncePod">ReadWriteOncePod (单Pod读写)</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium">存储类</label><Input value={formStorageClass} onChange={e => setFormStorageClass(e.target.value)} placeholder="留空为默认" /></div>
              </div>
              <div className="border-t pt-3">
                <label className="text-sm font-medium mb-2 block">绑定选项</label>
                <p className="text-xs text-muted-foreground mb-2">指定要绑定的 PV 名称（可选，留空则自动匹配）</p>
              </div>
            </div>
          ) : (
            <textarea value={yamlContent} onChange={e => setYamlContent(e.target.value)} className="w-full h-80 rounded-md border border-input bg-slate-950 text-green-400 font-mono text-sm p-4 resize-y" spellCheck={false} />
          )}
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button><Button onClick={handleCreate} disabled={submitting}>{submitting ? '创建中...' : '创建'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
