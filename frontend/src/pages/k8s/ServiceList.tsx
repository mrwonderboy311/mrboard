import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'

interface SvcItem {
  serviceName: string
  nameSpace: string
  svcType: string
  svcIp: string
  svcPort: string
  lanEndpoint: string
  wanEndpoint: string
  labels: string
  createTime: string
}

interface PortRow { name: string; port: string; targetPort: string; protocol: string }
interface SelectorRow { key: string; value: string }

const defaultYaml = `apiVersion: v1
kind: Service
metadata:
  name: my-svc
  namespace: default
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
  selector:
    app: my-app`

export default function ServiceList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<SvcItem[]>([])
  const [filtered, setFiltered] = useState<SvcItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const clusterId = localStorage.getItem('clusterId') || ''
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNameSpace, setFormNameSpace] = useState('')
  const [formServiceName, setFormServiceName] = useState('')
  const [formType, setFormType] = useState('ClusterIP')
  const [portRows, setPortRows] = useState<PortRow[]>([{ name: '', port: '80', targetPort: '80', protocol: 'TCP' }])
  const [selectorRows, setSelectorRows] = useState<SelectorRow[]>([{ key: '', value: '' }])
  const [formSessionAffinity, setFormSessionAffinity] = useState('None')
  const [deleteTarget, setDeleteTarget] = useState<SvcItem | null>(null)

  const addPortRow = () => setPortRows(prev => [...prev, { name: '', port: '', targetPort: '', protocol: 'TCP' }])
  const removePortRow = (idx: number) => setPortRows(prev => prev.filter((_, i) => i !== idx))
  const updatePortRow = (idx: number, field: keyof PortRow, val: string) => {
    setPortRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const addSelectorRow = () => setSelectorRows(prev => [...prev, { key: '', value: '' }])
  const removeSelectorRow = (idx: number) => setSelectorRows(prev => prev.filter((_, i) => i !== idx))
  const updateSelectorRow = (idx: number, field: 'key' | 'value', val: string) => {
    setSelectorRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: SvcItem[] }>('/mrboard/svc/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.serviceName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/mrboard/svc/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&svcName=' + deleteTarget.serviceName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (createTab === 'form') {
        if (!formServiceName) { toast.error('请输入名称'); setSubmitting(false); return }
        const ports = portRows
          .filter(r => r.port)
          .map(r => {
            const name = r.name ? r.name + ':' : ''
            return name + r.port + ':' + (r.targetPort || r.port) + '/' + r.protocol
          })
          .join(',')
        const selector = selectorRows
          .filter(r => r.key.trim())
          .map(r => r.key.trim() + '=' + r.value.trim())
          .join(',')
        await api('/mrboard/svc/v1/Create', {
          method: 'POST',
          body: JSON.stringify({ clusterId, nameSpace: formNameSpace, serviceName: formServiceName, type: formType, ports, selector, sessionAffinity: formSessionAffinity }),
        })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormNameSpace(''); setFormServiceName(''); setFormType('ClusterIP')
      setPortRows([{ name: '', port: '80', targetPort: '80', protocol: 'TCP' }])
      setSelectorRows([{ key: '', value: '' }])
      setFormSessionAffinity('None')
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<SvcItem>[] = [
    {
      key: 'serviceName',
      header: '名称',
      className: 'font-medium',
      render: (d) => d.serviceName,
    },
    {
      key: 'nameSpace',
      header: '命名空间',
      render: (d) => d.nameSpace,
    },
    {
      key: 'svcType',
      header: '类型',
      render: (d) => <Badge variant="outline">{d.svcType}</Badge>,
    },
    {
      key: 'svcIp',
      header: 'ClusterIP',
      className: 'font-mono text-sm',
      render: (d) => d.svcIp,
    },
    {
      key: 'wanEndpoint',
      header: 'ExternalIP',
      className: 'font-mono text-sm',
      render: (d) => d.wanEndpoint || '-',
    },
    {
      key: 'svcPort',
      header: '端口',
      className: 'font-mono text-xs',
      render: (d) => d.svcPort,
    },
    {
      key: 'createTime',
      header: '创建时间',
      className: 'text-sm text-muted-foreground whitespace-nowrap',
      render: (d) => d.createTime,
    },
    {
      key: 'actions',
      header: '操作',
      render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/k8s/service/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&svcName=' + d.serviceName) }}>
            <Eye size={14} />
          </Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/k8s/service/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&svcName=' + d.serviceName) }}>
            <FileCode size={14} />
          </Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(d) }}>
            <Trash2 size={14} className="text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="服务" description="Service 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
      </PageHeader>

      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索服务名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
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
          emptyMessage="暂无服务"
        />
      </CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增 Service</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">命名空间</label><Input value={formNameSpace} onChange={e => setFormNameSpace(e.target.value)} placeholder="default" /></div>
              <div><label className="text-sm font-medium">名称 *</label><Input value={formServiceName} onChange={e => setFormServiceName(e.target.value)} placeholder="my-svc" /></div>
              <div>
                <label className="text-sm font-medium">类型</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="ClusterIP">ClusterIP</option>
                  <option value="NodePort">NodePort</option>
                  <option value="LoadBalancer">LoadBalancer</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">端口</label>
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-muted-foreground mb-1">
                  <span>名称</span><span>端口</span><span>目标端口</span><span>协议</span><span></span>
                </div>
                {portRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                    <Input placeholder="http" value={row.name} onChange={e => updatePortRow(idx, 'name', e.target.value)} />
                    <Input placeholder="80" type="number" min="1" value={row.port} onChange={e => updatePortRow(idx, 'port', e.target.value)} />
                    <Input placeholder="80" type="number" min="1" value={row.targetPort} onChange={e => updatePortRow(idx, 'targetPort', e.target.value)} />
                    <select value={row.protocol} onChange={e => updatePortRow(idx, 'protocol', e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
                      <option value="TCP">TCP</option>
                      <option value="UDP">UDP</option>
                    </select>
                    {portRows.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removePortRow(idx)}>删除</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPortRow}>添加端口</Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Selector</label>
                {selectorRows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input placeholder="app" value={row.key} onChange={e => updateSelectorRow(idx, 'key', e.target.value)} />
                    <span className="text-muted-foreground">=</span>
                    <Input placeholder="nginx" value={row.value} onChange={e => updateSelectorRow(idx, 'value', e.target.value)} />
                    {selectorRows.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeSelectorRow(idx)}>删除</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addSelectorRow}>添加选择器</Button>
              </div>
              <div>
                <label className="text-sm font-medium">Session Affinity</label>
                <select value={formSessionAffinity} onChange={e => setFormSessionAffinity(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="None">None</option>
                  <option value="ClientIP">ClientIP</option>
                </select>
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
          <p>确定删除服务 <span className="font-semibold">{deleteTarget?.serviceName}</span>？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
