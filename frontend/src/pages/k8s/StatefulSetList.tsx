import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, FileCode, Trash2, RotateCcw, Eye, Plus, X, Database, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface StsItem {
  statefulsetName: string
  nameSpace: string
  podNumber: number
  imgUrl: string
  labels: string
  createTime: string
  replicas: number
  availableReplicas: number
}

const defaultYaml = `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: my-sts
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: my-sts
          image: nginx:latest
          ports:
            - containerPort: 80
  serviceName: ""`

export default function StatefulSetList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<StsItem[]>([])
  const [filtered, setFiltered] = useState<StsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNamespace, setFormNamespace] = useState('')
  const [formName, setFormName] = useState('')
  const [formImage, setFormImage] = useState('')
  const [formReplicas, setFormReplicas] = useState('1')
  const [formLabels, setFormLabels] = useState('')
  const [formImagePullPolicy, setFormImagePullPolicy] = useState('IfNotPresent')
  const [formContainerPort, setFormContainerPort] = useState('')
  const [formCpuRequest, setFormCpuRequest] = useState('')
  const [formCpuLimit, setFormCpuLimit] = useState('')
  const [formMemoryRequest, setFormMemoryRequest] = useState('')
  const [formMemoryLimit, setFormMemoryLimit] = useState('')
  const [formEnvVars, setFormEnvVars] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }])
  const [formVolumeMounts, setFormVolumeMounts] = useState<{ type: string; name: string; mountPath: string }[]>([{ type: 'ConfigMap', name: '', mountPath: '' }])
  const [restartTarget, setRestartTarget] = useState<StsItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StsItem | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')

  const addEnvVar = () => setFormEnvVars([...formEnvVars, { key: '', value: '' }])
  const removeEnvVar = (idx: number) => setFormEnvVars(formEnvVars.filter((_, i) => i !== idx))
  const updateEnvVar = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...formEnvVars]
    next[idx] = { ...next[idx], [field]: val }
    setFormEnvVars(next)
  }

  const addVolumeMount = () => setFormVolumeMounts([...formVolumeMounts, { type: 'ConfigMap', name: '', mountPath: '' }])
  const removeVolumeMount = (idx: number) => setFormVolumeMounts(formVolumeMounts.filter((_, i) => i !== idx))
  const updateVolumeMount = (idx: number, field: 'type' | 'name' | 'mountPath', val: string | null) => {
    if (!val && field === 'type') return
    const next = [...formVolumeMounts]
    next[idx] = { ...next[idx], [field]: val }
    setFormVolumeMounts(next)
  }

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api<{ code: number; data: StsItem[] }>('/mrboard/sts/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { if (!silent) setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.statefulsetName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleRestart = async () => {
    if (!restartTarget) return
    const name = restartTarget.statefulsetName
    setOperatingDeploy(name)
    setOperationProgress('重启中...')
    try {
      await api('/mrboard/sts/v1/Restart?clusterId=' + clusterId + '&nameSpace=' + restartTarget.nameSpace + '&stsName=' + name)
      setOperationProgress('等待 Pod 就绪...')
      let retries = 0
      const poll = setInterval(async () => {
        retries++
        try {
          const res = await api<{ code: number; data: StsItem[] }>(`/mrboard/sts/v1/List?clusterId=${clusterId}&nameSpace=${restartTarget.nameSpace}`)
          const sts = (res.data || []).find(d => d.statefulsetName === name)
          if (sts && sts.replicas === sts.availableReplicas) {
            clearInterval(poll)
            setOperationProgress('完成 ✓')
            toast.success('重启完成')
            setRestartTarget(null)
            setTimeout(() => { setOperatingDeploy(null); setOperationProgress(''); fetchData(true) }, 600)
          } else if (retries > 30) {
            clearInterval(poll)
            setOperationProgress('完成 ✓')
            toast.success('重启已触发，正在滚动更新...')
            setRestartTarget(null)
            setTimeout(() => { setOperatingDeploy(null); setOperationProgress(''); fetchData(true) }, 600)
          }
        } catch {
          if (retries > 30) { clearInterval(poll); setOperatingDeploy(null); setOperationProgress('') }
        }
      }, 2000)
    } catch (err) {
      toast.error((err as Error).message)
      setOperatingDeploy(null)
      setOperationProgress('')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget.statefulsetName)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/sts/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&stsName=' + deleteTarget.statefulsetName)
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
        await api('/mrboard/sts/v1/Create', { method: 'POST', body: JSON.stringify({ clusterId, nameSpace: formNamespace, stsName: formName, imageUrl: formImage, replicas: Number(formReplicas), labels: formLabels }), headers: { 'Content-Type': 'application/json' } })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormNamespace(''); setFormName(''); setFormImage(''); setFormReplicas('1'); setFormLabels('')
      setFormImagePullPolicy('IfNotPresent'); setFormContainerPort('')
      setFormCpuRequest(''); setFormCpuLimit(''); setFormMemoryRequest(''); setFormMemoryLimit('')
      setFormEnvVars([{ key: '', value: '' }])
      setFormVolumeMounts([{ type: 'ConfigMap', name: '', mountPath: '' }])
      setYamlContent(defaultYaml)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<StsItem>[] = [
    {
      key: 'statefulsetName', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === d.statefulsetName ? <Loader2 size={14} className="text-primary animate-spin" /> : <Database size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.statefulsetName}</div>
            {operatingDeploy === d.statefulsetName && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
              <span className="text-[10px] text-muted-foreground font-mono truncate" title={d.imgUrl}>{d.imgUrl}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'replicas', header: '副本', className: 'w-24', render: (d) => (
        <div className="flex items-center gap-2">
          <Badge variant={d.replicas === d.availableReplicas ? 'default' : 'destructive'} className="tabular-nums text-xs">
            {d.availableReplicas}/{d.replicas}
          </Badge>
        </div>
      ),
    },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/statefulset/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&stsName=' + d.statefulsetName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="重启"
            onClick={(e) => { e.stopPropagation(); setRestartTarget(d) }}>
            <RotateCcw size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/statefulset/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&stsName=' + d.statefulsetName) }}>
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
      <PageHeader title="有状态副本集" description="StatefulSet 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
      </PageHeader>
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
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
          <DialogHeader><DialogTitle>新增 StatefulSet</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">命名空间</label><Input value={formNamespace} onChange={e => setFormNamespace(e.target.value)} placeholder="default" /></div>
              <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-sts" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">镜像</label><Input value={formImage} onChange={e => setFormImage(e.target.value)} placeholder="nginx:latest" /></div>
                <div><label className="text-sm font-medium">副本数</label><Input type="number" value={formReplicas} onChange={e => setFormReplicas(e.target.value)} placeholder="1" /></div>
              </div>
              <div><label className="text-sm font-medium">标签</label><Input value={formLabels} onChange={e => setFormLabels(e.target.value)} placeholder="app=nginx,env=prod" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">镜像拉取策略</label>
                  <Select value={formImagePullPolicy} onValueChange={v => { if (v) setFormImagePullPolicy(v) }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Always">Always</SelectItem>
                      <SelectItem value="IfNotPresent">IfNotPresent</SelectItem>
                      <SelectItem value="Never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">容器端口</label><Input type="number" value={formContainerPort} onChange={e => setFormContainerPort(e.target.value)} placeholder="80" /></div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">资源配置</label>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">CPU 请求</label><Input value={formCpuRequest} onChange={e => setFormCpuRequest(e.target.value)} placeholder="100m" /></div>
                  <div><label className="text-xs text-muted-foreground">CPU 限制</label><Input value={formCpuLimit} onChange={e => setFormCpuLimit(e.target.value)} placeholder="500m" /></div>
                  <div><label className="text-xs text-muted-foreground">内存请求</label><Input value={formMemoryRequest} onChange={e => setFormMemoryRequest(e.target.value)} placeholder="128Mi" /></div>
                  <div><label className="text-xs text-muted-foreground">内存限制</label><Input value={formMemoryLimit} onChange={e => setFormMemoryLimit(e.target.value)} placeholder="256Mi" /></div>
                </div>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">卷挂载</label>
                  <Button variant="outline" size="sm" onClick={addVolumeMount}><Plus size={14} className="mr-1" />添加</Button>
                </div>
                {formVolumeMounts.map((vm, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={vm.type} onValueChange={val => updateVolumeMount(idx, 'type', val)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ConfigMap">ConfigMap</SelectItem>
                        <SelectItem value="Secret">Secret</SelectItem>
                        <SelectItem value="PVC">PVC</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={vm.name} onChange={e => updateVolumeMount(idx, 'name', e.target.value)} placeholder="名称" className="flex-1" />
                    <Input value={vm.mountPath} onChange={e => updateVolumeMount(idx, 'mountPath', e.target.value)} placeholder="/data" className="flex-1" />
                    {formVolumeMounts.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeVolumeMount(idx)}><X size={14} /></Button>
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
        open={!!restartTarget}
        onOpenChange={(v) => { if (!v) setRestartTarget(null) }}
        title="确认操作"
        description={`确定重启 ${restartTarget?.statefulsetName}？`}
        onConfirm={handleRestart}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description={`确定删除 ${deleteTarget?.statefulsetName}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
