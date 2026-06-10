import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Search, FileCode, Trash2, Eye, Plus, X, Zap, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface RouteItem { grpcrouteName: string; nameSpace: string; hostnames: string; parentRefs: string; rules: number; createTime: string }
interface BackendRow { service: string; port: string }

const defaultYaml = `apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: my-grpcroute
  namespace: default
spec:
  parentRefs:
    - name: my-gateway
  hostnames:
    - grpc.example.com
  rules:
    - backendRefs:
        - name: my-service
          port: 50051`

export default function GrpcRouteList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RouteItem[]>([])
  const [filtered, setFiltered] = useState<RouteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
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
  const [formBackendService, setFormBackendService] = useState('')
  const [formBackendPort, setFormBackendPort] = useState('50051')
  const [deleteTarget, setDeleteTarget] = useState<RouteItem | null>(null)
  const [operatingName, setOperatingName] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [backends, setBackends] = useState<BackendRow[]>([{ service: '', port: '50051' }])
  const [methodService, setMethodService] = useState('')
  const [methodName, setMethodName] = useState('')

  const addBackend = () => setBackends([...backends, { service: '', port: '50051' }])
  const removeBackend = (i: number) => { if (backends.length > 1) setBackends(backends.filter((_, idx) => idx !== i)) }
  const updateBackend = (i: number, field: keyof BackendRow, val: string) => { const next = [...backends]; next[i] = { ...next[i], [field]: val }; setBackends(next) }

  const resetForm = () => {
    setFormNamespace('default'); setFormName(''); setFormGatewayName(''); setFormHostnames('')
    setFormBackendService(''); setFormBackendPort('50051')
    setBackends([{ service: '', port: '50051' }]); setMethodService(''); setMethodName('')
    setYamlContent(defaultYaml)
  }

  const buildYaml = () => {
    const hostnames = formHostnames.split(',').map(h => h.trim()).filter(Boolean)
    const effectiveBackends = backends.filter(b => b.service)
    if (effectiveBackends.length === 0 && formBackendService) {
      effectiveBackends.push({ service: formBackendService, port: formBackendPort })
    }
    const matchSection = methodService || methodName ? `    - matches:\n        - method:\n            service: ${methodService || ''}\n            method: ${methodName || ''}\n` : ''
    const backendSection = (effectiveBackends.length > 0 ? effectiveBackends : [{ service: 'my-service', port: '50051' }]).map(b =>
      `        - name: ${b.service}\n          port: ${b.port}`
    ).join('\n')
    return `apiVersion: gateway.networking.k8s.io/v1
kind: GRPCRoute
metadata:
  name: ${formName || 'my-grpcroute'}
  namespace: ${formNamespace || 'default'}
spec:
  parentRefs:
    - name: ${formGatewayName || 'my-gateway'}
  hostnames:
${(hostnames.length > 0 ? hostnames : ['grpc.example.com']).map(h => '    - ' + h).join('\n')}
  rules:
${matchSection}    - backendRefs:
${backendSection}`
  }

  const handleTabSwitch = (tab: 'form' | 'yaml') => {
    if (tab === 'yaml') setYamlContent(buildYaml())
    setCreateTab(tab)
  }

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: RouteItem[] }>('/mrboard/grpcroute/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.grpcrouteName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setOperatingName(deleteTarget.grpcrouteName)
    try { await api('/mrboard/grpcroute/v1/Delete?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&grpcrouteName=' + deleteTarget.grpcrouteName); toast.success('删除成功'); setDeleteTarget(null); fetchData() }
    catch (err) { toast.error((err as Error).message) }
    finally { setDeleting(false); setOperatingName(null) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (createTab === 'form') {
        if (!formName) { toast.error('请输入名称'); setSubmitting(false); return }
        await api('/mrboard/grpcroute/v1/Create', { method: 'POST', body: JSON.stringify({ clusterId, nameSpace: formNamespace, routeName: formName, gatewayName: formGatewayName, hostnames: formHostnames, backendService: formBackendService, backendPort: Number(formBackendPort) }) })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      resetForm()
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<RouteItem>[] = [
    {
      key: 'name', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Zap size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.grpcrouteName}</div>
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
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/grpcroute/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&grpcrouteName=' + d.grpcrouteName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/grpcroute/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&grpcrouteName=' + d.grpcrouteName) }}>
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
      <PageHeader title="GRPC路由" description="GRPCRoute 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />创建</Button>
      </PageHeader>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
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
          <DialogHeader><DialogTitle>创建 GRPCRoute</DialogTitle></DialogHeader>
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
                  <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-grpcroute" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">网关名称</label><Input value={formGatewayName} onChange={e => setFormGatewayName(e.target.value)} placeholder="my-gateway" /></div>
                  <div><label className="text-sm font-medium">主机名</label><Input value={formHostnames} onChange={e => setFormHostnames(e.target.value)} placeholder="grpc.example.com, api.grpc.example.com" /></div>
                </div>
                <p className="text-xs text-muted-foreground">多个主机名用英文逗号分隔</p>
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">gRPC 方法匹配 <span className="text-xs font-normal">(可选)</span></h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">服务名称 (Service)</label><Input value={methodService} onChange={e => setMethodService(e.target.value)} placeholder="mypackage.MyService" /></div>
                  <div><label className="text-sm font-medium">方法名称 (Method)</label><Input value={methodName} onChange={e => setMethodName(e.target.value)} placeholder="MyMethod" /></div>
                </div>
                <p className="text-xs text-muted-foreground">指定 gRPC 服务和方法进行精确路由匹配</p>
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-muted-foreground">后端服务</h4>
                  <Button variant="outline" size="sm" onClick={addBackend}><Plus size={14} className="mr-1" />添加后端</Button>
                </div>
                {backends.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                    <Input value={b.service} onChange={e => updateBackend(i, 'service', e.target.value)} placeholder="my-service" className="flex-1" />
                    <Input type="number" value={b.port} onChange={e => updateBackend(i, 'port', e.target.value)} placeholder="50051" className="w-24" />
                    {backends.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeBackend(i)}><X size={14} /></Button>}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">快速配置 <span className="text-xs font-normal">(单后端时使用)</span></h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">后端服务</label><Input value={formBackendService} onChange={e => setFormBackendService(e.target.value)} placeholder="my-service" /></div>
                  <div><label className="text-sm font-medium">后端端口</label><Input type="number" value={formBackendPort} onChange={e => setFormBackendPort(e.target.value)} placeholder="50051" /></div>
                </div>
              </div>
            </div>
          ) : (
            <textarea value={yamlContent} onChange={e => setYamlContent(e.target.value)} className="w-full h-80 rounded-md border border-input bg-slate-950 text-green-400 font-mono text-sm p-4 resize-y" spellCheck={false} />
          )}
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button><Button onClick={handleCreate} disabled={submitting}>{submitting ? '创建中...' : '创建'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {operatingName && deleting && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-card border shadow-lg animate-[fadeInUp_0.3s_ease-out]">
          <Loader2 size={18} className="animate-spin text-primary" />
          <div>
            <div className="text-sm font-medium">{operatingName} 删除中...</div>
            <div className="text-xs text-muted-foreground">正在删除资源</div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description={`确定删除 ${deleteTarget?.grpcrouteName}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
