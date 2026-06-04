import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Search, Eye, Scale, RotateCcw, Trash2, FileCode, Plus, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { DeployListItem, Namespace, ApiResponse } from '@/types'

const defaultYaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deploy
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-container
        image: nginx:latest`

export default function DeployList() {
  const navigate = useNavigate()
  const [deploys, setDeploys] = useState<DeployListItem[]>([])
  const [filtered, setFiltered] = useState<DeployListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [namespace, setNamespace] = useState('')
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<DeployListItem | null>(null)
  const [restartTarget, setRestartTarget] = useState<DeployListItem | null>(null)
  const [scaleTarget, setScaleTarget] = useState<DeployListItem | null>(null)
  const [scaleValue, setScaleValue] = useState('')

  const [clusterId, setClusterId] = useState(localStorage.getItem('clusterId') || '')

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNamespace, setFormNamespace] = useState('default')
  const [formName, setFormName] = useState('')
  const [formImage, setFormImage] = useState('')
  const [formReplicas, setFormReplicas] = useState('1')
  const [formImagePullPolicy, setFormImagePullPolicy] = useState('IfNotPresent')
  const [formLabels, setFormLabels] = useState<Array<{ key: string; value: string }>>([])
  const [formPorts, setFormPorts] = useState<Array<{ containerPort: string; protocol: string }>>([])
  const [formEnv, setFormEnv] = useState<Array<{ key: string; value: string }>>([])

  // Re-read clusterId from localStorage when it changes
  useEffect(() => {
    if (clusterId) return
    const timer = setInterval(() => {
      const id = localStorage.getItem('clusterId')
      if (id) { setClusterId(id); clearInterval(timer) }
    }, 500)
    return () => clearInterval(timer)
  }, [clusterId])

  const fetchNamespaces = async () => {
    if (!clusterId) return
    try {
      const data = await api<Namespace[] | ApiResponse<Namespace[]>>('/mrboard/ns/v1/List?clusterId=' + clusterId)
      const list = Array.isArray(data) ? data : (data as ApiResponse<Namespace[]>).data || []
      setNamespaces(list.map(n => typeof n === 'string' ? n : n.name))
    } catch { /* optional */ }
  }

  const fetchDeploys = async () => {
    if (!clusterId) { setLoading(false); return }
    setLoading(true)
    try {
      const nsParam = namespace ? '&nameSpace=' + namespace : ''
      const data = await api<ApiResponse<DeployListItem[]>>('/mrboard/deploy/v1/List?clusterId=' + clusterId + nsParam)
      setDeploys(data.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { if (clusterId) fetchNamespaces() }, [clusterId])
  useEffect(() => { if (clusterId) fetchDeploys() }, [clusterId, namespace])

  useEffect(() => {
    if (!searchName) { setFiltered(deploys) }
    else { setFiltered(deploys.filter(d => d.deployName.toLowerCase().includes(searchName.toLowerCase()))) }
  }, [deploys, searchName])

  const handleRestart = async () => {
    if (!restartTarget) return
    try {
      await api('/mrboard/deploy/v1/Restart?clusterId=' + clusterId + '&nameSpace=' + restartTarget.nameSpace + '&deployName=' + restartTarget.deployName)
      toast.success('重启成功')
      setRestartTarget(null)
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/mrboard/deploy/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&deployName=' + deleteTarget.deployName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchDeploys()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleScale = async () => {
    if (!scaleTarget) return
    const num = parseInt(scaleValue, 10)
    if (isNaN(num) || num < 0) { toast.error('请输入有效的副本数量'); return }
    try {
      await api('/mrboard/deploy/v1/Replicas?clusterId=' + clusterId + '&nameSpace=' + scaleTarget.nameSpace + '&deployName=' + scaleTarget.deployName, {
        method: 'POST', body: JSON.stringify({ podNumber: num }),
      })
      toast.success('伸缩成功')
      setScaleTarget(null)
      fetchDeploys()
    } catch (err) { toast.error((err as Error).message) }
  }

  // Create helpers
  const addLabel = () => setFormLabels([...formLabels, { key: '', value: '' }])
  const removeLabel = (i: number) => setFormLabels(formLabels.filter((_, idx) => idx !== i))
  const updateLabel = (i: number, field: 'key' | 'value', val: string) => {
    const next = [...formLabels]; next[i] = { ...next[i], [field]: val }; setFormLabels(next)
  }

  const addPort = () => setFormPorts([...formPorts, { containerPort: '', protocol: 'TCP' }])
  const removePort = (i: number) => setFormPorts(formPorts.filter((_, idx) => idx !== i))
  const updatePort = (i: number, field: 'containerPort' | 'protocol', val: string) => {
    const next = [...formPorts]; next[i] = { ...next[i], [field]: val }; setFormPorts(next)
  }

  const addEnv = () => setFormEnv([...formEnv, { key: '', value: '' }])
  const removeEnv = (i: number) => setFormEnv(formEnv.filter((_, idx) => idx !== i))
  const updateEnv = (i: number, field: 'key' | 'value', val: string) => {
    const next = [...formEnv]; next[i] = { ...next[i], [field]: val }; setFormEnv(next)
  }

  const resetCreateForm = () => {
    setFormNamespace('default'); setFormName(''); setFormImage(''); setFormReplicas('1')
    setFormImagePullPolicy('IfNotPresent'); setFormLabels([]); setFormPorts([]); setFormEnv([])
    setYamlContent(defaultYaml)
  }

  const buildYaml = () => {
    const labels = formLabels.filter(l => l.key)
    const labelsYaml = labels.length > 0 ? labels.map(l => `        ${l.key}: "${l.value}"`).join('\n') : '        app: "my-app"'
    const ports = formPorts.filter(p => p.containerPort)
    const portsYaml = ports.length > 0 ? ports.map(p => `          - containerPort: ${p.containerPort}\n            protocol: ${p.protocol}`).join('\n') : ''
    const env = formEnv.filter(e => e.key)
    const envYaml = env.length > 0 ? env.map(e => `            - name: ${e.key}\n              value: "${e.value}"`).join('\n') : ''

    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${formName || 'my-deploy'}
  namespace: ${formNamespace || 'default'}
spec:
  replicas: ${formReplicas || 1}
  selector:
    matchLabels:
${labelsYaml}
  template:
    metadata:
      labels:
${labelsYaml}
    spec:
      containers:
      - name: ${formName || 'my-container'}
        image: ${formImage || 'nginx:latest'}
        imagePullPolicy: ${formImagePullPolicy}
${portsYaml ? '        ports:\n' + portsYaml : ''}
${envYaml ? '        env:\n' + envYaml : ''}`
  }

  const handleTabSwitch = (tab: 'form' | 'yaml') => {
    if (tab === 'yaml') setYamlContent(buildYaml())
    setCreateTab(tab)
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (createTab === 'form') {
        if (!formName) { toast.error('请输入名称'); setSubmitting(false); return }
        if (!formImage) { toast.error('请输入镜像地址'); setSubmitting(false); return }
        const labels = formLabels.filter(l => l.key).map(l => `${l.key}=${l.value}`).join(',')
        await api('/mrboard/deploy/v1/Create', {
          method: 'POST',
          body: JSON.stringify({
            clusterId,
            nameSpace: formNamespace,
            deployName: formName,
            imageUrl: formImage,
            replicas: Number(formReplicas),
            labels,
          }),
        })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, {
          method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' },
        })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      resetCreateForm()
      fetchDeploys()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">应用列表</h1>
        <Button onClick={() => setCreateOpen(true)}><Plus size={14} className="mr-1" />创建</Button>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">应用名称</label>
              <Input placeholder="搜索应用名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">命名空间</label>
              <Select value={namespace || '__all__'} onValueChange={v => setNamespace(v === '__all__' ? '' : (v ?? ''))}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="所有空间" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">所有空间</SelectItem>
                  {namespaces.map(ns => <SelectItem key={ns} value={ns}>{ns}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDeploys}>
              <Search size={14} className="mr-1" />搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>命名空间</TableHead>
                <TableHead className="w-20">容器</TableHead>
                <TableHead>镜像</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无应用</TableCell></TableRow>
              ) : filtered.map(d => (
                <TableRow key={d.nameSpace + '/' + d.deployName}>
                  <TableCell className="font-medium">{d.deployName}</TableCell>
                  <TableCell>{d.nameSpace}</TableCell>
                  <TableCell>
                    <Badge variant={d.replicas === d.availableReplicas ? 'default' : 'destructive'}>{d.podNumber}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-xs truncate" title={d.imageUrl}>{d.imageUrl}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {d.labels ? d.labels.split(',').map((label, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{label.trim()}</Badge>
                      )) : '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => navigate('/deploy/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&deployName=' + d.deployName)}>
                        <Eye size={14} className="mr-1" />详情
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setScaleTarget(d); setScaleValue(String(d.replicas)) }}>
                        <Scale size={14} className="mr-1" />伸缩
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setRestartTarget(d)}>
                        <RotateCcw size={14} className="mr-1" />重启
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/deploy/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&deployName=' + d.deployName)}>
                        <FileCode size={14} className="mr-1" />YAML
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(d)}>
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>创建 Deployment</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => handleTabSwitch('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => handleTabSwitch('yaml')}>YAML 创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="rounded-lg border p-3 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">基本信息</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">命名空间</label>
                    <Select value={formNamespace} onValueChange={(v: string | null) => { if (v) setFormNamespace(v) }}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {namespaces.map(ns => <SelectItem key={ns} value={ns}>{ns}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-deploy" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">镜像地址 *</label><Input value={formImage} onChange={e => setFormImage(e.target.value)} placeholder="nginx:latest" /></div>
                  <div><label className="text-sm font-medium">副本数</label><Input type="number" min="0" value={formReplicas} onChange={e => setFormReplicas(e.target.value)} /></div>
                </div>
                <div>
                  <label className="text-sm font-medium">镜像拉取策略</label>
                  <Select value={formImagePullPolicy} onValueChange={(v: string | null) => { if (v) setFormImagePullPolicy(v) }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IfNotPresent">IfNotPresent</SelectItem>
                      <SelectItem value="Always">Always</SelectItem>
                      <SelectItem value="Never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Labels */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">标签</h4>
                  <Button variant="outline" size="sm" onClick={addLabel}><Plus size={14} className="mr-1" />添加</Button>
                </div>
                {formLabels.length === 0 && <p className="text-xs text-muted-foreground">未配置标签</p>}
                {formLabels.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={l.key} onChange={e => updateLabel(i, 'key', e.target.value)} placeholder="key" className="flex-1" />
                    <Input value={l.value} onChange={e => updateLabel(i, 'value', e.target.value)} placeholder="value" className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => removeLabel(i)}><X size={14} /></Button>
                  </div>
                ))}
              </div>

              {/* Ports */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">端口</h4>
                  <Button variant="outline" size="sm" onClick={addPort}><Plus size={14} className="mr-1" />添加</Button>
                </div>
                {formPorts.length === 0 && <p className="text-xs text-muted-foreground">未配置端口</p>}
                {formPorts.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="number" value={p.containerPort} onChange={e => updatePort(i, 'containerPort', e.target.value)} placeholder="80" className="flex-1" />
                    <Select value={p.protocol} onValueChange={(v: string | null) => { if (v) updatePort(i, 'protocol', v) }}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TCP">TCP</SelectItem>
                        <SelectItem value="UDP">UDP</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removePort(i)}><X size={14} /></Button>
                  </div>
                ))}
              </div>

              {/* Env Vars */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">环境变量</h4>
                  <Button variant="outline" size="sm" onClick={addEnv}><Plus size={14} className="mr-1" />添加</Button>
                </div>
                {formEnv.length === 0 && <p className="text-xs text-muted-foreground">未配置环境变量</p>}
                {formEnv.map((e, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={e.key} onChange={ev => updateEnv(i, 'key', ev.target.value)} placeholder="KEY" className="flex-1" />
                    <Input value={e.value} onChange={ev => updateEnv(i, 'value', ev.target.value)} placeholder="value" className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => removeEnv(i)}><X size={14} /></Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <textarea
              value={yamlContent}
              onChange={e => setYamlContent(e.target.value)}
              className="w-full h-80 rounded-md border border-input bg-slate-950 text-green-400 font-mono text-sm p-4 resize-y"
              spellCheck={false}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm() }}>取消</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? '创建中...' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">确定删除应用 <span className="font-mono font-medium text-foreground">{deleteTarget?.deployName}</span>？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restart Dialog */}
      <Dialog open={!!restartTarget} onOpenChange={open => { if (!open) setRestartTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认重启</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">确定重启应用 <span className="font-mono font-medium text-foreground">{restartTarget?.deployName}</span>？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestartTarget(null)}>取消</Button>
            <Button onClick={handleRestart}>重启</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scale Dialog */}
      <Dialog open={!!scaleTarget} onOpenChange={open => { if (!open) setScaleTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>调整副本数</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">应用: <span className="font-mono font-medium text-foreground">{scaleTarget?.deployName}</span></p>
            <label className="text-sm">副本数量</label>
            <Input type="number" min={0} value={scaleValue} onChange={e => setScaleValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScale()} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScaleTarget(null)}>取消</Button>
            <Button onClick={handleScale}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
