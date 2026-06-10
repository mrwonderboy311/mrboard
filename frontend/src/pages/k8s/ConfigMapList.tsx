import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Eye, Plus, Database, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface CmItem {
  configmapName: string
  nameSpace: string
  data: string
  labels: string
  createTime: string
}

interface KeyValue { key: string; value: string }

const defaultYaml = `apiVersion: v1
kind: ConfigMap
metadata:
  name: my-cm
  namespace: default
data:
  key1: value1`

export default function ConfigMapList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CmItem[]>([])
  const [filtered, setFiltered] = useState<CmItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [selectedNs, setSelectedNs] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNameSpace, setFormNameSpace] = useState('')
  const [formCmName, setFormCmName] = useState('')
  const [entries, setEntries] = useState<KeyValue[]>([{ key: '', value: '' }])
  const [deleteTarget, setDeleteTarget] = useState<CmItem | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')

  const namespaces = [...new Set(items.map(i => i.nameSpace).filter(Boolean))].sort()

  const addEntry = () => setEntries(prev => [...prev, { key: '', value: '' }])
  const removeEntry = (idx: number) => setEntries(prev => prev.filter((_, i) => i !== idx))
  const updateEntry = (idx: number, field: 'key' | 'value', val: string) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e))
  }

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api<{ code: number; data: CmItem[] }>('/mrboard/cm/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { if (!silent) setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => {
    let result = items
    if (selectedNs) result = result.filter(i => i.nameSpace === selectedNs)
    if (searchName) result = result.filter(i => i.configmapName.toLowerCase().includes(searchName.toLowerCase()))
    setFiltered(result)
  }, [items, searchName, selectedNs])
  useEffect(() => { setPage(1) }, [searchName, selectedNs])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget.configmapName)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/cm/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&cmName=' + deleteTarget.configmapName)
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
        if (!formCmName) { toast.error('请输入名称'); setSubmitting(false); return }
        const configmaps = entries
          .filter(e => e.key.trim())
          .map(e => ({ key: e.key.trim(), value: e.value }))
        await api('/mrboard/cm/v1/Create', {
          method: 'POST',
          body: JSON.stringify({ clusterId, nameSpace: formNameSpace, configmapName: formCmName, configmaps }),
        })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormNameSpace(''); setFormCmName(''); setEntries([{ key: '', value: '' }])
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<CmItem>[] = [
    {
      key: 'configmapName',
      header: '名称',
      className: 'font-semibold',
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === d.configmapName ? <Loader2 size={14} className="text-primary animate-spin" /> : <Database size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.configmapName}</div>
            {operatingDeploy === d.configmapName && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
              <span className="text-[10px] text-muted-foreground font-mono truncate">{d.data || '-'}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/configmap/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&cmName=' + d.configmapName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/configmap/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&cmName=' + d.configmapName) }}>
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
      <PageHeader title="配置项" description="ConfigMap 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />创建</Button>
      </PageHeader>
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Select value={selectedNs || '__all__'} onValueChange={v => setSelectedNs(v === '__all__' ? '' : (v ?? ''))}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="全部命名空间" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全部命名空间</SelectItem>
              {namespaces.map(ns => <SelectItem key={ns} value={ns}>{ns}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
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
          <DialogHeader><DialogTitle>创建 ConfigMap</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">命名空间</label><Input value={formNameSpace} onChange={e => setFormNameSpace(e.target.value)} placeholder="default" /></div>
              <div><label className="text-sm font-medium">名称 *</label><Input value={formCmName} onChange={e => setFormCmName(e.target.value)} placeholder="my-cm" /></div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">键值对</label>
                  <span className="text-xs text-muted-foreground">支持多行值，适用于证书、配置文件等</span>
                </div>
                {entries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <Input placeholder="key" value={entry.key} onChange={e => updateEntry(idx, 'key', e.target.value)} className="w-1/3 shrink-0" />
                    <textarea placeholder="value" value={entry.value} onChange={e => updateEntry(idx, 'value', e.target.value)} className="flex-1 min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y" />
                    {entries.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeEntry(idx)} className="mt-1">删除</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addEntry}>添加一行</Button>
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
        description={`确定删除 ${deleteTarget?.configmapName}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
