import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Plus, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface RoleRule { verbs: string; apiGroups: string; resources: string }
interface RoleItem { rolesName: string; nameSpace: string; rules: RoleRule[]; createTime: string }

const defaultYaml = `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-role
  namespace: default
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]`

export default function RolesList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RoleItem[]>([])
  const [filtered, setFiltered] = useState<RoleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [nsFilter, setNsFilter] = useState('all')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const namespaces = useMemo(() => Array.from(new Set(items.map(i => i.nameSpace).filter(Boolean))).sort(), [items])

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formName, setFormName] = useState('')
  const [formNamespace, setFormNamespace] = useState('default')
  const [formApiGroups, setFormApiGroups] = useState('')
  const [formResources, setFormResources] = useState('')
  const [formVerbs, setFormVerbs] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null)
  const [operatingName, setOperatingName] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: RoleItem[] }>('/mrboard/roles/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => {
    let result = items
    if (searchName) result = result.filter(i => i.rolesName.toLowerCase().includes(searchName.toLowerCase()))
    if (nsFilter !== 'all') result = result.filter(i => i.nameSpace === nsFilter)
    setFiltered(result)
  }, [items, searchName, nsFilter])
  useEffect(() => { setPage(1) }, [searchName, nsFilter])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setOperatingName(deleteTarget.rolesName)
    try {
      await api('/mrboard/roles/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&rolesName=' + deleteTarget.rolesName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
    finally { setDeleting(false); setOperatingName(null) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      let yamlStr = yamlContent
      if (createTab === 'form') {
        if (!formName) { toast.error('请输入名称'); setSubmitting(false); return }
        yamlStr = `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ${formName}
  namespace: ${formNamespace || 'default'}
rules:
- apiGroups: ["${formApiGroups || ''}"]
  resources: ["${formResources || '*'}"]
  verbs: [${(formVerbs || 'get,list').split(',').map(v => '"' + v.trim() + '"').join(', ')}]`
      }
      await api('/mrboard/roles/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlStr, headers: { 'Content-Type': 'text/plain' } })
      toast.success('创建成功')
      setCreateOpen(false)
      setFormName(''); setFormNamespace('default'); setFormApiGroups(''); setFormResources(''); setFormVerbs('')
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<RoleItem>[] = [
    {
      key: 'rolesName', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Shield size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.rolesName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{d.rules?.length || 0} 规则</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/roles/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&roleName=' + d.rolesName) }}>
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
      <PageHeader title="角色" description="Role 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />创建</Button>
      </PageHeader>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center">
        <Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
        <Select value={nsFilter} onValueChange={(v) => setNsFilter(v ?? 'all')}>
          <SelectTrigger className="w-40"><SelectValue placeholder="命名空间" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部命名空间</SelectItem>
            {namespaces.map(ns => <SelectItem key={ns} value={ns}>{ns}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
      </div></CardContent></Card>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>创建 Role</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-role" /></div>
                <div><label className="text-sm font-medium">命名空间</label><Input value={formNamespace} onChange={e => setFormNamespace(e.target.value)} placeholder="default" /></div>
              </div>
              <div><label className="text-sm font-medium">API组</label><Input value={formApiGroups} onChange={e => setFormApiGroups(e.target.value)} placeholder="apps (留空为core)" /></div>
              <div><label className="text-sm font-medium">资源</label><Input value={formResources} onChange={e => setFormResources(e.target.value)} placeholder="pods,deployments (逗号分隔)" /></div>
              <div><label className="text-sm font-medium">动词</label><Input value={formVerbs} onChange={e => setFormVerbs(e.target.value)} placeholder="get,list,watch,create,update,delete" /></div>
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
        description={`确定删除 Role ${deleteTarget?.rolesName}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
