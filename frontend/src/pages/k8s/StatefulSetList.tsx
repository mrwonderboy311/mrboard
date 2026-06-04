import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, RotateCcw, Eye, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

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

  const addEnvVar = () => setFormEnvVars([...formEnvVars, { key: '', value: '' }])
  const removeEnvVar = (idx: number) => setFormEnvVars(formEnvVars.filter((_, i) => i !== idx))
  const updateEnvVar = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...formEnvVars]
    next[idx] = { ...next[idx], [field]: val }
    setFormEnvVars(next)
  }

  const addVolumeMount = () => setFormVolumeMounts([...formVolumeMounts, { type: 'ConfigMap', name: '', mountPath: '' }])
  const removeVolumeMount = (idx: number) => setFormVolumeMounts(formVolumeMounts.filter((_, i) => i !== idx))
  const updateVolumeMount = (idx: number, field: 'type' | 'name' | 'mountPath', val: string) => {
    const next = [...formVolumeMounts]
    next[idx] = { ...next[idx], [field]: val }
    setFormVolumeMounts(next)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: StsItem[] }>('/mrboard/sts/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.statefulsetName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleRestart = async (item: StsItem) => {
    if (!confirm('确定重启 ' + item.statefulsetName + '？')) return
    try {
      await api('/mrboard/sts/v1/Restart?clusterId=' + clusterId + '&nameSpace=' + item.nameSpace + '&stsName=' + item.statefulsetName)
      toast.success('重启成功')
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleDelete = async (item: StsItem) => {
    if (!confirm('确定删除 ' + item.statefulsetName + '？')) return
    try {
      await api('/mrboard/sts/v1/Del?clusterId=' + clusterId + '&nameSpace=' + item.nameSpace + '&stsName=' + item.statefulsetName)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
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
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<StsItem>[] = [
    { key: 'statefulsetName', header: '名称', className: 'font-medium', render: (d) => d.statefulsetName },
    { key: 'nameSpace', header: '命名空间', render: (d) => d.nameSpace },
    {
      key: 'replicas', header: '副本', render: (d) => (
        <span className="text-xs">
          <StatusBadge status={d.replicas === d.availableReplicas ? 'Ready' : 'Warning'} />
          <span className="ml-1">{d.availableReplicas}/{d.replicas}</span>
        </span>
      ),
    },
    { key: 'imgUrl', header: '镜像', className: 'font-mono text-xs max-w-xs truncate', render: (d) => <span title={d.imgUrl}>{d.imgUrl}</span> },
    { key: 'createTime', header: '创建时间', className: 'text-sm text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '操作', render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => navigate('/k8s/statefulset/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&stsName=' + d.statefulsetName)}><Eye size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => handleRestart(d)}><RotateCcw size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/k8s/statefulset/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&stsName=' + d.statefulsetName)}><FileCode size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(d)}><Trash2 size={14} className="text-destructive" /></Button>
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
          <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
        </div>
      </CardContent></Card>
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
                  <select value={formImagePullPolicy} onChange={e => setFormImagePullPolicy(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="Always">Always</option>
                    <option value="IfNotPresent">IfNotPresent</option>
                    <option value="Never">Never</option>
                  </select>
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
                    <select value={vm.type} onChange={e => updateVolumeMount(idx, 'type', e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-32">
                      <option value="ConfigMap">ConfigMap</option>
                      <option value="Secret">Secret</option>
                      <option value="PVC">PVC</option>
                    </select>
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
    </div>
  )
}
