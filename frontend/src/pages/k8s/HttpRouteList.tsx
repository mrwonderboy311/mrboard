import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, FileCode, Trash2, Eye, Plus, X, Globe, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface RouteItem {
  name: string
  nameSpace: string
  hostnames: string
  parentRefs: string
  rules: number
  createTime: string
}

interface RuleRow { path: string; pathType: string; backendService: string; backendPort: string }
interface HeaderRow { key: string; value: string }

const defaultYaml = `apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-httproute
  namespace: default
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: my-service
          port: 80`

export default function HttpRouteList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RouteItem[]>([])
  const [filtered, setFiltered] = useState<RouteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [nsFilter, setNsFilter] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNamespace, setFormNamespace] = useState('default')
  const [formName, setFormName] = useState('')
  const [formGatewayName, setFormGatewayName] = useState('')
  const [formHostnames, setFormHostnames] = useState('')
  const [formPath, setFormPath] = useState('/')
  const [formBackendService, setFormBackendService] = useState('')
  const [formBackendPort, setFormBackendPort] = useState('80')
  const [deleteTarget, setDeleteTarget] = useState<RouteItem | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')

  const [formPathType, setFormPathType] = useState('PathPrefix')
  const [rules, setRules] = useState<RuleRow[]>([{ path: '/', pathType: 'PathPrefix', backendService: '', backendPort: '80' }])
  const [headers, setHeaders] = useState<HeaderRow[]>([])

  const addRule = () => setRules([...rules, { path: '/', pathType: 'PathPrefix', backendService: '', backendPort: '80' }])
  const removeRule = (i: number) => { if (rules.length > 1) setRules(rules.filter((_, idx) => idx !== i)) }
  const updateRule = (i: number, field: keyof RuleRow, val: string) => { const next = [...rules]; next[i] = { ...next[i], [field]: val }; setRules(next) }

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }])
  const removeHeader = (i: number) => setHeaders(headers.filter((_, idx) => idx !== i))
  const updateHeader = (i: number, field: keyof HeaderRow, val: string) => { const next = [...headers]; next[i] = { ...next[i], [field]: val }; setHeaders(next) }

  const resetForm = () => {
    setFormNamespace('default'); setFormName(''); setFormGatewayName(''); setFormHostnames('')
    setFormPath('/'); setFormBackendService(''); setFormBackendPort('80')
    setFormPathType('PathPrefix')
    setRules([{ path: '/', pathType: 'PathPrefix', backendService: '', backendPort: '80' }])
    setHeaders([])
    setYamlContent(defaultYaml)
  }

  const buildYaml = () => {
    const hostnames = formHostnames.split(',').map(h => h.trim()).filter(Boolean)
    const yamlRules = rules.filter(r => r.backendService).map(r => {
      const rule: Record<string, unknown> = {}
      rule.matches = [{ path: { type: r.pathType, value: r.path || '/' } }]
      if (headers.length > 0) {
        const hdrMatches = headers.filter(h => h.key).map(h => ({ name: h.key, value: h.value }))
        if (hdrMatches.length > 0) (rule.matches as Record<string, unknown>[])[0].headers = hdrMatches
      }
      rule.backendRefs = [{ name: r.backendService, port: Number(r.backendPort) || 80 }]
      return rule
    })
    if (yamlRules.length === 0 && formBackendService) {
      const match: Record<string, unknown> = { path: { type: formPathType, value: formPath || '/' } }
      if (headers.length > 0) {
        const hdrMatches = headers.filter(h => h.key).map(h => ({ name: h.key, value: h.value }))
        if (hdrMatches.length > 0) match.headers = hdrMatches
      }
      yamlRules.push({ matches: [match], backendRefs: [{ name: formBackendService, port: Number(formBackendPort) || 80 }] })
    }
    const spec: Record<string, unknown> = { parentRefs: [{ name: formGatewayName || 'my-gateway' }] }
    if (hostnames.length > 0) spec.hostnames = hostnames
    spec.rules = yamlRules.length > 0 ? yamlRules : [{ matches: [{ path: { type: 'PathPrefix', value: '/' } }], backendRefs: [{ name: 'my-service', port: 80 }] }]
    return `apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: ${formName || 'my-httproute'}
  namespace: ${formNamespace || 'default'}
spec:
  parentRefs:
    - name: ${formGatewayName || 'my-gateway'}
  hostnames:
${(hostnames.length > 0 ? hostnames : ['example.com']).map(h => '    - ' + h).join('\n')}
  rules:
${(yamlRules.length > 0 ? yamlRules : [{ matches: [{ path: { type: 'PathPrefix', value: '/' } }], backendRefs: [{ name: 'my-service', port: 80 }] }]).map(r => {
  const m = (r.matches as Array<Record<string, unknown>>)[0]
  const p = m.path as Record<string, string>
  const hdrs = m.headers as Array<Record<string, string>> | undefined
  const b = (r.backendRefs as Array<Record<string, unknown>>)[0]
  let s = `    - matches:\n        - path:\n            type: ${p.type}\n            value: ${p.value}`
  if (hdrs && hdrs.length > 0) {
    s += '\n          headers:'
    hdrs.forEach(h => { s += `\n            - name: ${h.name}\n              value: ${h.value}` })
  }
  s += `\n      backendRefs:\n        - name: ${b.name}\n          port: ${b.port}`
  return s
}).join('\n')}`
  }

  const handleTabSwitch = (tab: 'form' | 'yaml') => {
    if (tab === 'yaml') setYamlContent(buildYaml())
    setCreateTab(tab)
  }

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api<{ code: number; data: RouteItem[] }>('/mrboard/httproute/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { if (!silent) setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  const namespaces = useMemo(() => [...new Set(items.map(i => i.nameSpace).filter(Boolean))].sort(), [items])
  useEffect(() => { setFiltered(items.filter(i => (!nsFilter || i.nameSpace === nsFilter) && (!searchName || i.name.toLowerCase().includes(searchName.toLowerCase())))) }, [items, searchName, nsFilter])
  useEffect(() => { setPage(1) }, [searchName, nsFilter])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget.name)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/httproute/v1/Delete?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&routeName=' + deleteTarget.name)
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
        await api('/mrboard/httproute/v1/Create', { method: 'POST', body: JSON.stringify({ clusterId, nameSpace: formNamespace, routeName: formName, gatewayName: formGatewayName, hostnames: formHostnames, path: formPath, backendService: formBackendService, backendPort: Number(formBackendPort) }) })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      resetForm()
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<RouteItem>[] = [
    {
      key: 'name', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === d.name ? <Loader2 size={14} className="text-primary animate-spin" /> : <Globe size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.name}</div>
            {operatingDeploy === d.name && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{d.hostnames || '-'}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'parentRefs', header: '父引用', className: 'text-xs', render: (d) => d.parentRefs || '-' },
    { key: 'rules', header: '规则数', render: (d) => <Badge variant="secondary" className="tabular-nums text-xs">{d.rules}</Badge> },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/httproute/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&routeName=' + d.name) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/httproute/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&routeName=' + d.name) }}>
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
      <PageHeader title="HTTP路由" description="HTTPRoute 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
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
          <DialogHeader><DialogTitle>新增 HTTPRoute</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => handleTabSwitch('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => handleTabSwitch('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">基本信息</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">命名空间</label><Input value={formNamespace} onChange={e => setFormNamespace(e.target.value)} placeholder="default" /></div>
                  <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-httproute" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">网关名称</label><Input value={formGatewayName} onChange={e => setFormGatewayName(e.target.value)} placeholder="my-gateway" /></div>
                  <div><label className="text-sm font-medium">主机名</label><Input value={formHostnames} onChange={e => setFormHostnames(e.target.value)} placeholder="example.com, api.example.com" /></div>
                </div>
                <p className="text-xs text-muted-foreground">多个主机名用英文逗号分隔</p>
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">路由规则</h4>
                  <Button variant="outline" size="sm" onClick={addRule}><Plus size={14} className="mr-1" />添加规则</Button>
                </div>
                {rules.map((rule, i) => (
                  <div key={i} className="rounded-md border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">规则 {i + 1}</span>
                      {rules.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeRule(i)}><X size={14} /></Button>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="text-xs font-medium">路径匹配</label><Input value={rule.path} onChange={e => updateRule(i, 'path', e.target.value)} placeholder="/" /></div>
                      <div>
                        <label className="text-xs font-medium">路径类型</label>
                        <Select value={rule.pathType} onValueChange={v => { if (v !== null) updateRule(i, 'pathType', v) }}>
                          <SelectTrigger className="w-full h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PathPrefix">PathPrefix</SelectItem>
                            <SelectItem value="Exact">Exact</SelectItem>
                            <SelectItem value="RegularExpression">RegularExpression</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><label className="text-xs font-medium">后端服务</label><Input value={rule.backendService} onChange={e => updateRule(i, 'backendService', e.target.value)} placeholder="my-service" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div><label className="text-xs font-medium">后端端口</label><Input type="number" value={rule.backendPort} onChange={e => updateRule(i, 'backendPort', e.target.value)} placeholder="80" /></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">请求头匹配 <span className="text-xs font-normal">(可选)</span></h4>
                  <Button variant="outline" size="sm" onClick={addHeader}><Plus size={14} className="mr-1" />添加</Button>
                </div>
                {headers.length === 0 && <p className="text-xs text-muted-foreground">未配置请求头匹配</p>}
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={h.key} onChange={e => updateHeader(i, 'key', e.target.value)} placeholder="Header Name" className="flex-1" />
                    <Input value={h.value} onChange={e => updateHeader(i, 'value', e.target.value)} placeholder="Header Value" className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => removeHeader(i)}><X size={14} /></Button>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">快速配置 <span className="text-xs font-normal">(单规则时使用)</span></h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-sm font-medium">路径</label><Input value={formPath} onChange={e => setFormPath(e.target.value)} placeholder="/" /></div>
                  <div><label className="text-sm font-medium">路径类型</label>
                    <Select value={formPathType} onValueChange={v => { if (v !== null) setFormPathType(v) }}>
                      <SelectTrigger className="w-full h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PathPrefix">PathPrefix</SelectItem>
                        <SelectItem value="Exact">Exact</SelectItem>
                        <SelectItem value="RegularExpression">RegularExpression</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-sm font-medium">后端端口</label><Input type="number" value={formBackendPort} onChange={e => setFormBackendPort(e.target.value)} placeholder="80" /></div>
                </div>
                <div><label className="text-sm font-medium">后端服务</label><Input value={formBackendService} onChange={e => setFormBackendService(e.target.value)} placeholder="my-service" /></div>
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
        description={`确定删除 ${deleteTarget?.name}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
