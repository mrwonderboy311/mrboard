import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Eye, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface RouteItem { name: string; nameSpace: string; parentRefs: string; rules: number; createTime: string }

interface BackendRow { service: string; port: string; weight: string }

const defaultYaml = `apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: my-tcproute
  namespace: default
spec:
  parentRefs:
    - name: my-gateway
  rules:
    - backendRefs:
        - name: my-service
          port: 80`

export default function TcpRouteList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RouteItem[]>([])
  const [filtered, setFiltered] = useState<RouteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNamespace, setFormNamespace] = useState('default')
  const [formName, setFormName] = useState('')
  const [formGatewayName, setFormGatewayName] = useState('')
  const [formBackendService, setFormBackendService] = useState('')
  const [formBackendPort, setFormBackendPort] = useState('80')

  // Enhanced: multiple backends with weight
  const [backends, setBackends] = useState<BackendRow[]>([{ service: '', port: '80', weight: '100' }])

  const addBackend = () => setBackends([...backends, { service: '', port: '80', weight: '100' }])
  const removeBackend = (i: number) => { if (backends.length > 1) setBackends(backends.filter((_, idx) => idx !== i)) }
  const updateBackend = (i: number, field: keyof BackendRow, val: string) => { const next = [...backends]; next[i] = { ...next[i], [field]: val }; setBackends(next) }

  const resetForm = () => {
    setFormNamespace('default'); setFormName(''); setFormGatewayName('')
    setFormBackendService(''); setFormBackendPort('80')
    setBackends([{ service: '', port: '80', weight: '100' }])
    setYamlContent(defaultYaml)
  }

  const buildYaml = () => {
    const effectiveBackends = backends.filter(b => b.service)
    if (effectiveBackends.length === 0 && formBackendService) {
      effectiveBackends.push({ service: formBackendService, port: formBackendPort, weight: '100' })
    }
    const backendsYaml = (effectiveBackends.length > 0 ? effectiveBackends : [{ service: 'my-service', port: '80', weight: '100' }]).map(b => {
      let s = `        - name: ${b.service}\n          port: ${b.port}`
      if (effectiveBackends.length > 1 && b.weight) s += `\n          weight: ${b.weight}`
      return s
    }).join('\n')
    return `apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: ${formName || 'my-tcproute'}
  namespace: ${formNamespace || 'default'}
spec:
  parentRefs:
    - name: ${formGatewayName || 'my-gateway'}
  rules:
    - backendRefs:
${backendsYaml}`
  }

  const handleTabSwitch = (tab: 'form' | 'yaml') => {
    if (tab === 'yaml') setYamlContent(buildYaml())
    setCreateTab(tab)
  }

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: RouteItem[] }>('/mrboard/tcproute/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.name.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  const handleDelete = async (item: RouteItem) => {
    if (!confirm('确定删除 ' + item.name + '？')) return
    try { await api('/mrboard/tcproute/v1/Delete?clusterId=' + clusterId + '&nameSpace=' + item.nameSpace + '&routeName=' + item.name); toast.success('删除成功'); fetchData() }
    catch (err) { toast.error((err as Error).message) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (createTab === 'form') {
        if (!formName) { toast.error('请输入名称'); setSubmitting(false); return }
        await api('/mrboard/tcproute/v1/Create', { method: 'POST', body: JSON.stringify({ clusterId, nameSpace: formNamespace, routeName: formName, gatewayName: formGatewayName, backendService: formBackendService, backendPort: Number(formBackendPort) }) })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      resetForm()
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">TCP路由[TCPRoute]</h1>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
      </div>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>名称</TableHead><TableHead>命名空间</TableHead><TableHead>父引用</TableHead><TableHead>规则数</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
        <TableBody>{loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">加载中...</TableCell></TableRow>
        : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
        : filtered.map(d => (<TableRow key={d.nameSpace + '/' + d.name}><TableCell className="font-medium">{d.name}</TableCell><TableCell>{d.nameSpace}</TableCell><TableCell>{d.parentRefs || '-'}</TableCell><TableCell>{d.rules}</TableCell><TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell><TableCell><div className="flex gap-1"><Button variant="outline" size="sm" onClick={() => navigate('/k8s/tcproute/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&routeName=' + d.name)}><Eye size={14} /></Button><Button variant="outline" size="sm" onClick={() => navigate('/k8s/tcproute/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&routeName=' + d.name)}><FileCode size={14} /></Button><Button variant="outline" size="sm" onClick={() => handleDelete(d)}><Trash2 size={14} className="text-destructive" /></Button></div></TableCell></TableRow>))}</TableBody>
      </Table></CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增 TCPRoute</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => handleTabSwitch('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => handleTabSwitch('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="rounded-lg border p-3 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">基本信息</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">命名空间</label><Input value={formNamespace} onChange={e => setFormNamespace(e.target.value)} placeholder="default" /></div>
                  <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-tcproute" /></div>
                </div>
                <div><label className="text-sm font-medium">网关名称</label><Input value={formGatewayName} onChange={e => setFormGatewayName(e.target.value)} placeholder="my-gateway" /></div>
              </div>

              {/* Multiple Backends with Weight */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground">后端服务</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">TCP 路由支持多后端负载均衡</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={addBackend}><Plus size={14} className="mr-1" />添加后端</Button>
                </div>
                {backends.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                    <Input value={b.service} onChange={e => updateBackend(i, 'service', e.target.value)} placeholder="my-service" className="flex-1" />
                    <Input type="number" value={b.port} onChange={e => updateBackend(i, 'port', e.target.value)} placeholder="80" className="w-24" />
                    <div className="w-28">
                      <Input type="number" value={b.weight} onChange={e => updateBackend(i, 'weight', e.target.value)} placeholder="权重" />
                    </div>
                    {backends.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeBackend(i)}><X size={14} /></Button>}
                  </div>
                ))}
              </div>

              {/* Legacy fallback */}
              <div className="rounded-lg border p-3 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">快速配置 <span className="text-xs font-normal">(单后端时使用)</span></h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">后端服务</label><Input value={formBackendService} onChange={e => setFormBackendService(e.target.value)} placeholder="my-service" /></div>
                  <div><label className="text-sm font-medium">后端端口</label><Input type="number" value={formBackendPort} onChange={e => setFormBackendPort(e.target.value)} placeholder="80" /></div>
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
