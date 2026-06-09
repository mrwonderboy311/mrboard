import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FileCode, Trash2, Plus, X, FolderOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface NsItem {
  nameSpace: string
  status: string
  labels: string
  createTime: string
}

const defaultYaml = `apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace`

export default function NamespaceList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NsItem[]>([])
  const [loading, setLoading] = useState(true)
  const clusterId = localStorage.getItem('clusterId') || ''
  const [page, setPage] = useState(1)

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formName, setFormName] = useState('')
  const [formLabels, setFormLabels] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }])
  const [deleteTarget, setDeleteTarget] = useState<NsItem | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')

  const addLabel = () => setFormLabels([...formLabels, { key: '', value: '' }])
  const removeLabel = (idx: number) => setFormLabels(formLabels.filter((_, i) => i !== idx))
  const updateLabel = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...formLabels]
    next[idx] = { ...next[idx], [field]: val }
    setFormLabels(next)
  }

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api<{ code: number; data: NsItem[] } | NsItem[]>('/mrboard/ns/v1/List?clusterId=' + clusterId)
      const list = Array.isArray(res) ? res : (res as { code: number; data: NsItem[] }).data || []
      setItems(list)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [clusterId])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return items.slice(start, start + 20)
  }, [items, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget.nameSpace)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/ns/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace)
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
        await api('/mrboard/ns/v1/Create', { method: 'POST', body: JSON.stringify({ clusterId, nameSpace: formName }), headers: { 'Content-Type': 'application/json' } })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormName('')
      setFormLabels([{ key: '', value: '' }])
      setYamlContent(defaultYaml)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<NsItem>[] = [
    {
      key: 'nameSpace', header: '名称', className: 'font-medium', render: (n) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === n.nameSpace ? <Loader2 size={14} className="text-primary animate-spin" /> : <FolderOpen size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{n.nameSpace}</div>
            {operatingDeploy === n.nameSpace && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={n.status} />
              <span className="text-[10px] text-muted-foreground font-mono truncate">{n.labels || '-'}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status', header: '状态', render: (n) => <StatusBadge status={n.status} />,
    },
    {
      key: 'labels', header: '标签', className: 'font-mono text-xs', render: (n) => n.labels || '-',
    },
    {
      key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (n) => n.createTime,
    },
    {
      key: 'actions', header: '', render: (n) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/namespace/yaml?clusterId=' + clusterId + '&nameSpace=' + n.nameSpace) }}>
            <FileCode size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(n) }}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="命名空间" description="Namespace 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
      </PageHeader>

      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={paged as unknown as Record<string, unknown>[]}
        loading={loading}
        pagination={{ page, limit: 20, total: items.length }}
        onPageChange={setPage}
        emptyMessage="暂无命名空间"
        variant="cards"
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增命名空间</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">名称 *</label><Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="my-namespace" /></div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">标签</label>
                  <Button variant="outline" size="sm" onClick={addLabel}><Plus size={14} className="mr-1" />添加</Button>
                </div>
                {formLabels.map((lbl, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input value={lbl.key} onChange={e => updateLabel(idx, 'key', e.target.value)} placeholder="键 (如 app)" className="flex-1" />
                    <Input value={lbl.value} onChange={e => updateLabel(idx, 'value', e.target.value)} placeholder="值 (如 nginx)" className="flex-1" />
                    {formLabels.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeLabel(idx)}><X size={14} /></Button>
                    )}
                  </div>
                ))}
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
        description={`确定删除 ${deleteTarget?.nameSpace}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
