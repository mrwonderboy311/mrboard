import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Play, Eye, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

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
  const [runTarget, setRunTarget] = useState<CronJobItem | null>(null)

  const addEnvVar = () => setFormEnvVars([...formEnvVars, { key: '', value: '' }])
  const removeEnvVar = (idx: number) => setFormEnvVars(formEnvVars.filter((_, i) => i !== idx))
  const updateEnvVar = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...formEnvVars]
    next[idx] = { ...next[idx], [field]: val }
    setFormEnvVars(next)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: CronJobItem[] }>('/mrboard/cronjob/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.cronjobName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

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
    try {
      await api('/mrboard/cronjob/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&cronjobName=' + deleteTarget.cronjobName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (createTab === 'form') {
        if (!formName) { toast.error('请输入名称'); setSubmitting(false); return }
        await api('/mrboard/cronjob/v1/Create', { method: 'POST', body: JSON.stringify({ clusterId, nameSpace: formNamespace, cronJobName: formName, imageUrl: formImage, schedule: formSchedule, command: formCommand }), headers: { 'Content-Type': 'application/json' } })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormNamespace(''); setFormName(''); setFormSchedule(''); setFormImage(''); setFormCommand('')
      setFormRestartPolicy('OnFailure'); setFormSuccessHistory('3'); setFormFailedHistory('1')
      setFormEnvVars([{ key: '', value: '' }])
      setYamlContent(defaultYaml)
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">定时任务[CronJob]</h1>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
      </div>
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
          <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>名称</TableHead><TableHead>命名空间</TableHead><TableHead>调度</TableHead><TableHead>暂停</TableHead><TableHead>活跃</TableHead><TableHead>上次调度</TableHead><TableHead>镜像</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={9} className="text-center py-8">加载中...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            : filtered.map(d => (
              <TableRow key={d.nameSpace + '/' + d.cronjobName}>
                <TableCell className="font-medium">{d.cronjobName}</TableCell>
                <TableCell>{d.nameSpace}</TableCell>
                <TableCell className="font-mono text-sm">{d.schedule}</TableCell>
                <TableCell><Badge variant={d.suspend ? 'destructive' : 'default'}>{d.suspend ? '是' : '否'}</Badge></TableCell>
                <TableCell>{d.active}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.lastSchedule || '-'}</TableCell>
                <TableCell className="font-mono text-xs max-w-xs truncate" title={d.imageUrl}>{d.imageUrl}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/cronjob/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&cronjobName=' + d.cronjobName)}><Eye size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => setRunTarget(d)}><Play size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/cronjob/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&cronjobName=' + d.cronjobName)}><FileCode size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteTarget(d)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增 CronJob</DialogTitle></DialogHeader>
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

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p>确定删除 {deleteTarget?.cronjobName}？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
