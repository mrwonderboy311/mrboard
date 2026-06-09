import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, FileCode, Trash2, Eye, Plus, Route, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

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
  const [nsFilter, setNsFilter] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNameSpace, setFormNameSpace] = useState('')
  const [formIngressName, setFormIngressName] = useState('')
  const [formIngressClassName, setFormIngressClassName] = useState('')
  const [formTlsSecretName, setFormTlsSecretName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<IngressItem | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')
  const [ruleRows, setRuleRows] = useState<RuleRow[]>([{ host: '', path: '/', backendService: '', backendPort: '80' }])

  const addRuleRow = () => setRuleRows(prev => [...prev, { host: '', path: '/', backendService: '', backendPort: '80' }])
  const removeRuleRow = (idx: number) => setRuleRows(prev => prev.filter((_, i) => i !== idx))
  const updateRuleRow = (idx: number, field: keyof RuleRow, val: string) => {
    setRuleRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api<{ code: number; data: IngressItem[] }>('/mrboard/ing/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { if (!silent) setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  const namespaces = useMemo(() => [...new Set(items.map(i => i.nameSpace).filter(Boolean))].sort(), [items])
  useEffect(() => { setFiltered(items.filter(i => (!nsFilter || i.nameSpace === nsFilter) && (!searchName || i.ingressName.toLowerCase().includes(searchName.toLowerCase())))) }, [items, searchName, nsFilter])
  useEffect(() => { setPage(1) }, [searchName, nsFilter])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget.ingressName)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/ing/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&ingName=' + deleteTarget.ingressName)
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
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<IngressItem>[] = [
    {
      key: 'ingressName', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === d.ingressName ? <Loader2 size={14} className="text-primary animate-spin" /> : <Route size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.ingressName}</div>
            {operatingDeploy === d.ingressName && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{d.ingressClass || '-'}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'rules', header: 'Hosts', className: 'max-w-xs truncate text-xs', render: (d) => d.rules },
    { key: 'endpoint', header: 'Address', className: 'font-mono text-xs', render: (d) => d.endpoint || '-' },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/ingress/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&ingName=' + d.ingressName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/ingress/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&ingName=' + d.ingressName) }}>
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
      <PageHeader title="路由" description="Ingress 管理">
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认删除"
        description={`确定删除 ${deleteTarget?.ingressName}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
