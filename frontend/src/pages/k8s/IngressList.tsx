import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface IngressItem {
  ingressName: string
  nameSpace: string
  ingressClass: string
  rules: string
  endpoint: string
  labels: string
  createTime: string
}

interface RuleRow { host: string; path: string; backendService: string; backendPort: string }

const defaultYaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  namespace: default
spec:
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-svc
                port:
                  number: 80`

export default function IngressList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<IngressItem[]>([])
  const [filtered, setFiltered] = useState<IngressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNameSpace, setFormNameSpace] = useState('')
  const [formIngressName, setFormIngressName] = useState('')
  const [formIngressClassName, setFormIngressClassName] = useState('')
  const [formTlsSecretName, setFormTlsSecretName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<IngressItem | null>(null)
  const [ruleRows, setRuleRows] = useState<RuleRow[]>([{ host: '', path: '/', backendService: '', backendPort: '80' }])

  const addRuleRow = () => setRuleRows(prev => [...prev, { host: '', path: '/', backendService: '', backendPort: '80' }])
  const removeRuleRow = (idx: number) => setRuleRows(prev => prev.filter((_, i) => i !== idx))
  const updateRuleRow = (idx: number, field: keyof RuleRow, val: string) => {
    setRuleRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: IngressItem[] }>('/mrboard/ing/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.ingressName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/mrboard/ing/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&ingName=' + deleteTarget.ingressName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (createTab === 'form') {
        if (!formIngressName) { toast.error('请输入名称'); setSubmitting(false); return }
        const firstRule = ruleRows[0] || { host: '', path: '/', backendService: '', backendPort: '80' }
        await api('/mrboard/ing/v1/Create', {
          method: 'POST',
          body: JSON.stringify({
            clusterId, nameSpace: formNameSpace, ingressName: formIngressName,
            ingressClassName: formIngressClassName || undefined,
            tlsSecretName: formTlsSecretName || undefined,
            host: firstRule.host, path: firstRule.path,
            backendService: firstRule.backendService, backendPort: Number(firstRule.backendPort),
            rules: ruleRows.filter(r => r.host || r.backendService).map(r => ({
              host: r.host, path: r.path || '/', backendService: r.backendService, backendPort: Number(r.backendPort) || 80,
            })),
          }),
        })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormNameSpace(''); setFormIngressName(''); setFormIngressClassName(''); setFormTlsSecretName('')
      setRuleRows([{ host: '', path: '/', backendService: '', backendPort: '80' }])
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">路由[Ingress]</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
        </div>
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
            <TableHead>名称</TableHead><TableHead>命名空间</TableHead><TableHead>Class</TableHead><TableHead>Hosts</TableHead><TableHead>Address</TableHead><TableHead>端口</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8">加载中...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            : filtered.map(d => (
              <TableRow key={d.nameSpace + '/' + d.ingressName}>
                <TableCell className="font-medium">{d.ingressName}</TableCell>
                <TableCell>{d.nameSpace}</TableCell>
                <TableCell>{d.ingressClass || '-'}</TableCell>
                <TableCell className="max-w-xs truncate">{d.rules}</TableCell>
                <TableCell className="font-mono text-sm">{d.endpoint || '-'}</TableCell>
                <TableCell className="font-mono text-sm">{d.endpoint || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/ingress/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&ingName=' + d.ingressName)}><Eye size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/ingress/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&ingName=' + d.ingressName)}><FileCode size={14} /></Button>
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
          <DialogHeader><DialogTitle>新增 Ingress</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">命名空间</label><Input value={formNameSpace} onChange={e => setFormNameSpace(e.target.value)} placeholder="default" /></div>
              <div><label className="text-sm font-medium">名称 *</label><Input value={formIngressName} onChange={e => setFormIngressName(e.target.value)} placeholder="my-ingress" /></div>
              <div><label className="text-sm font-medium">Ingress Class</label><Input value={formIngressClassName} onChange={e => setFormIngressClassName(e.target.value)} placeholder="nginx（可选）" /></div>
              <div className="space-y-2">
                <label className="text-sm font-medium">TLS 配置</label>
                <Input placeholder="TLS Secret 名称（可选）" value={formTlsSecretName} onChange={e => setFormTlsSecretName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">路由规则</label>
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground mb-1">
                  <span>域名</span><span>路径</span><span>后端 Service</span><span>后端端口</span><span></span>
                </div>
                {ruleRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                    <Input placeholder="example.com" value={row.host} onChange={e => updateRuleRow(idx, 'host', e.target.value)} />
                    <Input placeholder="/" value={row.path} onChange={e => updateRuleRow(idx, 'path', e.target.value)} />
                    <Input placeholder="my-svc" value={row.backendService} onChange={e => updateRuleRow(idx, 'backendService', e.target.value)} />
                    <Input type="number" min="1" placeholder="80" value={row.backendPort} onChange={e => updateRuleRow(idx, 'backendPort', e.target.value)} />
                    {ruleRows.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeRuleRow(idx)}>删除</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addRuleRow}>添加规则</Button>
              </div>
            </div>
          ) : (
            <textarea value={yamlContent} onChange={e => setYamlContent(e.target.value)} className="w-full h-80 rounded-md border border-input bg-slate-950 text-green-400 font-mono text-sm p-4 resize-y" spellCheck={false} />
          )}
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button><Button onClick={handleCreate} disabled={submitting}>{submitting ? '创建中...' : '创建'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p>确定删除路由 <span className="font-semibold">{deleteTarget?.ingressName}</span>？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
