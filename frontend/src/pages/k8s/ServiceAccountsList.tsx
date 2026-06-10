import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, User, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

interface SaItem { saName: string; nameSpace: string; imagePullSecrets: string; createTime: string }

const defaultYaml = `apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-sa
  namespace: default`

export default function ServiceAccountsList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<SaItem[]>([])
  const [filtered, setFiltered] = useState<SaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''
  const [createOpen, setCreateOpen] = useState(false)
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try { const res = await api<{ code: number; data: SaItem[] }>('/mrboard/serviceaccounts/v1/List?clusterId=' + clusterId); setItems(res.data || []) }
    catch (err) { toast.error((err as Error).message) } finally { if (!silent) setLoading(false) }
  }
  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.saName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      await api('/mrboard/serviceaccounts/v1/CreateByYaml?clusterId=' + clusterId, {
        method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' },
      })
      toast.success('创建成功')
      setCreateOpen(false)
      setYamlContent(defaultYaml)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<SaItem>[] = [
    {
      key: 'name', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <User size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.saName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'imagePullSecrets', header: 'Image Pull Secrets', render: (d) => <span className="text-xs text-muted-foreground">{d.imagePullSecrets || '-'}</span> },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/serviceaccounts/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&saName=' + d.saName) }}>
            <FileCode size={15} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="服务帐号" description="ServiceAccount 管理" eyebrow="K8s">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />创建</Button>
      </PageHeader>
      <Card><CardContent className="py-3"><div className="flex gap-3 items-center"><Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" /><Button variant="outline" size="sm" onClick={() => fetchData()}><Search size={14} className="mr-1" />刷新</Button></div></CardContent></Card>
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
          <DialogHeader><DialogTitle>创建服务帐号</DialogTitle></DialogHeader>
          <textarea
            value={yamlContent}
            onChange={e => setYamlContent(e.target.value)}
            className="w-full h-64 rounded-md border border-input bg-slate-950 text-green-400 font-mono text-sm p-4 resize-y"
            spellCheck={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setYamlContent(defaultYaml) }}>取消</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <><Loader2 size={14} className="animate-spin mr-1.5" />创建中...</> : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
