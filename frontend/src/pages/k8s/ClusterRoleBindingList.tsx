import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Plus, Link as LinkIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface CrbSubject { kind: string; nameSpace: string; name: string }
interface CrbItem { crbName: string; roleRef: string; subjects: CrbSubject[]; createTime: string }

const defaultYaml = `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: my-clusterrolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: my-sa
  namespace: default`

export default function ClusterRoleBindingList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CrbItem[]>([])
  const [filtered, setFiltered] = useState<CrbItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formName, setFormName] = useState('')
  const [formRoleRef, setFormRoleRef] = useState('')
  const [formSubjects, setFormSubjects] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [operatingName, setOperatingName] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: CrbItem[] }>('/mrboard/clusterrolebinding/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.crbName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setOperatingName(deleteTarget)
    try {
      await api('/mrboard/clusterrolebinding/v1/Del?clusterId=' + clusterId + '&crbName=' + deleteTarget)
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
        const subjectsArr = formSubjects.split('\n').filter(s => s.trim()).map(s => {
          const parts = s.split('/')
          return { kind: parts[0] || 'User', name: parts[1] || '', namespace: parts[2] || '' }
        })
        yamlStr = `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ${formName}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ${formRoleRef || 'cluster-admin'}
subjects:
${subjectsArr.map(s => `- kind: ${s.kind}\n  name: ${s.name}${s.namespace ? '\n  namespace: ' + s.namespace : ''}`).join('\n')}`
      }
      await api('/mrboard/clusterrolebinding/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlStr, headers: { 'Content-Type': 'text/plain' } })
      toast.success('创建成功')
      setCreateOpen(false)
      setFormName(''); setFormRoleRef(''); setFormSubjects('')
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<CrbItem>[] = [
    {
      key: 'crbName', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <LinkIcon size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.crbName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">{d.roleRef}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'subjects', header: '主体', className: 'max-w-xs break-all whitespace-normal text-xs', render: (d) => d.subjects?.map(s => s.kind + '/' + s.name + (s.nameSpace ? '(' + s.nameSpace + ')' : '')).join('\n') || '-' },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/clusterrolebinding/yaml?clusterId=' + clusterId + '&crbName=' + d.crbName) }}>
            <FileCode size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(d.crbName) }}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="集群角色绑定" description="ClusterRoleBinding 管理">
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>创建 ClusterRoleBinding</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-clusterrolebinding" /></div>
              <div><label className="text-sm font-medium">角色引用(ClusterRole) *</label><Input value={formRoleRef} onChange={e => setFormRoleRef(e.target.value)} placeholder="cluster-admin" /></div>
              <div><label className="text-sm font-medium">主体 (每行一个: Kind/Name/Namespace)</label><textarea value={formSubjects} onChange={e => setFormSubjects(e.target.value)} className="w-full h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono" placeholder={"ServiceAccount/my-sa/default\nUser/admin"} /></div>
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
        description={`确定删除 ClusterRoleBinding ${deleteTarget}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
