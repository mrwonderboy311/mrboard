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
import { Search, FileCode, Trash2, Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

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

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: GtwItem[] }>('/mrboard/gateway/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.name.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  const handleDelete = async (item: GtwItem) => {
    if (!confirm('确定删除 ' + item.name + '？')) return
    try {
      await api('/mrboard/gateway/v1/Delete?clusterId=' + clusterId + '&nameSpace=' + item.nameSpace + '&gtwName=' + item.name)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
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
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">网关[Gateway]</h1>
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
            <TableHead>名称</TableHead><TableHead>命名空间</TableHead><TableHead>Class</TableHead><TableHead>地址</TableHead><TableHead>监听器</TableHead><TableHead>状态</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8">加载中...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            : filtered.map(d => (
              <TableRow key={d.nameSpace + '/' + d.name}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.nameSpace}</TableCell>
                <TableCell>{d.className}</TableCell>
                <TableCell className="font-mono text-sm">{d.addresses || '-'}</TableCell>
                <TableCell>{d.listeners}</TableCell>
                <TableCell><Badge variant={d.status === 'Ready' ? 'default' : 'secondary'}>{d.status}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/gateway/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&gtwName=' + d.name)}><Eye size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/gateway/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&gtwName=' + d.name)}><FileCode size={14} /></Button>
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
                  <select value={formProtocol} onChange={e => setFormProtocol(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="HTTP">HTTP</option>
                    <option value="HTTPS">HTTPS</option>
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium">端口</label><Input type="number" value={formPort} onChange={e => setFormPort(e.target.value)} placeholder="80" /></div>
                <div>
                  <label className="text-sm font-medium">允许命名空间</label>
                  <select value={formAllowedNamespaces} onChange={e => setFormAllowedNamespaces(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                    <option value="Same">Same</option>
                    <option value="All">All</option>
                  </select>
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
