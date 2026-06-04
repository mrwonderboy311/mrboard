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

interface PvItem {
  pvName: string
  status: string
  capacity: string
  accessMode: string
  pvReclaimPolicy: string
  storageClass: string
  claimRef: string
  reason: string
  createTime: string
}

const defaultYaml = `apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: /tmp/data`

export default function PvList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<PvItem[]>([])
  const [filtered, setFiltered] = useState<PvItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formName, setFormName] = useState('')
  const [formCapacity, setFormCapacity] = useState('10Gi')
  const [formAccessMode, setFormAccessMode] = useState('ReadWriteOnce')
  const [formReclaimPolicy, setFormReclaimPolicy] = useState('Retain')
  const [formStorageClass, setFormStorageClass] = useState('')
  const [formHostPath, setFormHostPath] = useState('/tmp/data')
  const [formNfsServer, setFormNfsServer] = useState('')
  const [formNfsPath, setFormNfsPath] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: PvItem[] }>('/mrboard/pv/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.pvName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  const handleDelete = async (name: string) => {
    if (!confirm('确定删除 PV ' + name + '？')) return
    try {
      await api('/mrboard/pv/v1/Del?clusterId=' + clusterId + '&pvName=' + name)
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
        const storageSource = formNfsServer
          ? `  nfs:\n    server: ${formNfsServer}\n    path: ${formNfsPath || '/'}`
          : `  hostPath:\n    path: ${formHostPath || '/tmp/data'}`
        yamlStr = `apiVersion: v1
kind: PersistentVolume
metadata:
  name: ${formName}
spec:
  capacity:
    storage: ${formCapacity || '10Gi'}
  accessModes:
    - ${formAccessMode || 'ReadWriteOnce'}
  persistentVolumeReclaimPolicy: ${formReclaimPolicy || 'Retain'}
${formStorageClass ? '  storageClassName: ' + formStorageClass + '\n' : ''}${storageSource}`
      }
      await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlStr, headers: { 'Content-Type': 'text/plain' } })
      toast.success('创建成功')
      setCreateOpen(false)
      setFormName(''); setFormCapacity('10Gi'); setFormAccessMode('ReadWriteOnce'); setFormReclaimPolicy('Retain'); setFormStorageClass(''); setFormHostPath('/tmp/data'); setFormNfsServer(''); setFormNfsPath('')
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">存储卷[PV]</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
        </div>
      </div>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>名称</TableHead><TableHead>状态</TableHead><TableHead>容量</TableHead><TableHead>访问模式</TableHead><TableHead>回收策略</TableHead><TableHead>存储类</TableHead><TableHead>声明</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
        <TableBody>{loading ? <TableRow><TableCell colSpan={9} className="text-center py-8">加载中...</TableCell></TableRow>
        : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
        : filtered.map(d => (<TableRow key={d.pvName}>
          <TableCell className="font-medium">{d.pvName}</TableCell>
          <TableCell><Badge variant={d.status === 'Bound' ? 'default' : d.status === 'Available' ? 'secondary' : 'destructive'}>{d.status}</Badge></TableCell>
          <TableCell>{d.capacity || '-'}</TableCell>
          <TableCell>{d.accessMode}</TableCell>
          <TableCell>{d.pvReclaimPolicy}</TableCell>
          <TableCell>{d.storageClass}</TableCell>
          <TableCell>{d.claimRef || '-'}</TableCell>
          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => navigate('/k8s/pv/detail?clusterId=' + clusterId + '&pvName=' + d.pvName)}><Eye size={14} /></Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/k8s/pv/yaml?clusterId=' + clusterId + '&pvName=' + d.pvName)}><FileCode size={14} /></Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(d.pvName)}><Trash2 size={14} className="text-destructive" /></Button>
            </div>
          </TableCell>
        </TableRow>))}</TableBody>
      </Table></CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增 PersistentVolume</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-pv" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">容量</label><Input value={formCapacity} onChange={e => setFormCapacity(e.target.value)} placeholder="10Gi" /></div>
                <div>
                  <label className="text-sm font-medium">访问模式</label>
                  <select value={formAccessMode} onChange={e => setFormAccessMode(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="ReadWriteOnce">ReadWriteOnce</option>
                    <option value="ReadOnlyMany">ReadOnlyMany</option>
                    <option value="ReadWriteMany">ReadWriteMany</option>
                    <option value="ReadWriteOncePod">ReadWriteOncePod</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">回收策略</label>
                  <select value={formReclaimPolicy} onChange={e => setFormReclaimPolicy(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="Retain">Retain</option>
                    <option value="Delete">Delete</option>
                    <option value="Recycle">Recycle</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium">存储类</label><Input value={formStorageClass} onChange={e => setFormStorageClass(e.target.value)} placeholder="留空为默认" /></div>
              </div>
              <div className="border-t pt-3">
                <label className="text-sm font-medium mb-2 block">存储源 (二选一)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">HostPath</label><Input value={formHostPath} onChange={e => { setFormHostPath(e.target.value); setFormNfsServer(''); }} placeholder="/tmp/data" /></div>
                  <div><label className="text-xs text-muted-foreground">NFS Server</label><Input value={formNfsServer} onChange={e => { setFormNfsServer(e.target.value); setFormHostPath(''); }} placeholder="nfs.example.com" /></div>
                </div>
                {formNfsServer && <div className="mt-2"><label className="text-xs text-muted-foreground">NFS Path</label><Input value={formNfsPath} onChange={e => setFormNfsPath(e.target.value)} placeholder="/exports/data" /></div>}
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
