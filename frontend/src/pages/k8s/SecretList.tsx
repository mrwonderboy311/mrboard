import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

interface SecretItem {
  secretName: string
  nameSpace: string
  secretType: string
  data: string
  createTime: string
}

interface KeyValue { key: string; value: string }

const defaultYaml = `apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
data:
  username: YWRtaW4=
  password: cGFzc3dvcmQ=`

export default function SecretList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<SecretItem[]>([])
  const [filtered, setFiltered] = useState<SecretItem[]>([])
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
  const [formSecretName, setFormSecretName] = useState('')
  const [formSecretType, setFormSecretType] = useState('Opaque')
  const [entries, setEntries] = useState<KeyValue[]>([{ key: '', value: '' }])
  const [deleteTarget, setDeleteTarget] = useState<SecretItem | null>(null)

  const namespaces = [...new Set(items.map(i => i.nameSpace).filter(Boolean))].sort()

  const addEntry = () => setEntries(prev => [...prev, { key: '', value: '' }])
  const removeEntry = (idx: number) => setEntries(prev => prev.filter((_, i) => i !== idx))
  const updateEntry = (idx: number, field: 'key' | 'value', val: string) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e))
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: SecretItem[] }>('/mrboard/secret/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => {
    let result = items
    if (selectedNs) result = result.filter(i => i.nameSpace === selectedNs)
    if (searchName) result = result.filter(i => i.secretName.toLowerCase().includes(searchName.toLowerCase()))
    setFiltered(result)
  }, [items, searchName, selectedNs])
  useEffect(() => { setPage(1) }, [searchName, selectedNs])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/mrboard/secret/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&secretName=' + deleteTarget.secretName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (createTab === 'form') {
        if (!formSecretName) { toast.error('请输入名称'); setSubmitting(false); return }
        const data: Record<string, string> = {}
        for (const entry of entries) {
          if (entry.key.trim()) data[entry.key.trim()] = entry.value
        }
        await api('/mrboard/secret/v1/Create', {
          method: 'POST',
          body: JSON.stringify({ clusterId, nameSpace: formNameSpace, secretName: formSecretName, type: formSecretType, data }),
        })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormNameSpace(''); setFormSecretName(''); setFormSecretType('Opaque'); setEntries([{ key: '', value: '' }])
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  const columns: Column<SecretItem>[] = [
    { key: 'secretName', header: '名称', className: 'font-medium', render: (d) => d.secretName },
    { key: 'nameSpace', header: '命名空间', render: (d) => d.nameSpace },
    { key: 'secretType', header: '类型', render: (d) => d.secretType },
    { key: 'data', header: '数据键', className: 'font-mono text-xs', render: (d) => d.data || '-' },
    { key: 'createTime', header: '创建时间', className: 'text-sm text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '操作', render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/k8s/secret/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&secretName=' + d.secretName) }}><Eye size={14} /></Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/k8s/secret/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&secretName=' + d.secretName) }}><FileCode size={14} /></Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(d) }}><Trash2 size={14} className="text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="加密字典" description="Secret 管理">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
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
          emptyMessage="暂无数据"
        />
      </CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增 Secret</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Button variant={createTab === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('form')}>表单创建</Button>
            <Button variant={createTab === 'yaml' ? 'default' : 'outline'} size="sm" onClick={() => setCreateTab('yaml')}>YAML创建</Button>
          </div>
          {createTab === 'form' ? (
            <div className="space-y-3">
              <div><label className="text-sm font-medium">命名空间</label><Input value={formNameSpace} onChange={e => setFormNameSpace(e.target.value)} placeholder="default" /></div>
              <div><label className="text-sm font-medium">名称 *</label><Input value={formSecretName} onChange={e => setFormSecretName(e.target.value)} placeholder="my-secret" /></div>
              <div>
                <label className="text-sm font-medium">类型</label>
                <Select value={formSecretType} onValueChange={v => setFormSecretType(v ?? 'Opaque')}>
                  <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Opaque">Opaque</SelectItem>
                    <SelectItem value="kubernetes.io/tls">kubernetes.io/tls</SelectItem>
                    <SelectItem value="kubernetes.io/dockerconfigjson">kubernetes.io/dockerconfigjson</SelectItem>
                    <SelectItem value="kubernetes.io/basic-auth">kubernetes.io/basic-auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">键值对</label>
                  <span className="text-xs text-muted-foreground">值需要是 base64 编码的字符串，或普通文本（系统会自动编码）</span>
                </div>
                {entries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <Input placeholder="key" value={entry.key} onChange={e => updateEntry(idx, 'key', e.target.value)} className="w-1/3 shrink-0" />
                    <textarea placeholder="value (base64 或普通文本)" value={entry.value} onChange={e => updateEntry(idx, 'value', e.target.value)} className="flex-1 min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y font-mono" />
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

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">确定删除 Secret <span className="font-medium text-foreground">{deleteTarget?.secretName}</span>？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
