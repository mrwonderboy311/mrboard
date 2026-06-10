import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, FileCode, Trash2, Plus, Scaling, Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface HpaItem {
  hpaName: string
  nameSpace: string
  targetRef: string
  minReplicas: number
  maxReplicas: number
  currentReplicas: number
  targetCPU: string
  currentCPU: string
  createTime: string
}

const defaultYaml = `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80`

export default function HpaList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<HpaItem[]>([])
  const [filtered, setFiltered] = useState<HpaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [nsFilter, setNsFilter] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNamespace, setFormNamespace] = useState('')
  const [formName, setFormName] = useState('')
  const [formTargetRef, setFormTargetRef] = useState('')
  const [formMinReplicas, setFormMinReplicas] = useState('1')
  const [formMaxReplicas, setFormMaxReplicas] = useState('10')
  const [formTargetCPU, setFormTargetCPU] = useState('80')
  const [formTargetMemory, setFormTargetMemory] = useState('')
  const [formScaleUpStabilization, setFormScaleUpStabilization] = useState('0')
  const [formScaleDownStabilization, setFormScaleDownStabilization] = useState('300')
  const [deleteTarget, setDeleteTarget] = useState<HpaItem | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api<{ code: number; data: HpaItem[] }>('/mrboard/hpa/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { if (!silent) setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  const namespaces = useMemo(() => [...new Set(items.map(i => i.nameSpace).filter(Boolean))].sort(), [items])
  useEffect(() => { setFiltered(items.filter(i => (!nsFilter || i.nameSpace === nsFilter) && (!searchName || i.hpaName.toLowerCase().includes(searchName.toLowerCase())))) }, [items, searchName, nsFilter])
  useEffect(() => { setPage(1) }, [searchName, nsFilter])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget.hpaName)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/hpa/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&hpaName=' + deleteTarget.hpaName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) }
    finally { setOperationProgress('完成 ✓'); setTimeout(() => { setOperatingDeploy(null); setOperationProgress(''); fetchData(true) }, 600) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (createTab === 'form') {
        if (!formName) { toast.error('请输入名称'); setSubmitting(false); return }
        await api('/mrboard/hpa/v1/Create', { method: 'POST', body: JSON.stringify({ clusterId, nameSpace: formNamespace, hpaName: formName, targetRef: formTargetRef, minReplicas: Number(formMinReplicas), maxReplicas: Number(formMaxReplicas), targetCPU: Number(formTargetCPU) }), headers: { 'Content-Type': 'application/json' } })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormNamespace(''); setFormName(''); setFormTargetRef(''); setFormMinReplicas('1'); setFormMaxReplicas('10'); setFormTargetCPU('80')
      setFormTargetMemory(''); setFormScaleUpStabilization('0'); setFormScaleDownStabilization('300')
      setYamlContent(defaultYaml)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<HpaItem>[] = [
    {
      key: 'hpaName', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === d.hpaName ? <Loader2 size={14} className="text-primary animate-spin" /> : <Scaling size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.hpaName}</div>
            {operatingDeploy === d.hpaName && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{d.targetRef}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'minReplicas', header: '最小', render: (d) => <Badge variant="secondary" className="tabular-nums text-xs">{d.minReplicas}</Badge> },
    { key: 'maxReplicas', header: '最大', render: (d) => <Badge variant="secondary" className="tabular-nums text-xs">{d.maxReplicas}</Badge> },
    { key: 'currentReplicas', header: '当前副本', className: 'text-xs', render: (d) => d.currentReplicas },
    { key: 'targetCPU', header: '目标CPU', className: 'text-xs', render: (d) => d.targetCPU },
    { key: 'currentCPU', header: '当前CPU', className: 'text-xs', render: (d) => d.currentCPU || '-' },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/hpa/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&hpaName=' + d.hpaName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/hpa/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&hpaName=' + d.hpaName) }}>
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
      <PageHeader title="自动伸缩" description="HPA 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />创建</Button>
      </PageHeader>
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">命名空间</label>
            <Select value={nsFilter || '__all__'} onValueChange={v => setNsFilter(v === '__all__' ? '' : (v ?? ''))}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="全部命名空间" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部命名空间</SelectItem>
                {namespaces.map(ns => <SelectItem key={ns} value={ns}>{ns}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData()}><Search size={14} className="mr-1" />刷新</Button>
        </div>
      </CardContent></Card>
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
          <DialogHeader><DialogTitle>创建 HPA</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">命名空间</label><Input value={formNamespace} onChange={e => setFormNamespace(e.target.value)} placeholder="default" /></div>
              <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-hpa" /></div>
              <div><label className="text-sm font-medium">目标引用</label><Input value={formTargetRef} onChange={e => setFormTargetRef(e.target.value)} placeholder="Deployment/my-app" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-sm font-medium">最小副本</label><Input type="number" value={formMinReplicas} onChange={e => setFormMinReplicas(e.target.value)} placeholder="1" /></div>
                <div><label className="text-sm font-medium">最大副本</label><Input type="number" value={formMaxReplicas} onChange={e => setFormMaxReplicas(e.target.value)} placeholder="10" /></div>
                <div><label className="text-sm font-medium">目标CPU(%)</label><Input type="number" value={formTargetCPU} onChange={e => setFormTargetCPU(e.target.value)} placeholder="80" /></div>
              </div>

              <div><label className="text-sm font-medium">目标内存(%)</label><Input type="number" value={formTargetMemory} onChange={e => setFormTargetMemory(e.target.value)} placeholder="80" /></div>

              <div className="space-y-2">
                <label className="text-sm font-medium">伸缩行为</label>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">扩容稳定窗口 (秒)</label><Input type="number" value={formScaleUpStabilization} onChange={e => setFormScaleUpStabilization(e.target.value)} placeholder="0" /></div>
                  <div><label className="text-xs text-muted-foreground">缩容稳定窗口 (秒)</label><Input type="number" value={formScaleDownStabilization} onChange={e => setFormScaleDownStabilization(e.target.value)} placeholder="300" /></div>
                </div>
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
        description={`确定删除 ${deleteTarget?.hpaName}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
