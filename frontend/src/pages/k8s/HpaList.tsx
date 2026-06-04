import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

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

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: HpaItem[] }>('/mrboard/hpa/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.hpaName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  const handleDelete = async (item: HpaItem) => {
    if (!confirm('确定删除 ' + item.hpaName + '？')) return
    try {
      await api('/mrboard/hpa/v1/Del?clusterId=' + clusterId + '&nameSpace=' + item.nameSpace + '&hpaName=' + item.hpaName)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
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
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">自动伸缩[HPA]</h1>
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
            <TableHead>名称</TableHead><TableHead>命名空间</TableHead><TableHead>目标</TableHead><TableHead>最小</TableHead><TableHead>最大</TableHead><TableHead>当前副本</TableHead><TableHead>目标CPU</TableHead><TableHead>当前CPU</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={9} className="text-center py-8">加载中...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            : filtered.map(d => (
              <TableRow key={d.nameSpace + '/' + d.hpaName}>
                <TableCell className="font-medium">{d.hpaName}</TableCell>
                <TableCell>{d.nameSpace}</TableCell>
                <TableCell>{d.targetRef}</TableCell>
                <TableCell>{d.minReplicas}</TableCell>
                <TableCell>{d.maxReplicas}</TableCell>
                <TableCell>{d.currentReplicas}</TableCell>
                <TableCell>{d.targetCPU}</TableCell>
                <TableCell><Badge variant={d.currentCPU ? 'default' : 'secondary'}>{d.currentCPU || '-'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/hpa/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&hpaName=' + d.hpaName)}><FileCode size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(d)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增 HPA</DialogTitle></DialogHeader>
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
    </div>
  )
}
