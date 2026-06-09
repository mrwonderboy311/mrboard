import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, FileCode, Trash2, Eye, Plus, Network, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'


interface GtwItem {
  name: string
  nameSpace: string
  className: string
  addresses: string
  listeners: string
  status: string
  createTime: string
}

const defaultYaml = `apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: default
spec:
  gatewayClassName: ""
  listeners:
    - name: http
      protocol: HTTP
      port: 80`

export default function GatewayList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<GtwItem[]>([])
  const [filtered, setFiltered] = useState<GtwItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [nsFilter, setNsFilter] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNamespace, setFormNamespace] = useState('')
  const [formName, setFormName] = useState('')
  const [formGatewayClassName, setFormGatewayClassName] = useState('')
  const [formListenerName, setFormListenerName] = useState('')
  const [formProtocol, setFormProtocol] = useState('HTTP')
  const [formPort, setFormPort] = useState('80')
  const [formHostname, setFormHostname] = useState('')
  const [formAllowedNamespaces, setFormAllowedNamespaces] = useState('Same')
  const [deleteTarget, setDeleteTarget] = useState<GtwItem | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api<{ code: number; data: GtwItem[] }>('/mrboard/gateway/v1/List?clusterId=' + clusterId)
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
      await api('/mrboard/gateway/v1/Delete?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&gtwName=' + deleteTarget.name)
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
        await api('/mrboard/gateway/v1/Create', { method: 'POST', body: JSON.stringify({ clusterId, nameSpace: formNamespace, gatewayName: formName, gatewayClassName: formGatewayClassName, listenerName: formListenerName, protocol: formProtocol, port: Number(formPort) }), headers: { 'Content-Type': 'application/json' } })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormNamespace(''); setFormName(''); setFormGatewayClassName(''); setFormListenerName(''); setFormProtocol('HTTP'); setFormPort('80')
      setFormHostname(''); setFormAllowedNamespaces('Same')
      setYamlContent(defaultYaml)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<GtwItem>[] = [
    {
      key: 'name', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === d.name ? <Loader2 size={14} className="text-primary animate-spin" /> : <Network size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.name}</div>
            {operatingDeploy === d.name && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{d.className}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'status', header: '状态', render: (d) => <StatusBadge status={d.status} /> },
    { key: 'addresses', header: '地址', className: 'font-mono text-xs', render: (d) => d.addresses || '-' },
    { key: 'listeners', header: '监听器', className: 'text-xs', render: (d) => d.listeners },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/gateway/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&gtwName=' + d.name) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/gateway/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&gtwName=' + d.name) }}>
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
      <PageHeader title="网关" description="Gateway 管理">
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
          <DialogHeader><DialogTitle>新增 Gateway</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">命名空间</label><Input value={formNamespace} onChange={e => setFormNamespace(e.target.value)} placeholder="default" /></div>
              <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-gateway" /></div>
              <div><label className="text-sm font-medium">GatewayClassName</label><Input value={formGatewayClassName} onChange={e => setFormGatewayClassName(e.target.value)} placeholder="my-gateway-class" /></div>
              <div><label className="text-sm font-medium">主机名</label><Input value={formHostname} onChange={e => setFormHostname(e.target.value)} placeholder="*.example.com" /></div>
              <div><label className="text-sm font-medium">Listener名称</label><Input value={formListenerName} onChange={e => setFormListenerName(e.target.value)} placeholder="http" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">协议</label>
                  <Select value={formProtocol} onValueChange={v => { if (v) setFormProtocol(v) }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HTTP">HTTP</SelectItem>
                      <SelectItem value="HTTPS">HTTPS</SelectItem>
                      <SelectItem value="TCP">TCP</SelectItem>
                      <SelectItem value="UDP">UDP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">端口</label><Input type="number" value={formPort} onChange={e => setFormPort(e.target.value)} placeholder="80" /></div>
                <div>
                  <label className="text-sm font-medium">允许命名空间</label>
                  <Select value={formAllowedNamespaces} onValueChange={v => { if (v) setFormAllowedNamespaces(v) }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Same">Same</SelectItem>
                      <SelectItem value="All">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
