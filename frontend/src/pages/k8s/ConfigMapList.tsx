import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, FileCode, Trash2, Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

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
  const clusterId = localStorage.getItem('clusterId') || ''

  const [createOpen, setCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<'form' | 'yaml'>('form')
  const [yamlContent, setYamlContent] = useState(defaultYaml)
  const [submitting, setSubmitting] = useState(false)
  const [formNameSpace, setFormNameSpace] = useState('')
  const [formCmName, setFormCmName] = useState('')
  const [entries, setEntries] = useState<KeyValue[]>([{ key: '', value: '' }])
  const [deleteTarget, setDeleteTarget] = useState<CmItem | null>(null)

  const namespaces = [...new Set(items.map(i => i.nameSpace).filter(Boolean))].sort()

  const addEntry = () => setEntries(prev => [...prev, { key: '', value: '' }])
  const removeEntry = (idx: number) => setEntries(prev => prev.filter((_, i) => i !== idx))
  const updateEntry = (idx: number, field: 'key' | 'value', val: string) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e))
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: CmItem[] }>('/mrboard/cm/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => {
    let result = items
    if (selectedNs) result = result.filter(i => i.nameSpace === selectedNs)
    if (searchName) result = result.filter(i => i.configmapName.toLowerCase().includes(searchName.toLowerCase()))
    setFiltered(result)
  }, [items, searchName, selectedNs])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/mrboard/cm/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&cmName=' + deleteTarget.configmapName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleCreate = async () => {
    setSubmitting(true)
    try {
      if (createTab === 'form') {
        if (!formCmName) { toast.error('请输入名称'); setSubmitting(false); return }
        const data: Record<string, string> = {}
        for (const entry of entries) {
          if (entry.key.trim()) data[entry.key.trim()] = entry.value
        }
        await api('/mrboard/cm/v1/Create', {
          method: 'POST',
          body: JSON.stringify({ clusterId, nameSpace: formNameSpace, cmName: formCmName, data }),
        })
      } else {
        await api('/mrboard/apply/v1/CreateByYaml?clusterId=' + clusterId, { method: 'POST', body: yamlContent, headers: { 'Content-Type': 'text/plain' } })
      }
      toast.success('创建成功')
      setCreateOpen(false)
      setFormNameSpace(''); setFormCmName(''); setEntries([{ key: '', value: '' }])
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">配置项[ConfigMap]</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />新增</Button>
        </div>
      </div>
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
        <Table>
          <TableHeader><TableRow>
            <TableHead>名称</TableHead><TableHead>命名空间</TableHead><TableHead>数据键</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
            : filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
            : filtered.map(d => (
              <TableRow key={d.nameSpace + '/' + d.configmapName}>
                <TableCell className="font-medium">{d.configmapName}</TableCell>
                <TableCell>{d.nameSpace}</TableCell>
                <TableCell className="font-mono text-xs">{d.data || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/configmap/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&cmName=' + d.configmapName)}><Eye size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/k8s/configmap/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&cmName=' + d.configmapName)}><FileCode size={14} /></Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteTarget(d)}><Trash2 size={14} className="text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>新增 ConfigMap</DialogTitle></DialogHeader>
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

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">确定删除 ConfigMap <span className="font-medium text-foreground">{deleteTarget?.configmapName}</span>？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
