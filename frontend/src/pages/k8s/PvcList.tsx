import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, FileCode, Eye, Plus, Trash2, HardDrive, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

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
  const [nsFilter, setNsFilter] = useState('')
  const [page, setPage] = useState(1)
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
  const [deleteTarget, setDeleteTarget] = useState<PvcItem | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try { const res = await api<{ code: number; data: PvcItem[] }>('/mrboard/pvc/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { if (!silent) setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  const namespaces = useMemo(() => [...new Set(items.map(i => i.nameSpace).filter(Boolean))].sort(), [items])
  useEffect(() => { setFiltered(items.filter(i => (!nsFilter || i.nameSpace === nsFilter) && (!searchName || i.pvcName.toLowerCase().includes(searchName.toLowerCase())))) }, [items, searchName, nsFilter])
  useEffect(() => { setPage(1) }, [searchName, nsFilter])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget.pvcName)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/pvc/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&pvcName=' + deleteTarget.pvcName)
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
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<PvcItem>[] = [
    {
      key: 'pvcName', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === d.pvcName ? <Loader2 size={14} className="text-primary animate-spin" /> : <HardDrive size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.pvcName}</div>
            {operatingDeploy === d.pvcName && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{d.capacity || '-'}</span>
              <span className="text-[10px] text-muted-foreground truncate">{d.accessMode}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'status', header: '状态', render: (d) => <StatusBadge status={d.status} /> },
    { key: 'volumeName', header: '卷', className: 'text-xs', render: (d) => d.volumeName || '-' },
    { key: 'storageClass', header: '存储类', className: 'text-xs', render: (d) => d.storageClass },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/pvc/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&pvcName=' + d.pvcName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/pvc/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&pvcName=' + d.pvcName) }}>
            <FileCode size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(d) }}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="存储声明" description="PersistentVolumeClaim 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />创建</Button>
      </PageHeader>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><div className="flex items-center gap-2"><label className="text-sm text-muted-foreground whitespace-nowrap">命名空间</label><Select value={nsFilter || '__all__'} onValueChange={v => setNsFilter(v === '__all__' ? '' : (v ?? ''))}><SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="全部命名空间" /></SelectTrigger><SelectContent><SelectItem value="__all__">全部命名空间</SelectItem>{namespaces.map(ns => <SelectItem key={ns} value={ns}>{ns}</SelectItem>)}</SelectContent></Select></div><Button variant="outline" size="sm" onClick={() => fetchData()}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
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
          <DialogHeader><DialogTitle>创建 PersistentVolumeClaim</DialogTitle></DialogHeader>
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
                  <Select value={formAccessMode} onValueChange={v => { if (v) setFormAccessMode(v) }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ReadWriteOnce">ReadWriteOnce (单节点读写)</SelectItem>
                      <SelectItem value="ReadOnlyMany">ReadOnlyMany (多节点只读)</SelectItem>
                      <SelectItem value="ReadWriteMany">ReadWriteMany (多节点读写)</SelectItem>
                      <SelectItem value="ReadWriteOncePod">ReadWriteOncePod (单Pod读写)</SelectItem>
                    </SelectContent>
                  </Select>
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
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description={`确定删除 PVC ${deleteTarget?.pvcName}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
