import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Search, FileCode, Eye, Plus, Trash2, Database, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')
  const [formNfsServer, setFormNfsServer] = useState('')
  const [formNfsPath, setFormNfsPath] = useState('')

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try { const res = await api<{ code: number; data: PvItem[] }>('/mrboard/pv/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { if (!silent) setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.pvName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/pv/v1/Del?clusterId=' + clusterId + '&pvName=' + deleteTarget)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) }
    finally { setOperationProgress('完成 ✓'); setTimeout(() => { setOperatingDeploy(null); setOperationProgress(''); fetchData(true) }, 600) }
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
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<PvItem>[] = [
    {
      key: 'pvName', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === d.pvName ? <Loader2 size={14} className="text-primary animate-spin" /> : <Database size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.pvName}</div>
            {operatingDeploy === d.pvName && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">{d.capacity || '-'}</span>
              <span className="text-[10px] text-muted-foreground truncate">{d.accessMode}</span>
              <span className="text-[10px] text-muted-foreground truncate">{d.storageClass}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'status', header: '状态', render: (d) => <StatusBadge status={d.status} /> },
    { key: 'pvReclaimPolicy', header: '回收策略', className: 'text-xs', render: (d) => d.pvReclaimPolicy },
    { key: 'claimRef', header: '声明', className: 'text-xs', render: (d) => d.claimRef || '-' },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/pv/detail?clusterId=' + clusterId + '&pvName=' + d.pvName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/pv/yaml?clusterId=' + clusterId + '&pvName=' + d.pvName) }}>
            <FileCode size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(d.pvName) }}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="存储卷" description="PersistentVolume 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />创建</Button>
      </PageHeader>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={() => fetchData()}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={paged as unknown as Record<string, unknown>[]}
        loading={loading}
        pagination={{ page, limit: 20, total: filtered.length }}
        onPageChange={setPage}
        emptyMessage="暂无数据"
        variant="cards"
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>创建 PersistentVolume</DialogTitle></DialogHeader>
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
                  <Select value={formAccessMode} onValueChange={v => { if (v) setFormAccessMode(v) }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ReadWriteOnce">ReadWriteOnce</SelectItem>
                      <SelectItem value="ReadOnlyMany">ReadOnlyMany</SelectItem>
                      <SelectItem value="ReadWriteMany">ReadWriteMany</SelectItem>
                      <SelectItem value="ReadWriteOncePod">ReadWriteOncePod</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">回收策略</label>
                  <Select value={formReclaimPolicy} onValueChange={v => { if (v) setFormReclaimPolicy(v) }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Retain">Retain</SelectItem>
                      <SelectItem value="Delete">Delete</SelectItem>
                      <SelectItem value="Recycle">Recycle</SelectItem>
                    </SelectContent>
                  </Select>
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
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description={`确定删除 PV ${deleteTarget}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
