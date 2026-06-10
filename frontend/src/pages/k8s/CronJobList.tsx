import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Play, Eye, Plus, X, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface CronJobItem {
  cronjobName: string
  nameSpace: string
  schedule: string
  suspend: boolean
  active: number
  lastSchedule: string
  imageUrl: string
  labels: string
  createTime: string
}

const defaultYaml = `apiVersion: batch/v1
kind: CronJob
metadata:
  name: my-cronjob
  namespace: default
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: my-cronjob
              image: busybox:latest
              command: ["echo", "hello"]
          restartPolicy: Never`

export default function CronJobList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CronJobItem[]>([])
  const [filtered, setFiltered] = useState<CronJobItem[]>([])
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
  const [formSchedule, setFormSchedule] = useState('')
  const [formImage, setFormImage] = useState('')
  const [formCommand, setFormCommand] = useState('')
  const [formRestartPolicy, setFormRestartPolicy] = useState('OnFailure')
  const [formSuccessHistory, setFormSuccessHistory] = useState('3')
  const [formFailedHistory, setFormFailedHistory] = useState('1')
  const [formEnvVars, setFormEnvVars] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }])
  const [deleteTarget, setDeleteTarget] = useState<CronJobItem | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')
  const [runTarget, setRunTarget] = useState<CronJobItem | null>(null)

  const addEnvVar = () => setFormEnvVars([...formEnvVars, { key: '', value: '' }])
  const removeEnvVar = (idx: number) => setFormEnvVars(formEnvVars.filter((_, i) => i !== idx))
  const updateEnvVar = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...formEnvVars]
    next[idx] = { ...next[idx], [field]: val }
    setFormEnvVars(next)
  }

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api<{ code: number; data: CronJobItem[] }>('/mrboard/cronjob/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { if (!silent) setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  const namespaces = useMemo(() => [...new Set(items.map(i => i.nameSpace).filter(Boolean))].sort(), [items])
  useEffect(() => { setFiltered(items.filter(i => (!nsFilter || i.nameSpace === nsFilter) && (!searchName || i.cronjobName.toLowerCase().includes(searchName.toLowerCase())))) }, [items, searchName, nsFilter])
  useEffect(() => { setPage(1) }, [searchName, nsFilter])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleRun = async () => {
    if (!runTarget) return
    try {
      await api('/mrboard/cronjob/v1/Run?clusterId=' + clusterId + '&nameSpace=' + runTarget.nameSpace + '&cronjobName=' + runTarget.cronjobName)
      toast.success('运行成功')
      setRunTarget(null)
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget.cronjobName)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/cronjob/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&cronjobName=' + deleteTarget.cronjobName)
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
        await api('/mrboard/cronjob/v1/Create', { method: 'POST', body: JSON.stringify({ clusterId, nameSpace: formNamespace, cronjobName: formName, imageUrl: formImage, schedule: formSchedule, command: formCommand }), headers: { 'Content-Type': 'application/json' } })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormNamespace(''); setFormName(''); setFormSchedule(''); setFormImage(''); setFormCommand('')
      setFormRestartPolicy('OnFailure'); setFormSuccessHistory('3'); setFormFailedHistory('1')
      setFormEnvVars([{ key: '', value: '' }])
      setYamlContent(defaultYaml)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<CronJobItem>[] = [
    {
      key: 'cronjobName', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === d.cronjobName ? <Loader2 size={14} className="text-primary animate-spin" /> : <Clock size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.cronjobName}</div>
            {operatingDeploy === d.cronjobName && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
              <span className="text-[10px] text-muted-foreground font-mono truncate">{d.schedule}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'suspend', header: '暂停', render: (d) => <StatusBadge status={d.suspend ? 'Inactive' : 'Active'} /> },
    { key: 'active', header: '活跃', render: (d) => <Badge variant="secondary" className="tabular-nums text-xs">{d.active}</Badge> },
    { key: 'lastSchedule', header: '上次调度', className: 'text-xs text-muted-foreground', render: (d) => d.lastSchedule || '-' },
    { key: 'imageUrl', header: '镜像', className: 'font-mono text-xs max-w-xs truncate', render: (d) => <span title={d.imageUrl}>{d.imageUrl}</span> },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/cronjob/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&cronjobName=' + d.cronjobName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="运行"
            onClick={(e) => { e.stopPropagation(); setRunTarget(d) }}>
            <Play size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/cronjob/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&cronjobName=' + d.cronjobName) }}>
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
      <PageHeader title="定时任务" description="CronJob 管理">
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
          <DialogHeader><DialogTitle>创建 CronJob</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">命名空间</label><Input value={formNamespace} onChange={e => setFormNamespace(e.target.value)} placeholder="default" /></div>
              <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-cronjob" /></div>
              <div><label className="text-sm font-medium">调度</label><Input value={formSchedule} onChange={e => setFormSchedule(e.target.value)} placeholder="*/5 * * * *" /></div>
              <div><label className="text-sm font-medium">镜像</label><Input value={formImage} onChange={e => setFormImage(e.target.value)} placeholder="busybox:latest" /></div>
              <div><label className="text-sm font-medium">命令</label><Input value={formCommand} onChange={e => setFormCommand(e.target.value)} placeholder="echo hello" /></div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">重启策略</label>
                  <Select value={formRestartPolicy} onValueChange={v => setFormRestartPolicy(v ?? '')}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OnFailure">OnFailure</SelectItem>
                      <SelectItem value="Never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">成功历史限制</label><Input type="number" value={formSuccessHistory} onChange={e => setFormSuccessHistory(e.target.value)} placeholder="3" /></div>
                <div><label className="text-sm font-medium">失败历史限制</label><Input type="number" value={formFailedHistory} onChange={e => setFormFailedHistory(e.target.value)} placeholder="1" /></div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">环境变量</label>
                  <Button variant="outline" size="sm" onClick={addEnvVar}><Plus size={14} className="mr-1" />添加</Button>
                </div>
                {formEnvVars.map((env, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input value={env.key} onChange={e => updateEnvVar(idx, 'key', e.target.value)} placeholder="键 (如 DATABASE_URL)" className="flex-1" />
                    <Input value={env.value} onChange={e => updateEnvVar(idx, 'value', e.target.value)} placeholder="值" className="flex-1" />
                    {formEnvVars.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeEnvVar(idx)}><X size={14} /></Button>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认删除"
        description={`确定删除 ${deleteTarget?.cronjobName}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />

      <Dialog open={!!runTarget} onOpenChange={(open) => { if (!open) setRunTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>确认运行</DialogTitle></DialogHeader>
          <p>确定立即运行 {runTarget?.cronjobName}？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunTarget(null)}>取消</Button>
            <Button onClick={handleRun}>运行</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
