import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

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
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formName, setFormName] = useState('')
  const [formRoleRef, setFormRoleRef] = useState('')
  const [formSubjects, setFormSubjects] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try { const res = await api<{ code: number; data: CrbItem[] }>('/mrboard/clusterrolebinding/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.crbName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])

  const handleDelete = async (name: string) => {
    if (!confirm('确定删除 ClusterRoleBinding ' + name + '？')) return
    try {
      await api('/mrboard/clusterrolebinding/v1/Del?clusterId=' + clusterId + '&crbName=' + name)
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">集群角色绑定[ClusterRoleBinding]</h1>
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
      </div>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
      <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>名称</TableHead><TableHead>角色引用</TableHead><TableHead>主体</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
        <TableBody>{loading ? <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
        : filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
        : filtered.map(d => (<TableRow key={d.crbName}>
          <TableCell className="font-medium">{d.crbName}</TableCell>
          <TableCell className="max-w-xs break-all whitespace-normal text-xs">{d.roleRef}</TableCell>
          <TableCell className="max-w-xs break-all whitespace-normal text-xs">{d.subjects?.map(s => s.kind + '/' + s.name + (s.nameSpace ? '(' + s.nameSpace + ')' : '')).join('\n') || '-'}</TableCell>
          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => navigate('/k8s/clusterrolebinding/yaml?clusterId=' + clusterId + '&crbName=' + d.crbName)}><FileCode size={14} /></Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(d.crbName)}><Trash2 size={14} className="text-destructive" /></Button>
            </div>
          </TableCell>
        </TableRow>))}</TableBody>
      </Table></CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>新增 ClusterRoleBinding</DialogTitle></DialogHeader>
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
    </div>
  )
}
