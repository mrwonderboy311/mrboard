import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Eye, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

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
  const [page, setPage] = useState(1)
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
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

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

  const columns: Column<PvItem>[] = [
    { key: 'pvName', header: '名称', className: 'font-medium', render: (d) => d.pvName },
    { key: 'status', header: '状态', render: (d) => <StatusBadge status={d.status} /> },
    { key: 'capacity', header: '容量', render: (d) => d.capacity || '-' },
    { key: 'accessMode', header: '访问模式', render: (d) => d.accessMode },
    { key: 'pvReclaimPolicy', header: '回收策略', render: (d) => d.pvReclaimPolicy },
    { key: 'storageClass', header: '存储类', render: (d) => d.storageClass },
    { key: 'claimRef', header: '声明', render: (d) => d.claimRef || '-' },
    { key: 'createTime', header: '创建时间', className: 'text-sm text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '操作', render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/k8s/pv/detail?clusterId=' + clusterId + '&pvName=' + d.pvName) }}><Eye size={14} /></Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/k8s/pv/yaml?clusterId=' + clusterId + '&pvName=' + d.pvName) }}><FileCode size={14} /></Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(d.pvName) }}><Trash2 size={14} className="text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="存储卷" description="PersistentVolume 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
      </PageHeader>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
      <Card><CardContent className="p-0">
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={paged as unknown as Record<string, unknown>[]}
          loading={loading}
          pagination={{ page, limit: 20, total: filtered.length }}
          onPageChange={setPage}
          emptyMessage="暂无数据"
        />
      </CardContent></Card>

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
