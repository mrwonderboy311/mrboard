import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

interface RbSubject { kind: string; nameSpace: string; name: string }
interface RbItem { rbName: string; nameSpace: string; roleRef: string; subjects: RbSubject[]; createTime: string }

const defaultYaml = `apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-rolebinding
  namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: my-role
subjects:
- kind: ServiceAccount
  name: my-sa
  namespace: default`

export default function RoleBindingList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<RbItem[]>([])
  const [filtered, setFiltered] = useState<RbItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formName, setFormName] = useState('')
  const [formNamespace, setFormNamespace] = useState('default')
  const [formRoleRef, setFormRoleRef] = useState('')
  const [formSubjects, setFormSubjects] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: RbItem[] }>('/mrboard/rolebinding/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.rbName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async (ns: string, name: string) => {
    if (!confirm('确定删除 RoleBinding ' + name + '？')) return
    try {
      await api('/mrboard/rolebinding/v1/Del?clusterId=' + clusterId + '&nameSpace=' + ns + '&rbName=' + name)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
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
kind: RoleBinding
metadata:
  name: ${formName}
  namespace: ${formNamespace || 'default'}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ${formRoleRef || 'my-role'}
subjects:
${subjectsArr.map(s => `- kind: ${s.kind}\n  name: ${s.name}${s.namespace ? '\n  namespace: ' + s.namespace : ''}`).join('\n')}`
      }
      await api('/mrboard/rolebinding/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlStr, headers: { 'Content-Type': 'text/plain' } })
      toast.success('创建成功')
      setCreateOpen(false)
      setFormName(''); setFormNamespace('default'); setFormRoleRef(''); setFormSubjects('')
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<RbItem>[] = [
    { key: 'rbName', header: '名称', className: 'font-medium', render: (d) => d.rbName },
    { key: 'nameSpace', header: '命名空间', render: (d) => d.nameSpace },
    { key: 'roleRef', header: '角色引用', className: 'max-w-xs break-all whitespace-normal text-xs', render: (d) => d.roleRef },
    { key: 'subjects', header: '主体', className: 'max-w-xs break-all whitespace-normal text-xs', render: (d) => d.subjects?.map(s => s.kind + '/' + s.name + (s.nameSpace ? '(' + s.nameSpace + ')' : '')).join('\n') || '-' },
    { key: 'createTime', header: '创建时间', className: 'text-sm text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '操作', render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => navigate('/k8s/rolebinding/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&rbName=' + d.rbName)}><FileCode size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(d.nameSpace, d.rbName)}><Trash2 size={14} className="text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="角色绑定" description="RoleBinding 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
      </PageHeader>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
      <Card><CardContent className="p-0">
        <DataTable
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          data={paged as unknown as Record<string, unknown>[]}
          loading={loading}
          pagination={{ page, limit: 20, total: filtered.length }}
          onPageChange={setPage}
          emptyMessage="暂无数据"
        />
      </CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>新增 RoleBinding</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-rolebinding" /></div>
                <div><label className="text-sm font-medium">命名空间</label><Input value={formNamespace} onChange={e => setFormNamespace(e.target.value)} placeholder="default" /></div>
              </div>
              <div><label className="text-sm font-medium">角色引用(Role) *</label><Input value={formRoleRef} onChange={e => setFormRoleRef(e.target.value)} placeholder="my-role" /></div>
              <div><label className="text-sm font-medium">主体 (每行一个: Kind/Name/Namespace)</label><textarea value={formSubjects} onChange={e => setFormSubjects(e.target.value)} className="w-full h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono" placeholder={"ServiceAccount/my-sa/default\nUser/admin"} /></div>
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
