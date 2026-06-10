import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Eye, RotateCcw, Archive, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface BackupItem {
  id: number
  clusterId: string
  resType: string
  resName: string
  nameSpace: string
  content: string
  remarks: string
  createtime: string
}

const resTypeOptions = [
  { value: 'deploy', label: 'Deployment' },
  { value: 'cm', label: 'ConfigMap' },
  { value: 'secret', label: 'Secret' },
  { value: 'svc', label: 'Service' },
  { value: 'ing', label: 'Ingress' },
  { value: 'sts', label: 'StatefulSet' },
  { value: 'cronjob', label: 'CronJob' },
  { value: 'hpa', label: 'HPA' },
  { value: 'node', label: 'Node' },
]

export default function BackupList() {
  const [items, setItems] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [recoverTarget, setRecoverTarget] = useState<BackupItem | null>(null)
  const [viewTarget, setViewTarget] = useState<BackupItem | null>(null)
  const [viewContent, setViewContent] = useState('')
  const [viewLoading, setViewLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [backupResType, setBackupResType] = useState('')
  const [backupNameSpace, setBackupNameSpace] = useState('')
  const [backupResName, setBackupResName] = useState('')
  const [backupRemarks, setBackupRemarks] = useState('')
  const [backupLoading, setBackupLoading] = useState(false)

  const [searchName, setSearchName] = useState('')

  const filtered = useMemo(() => {
    if (!searchName) return items
    return items.filter(i => i.resName.toLowerCase().includes(searchName.toLowerCase()))
  }, [items, searchName])

  const columns: Column<BackupItem>[] = useMemo(() => [
    {
      key: 'resName', header: '资源名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Archive size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.resName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.resType}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{d.clusterId}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'nameSpace', header: '命名空间', className: 'text-xs', render: (d) => d.nameSpace || '-' },
    { key: 'remarks', header: '备注', className: 'text-xs text-muted-foreground truncate max-w-[200px]', render: (d) => d.remarks || '-' },
    { key: 'createtime', header: '备份时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createtime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="查看"
            onClick={(e) => { e.stopPropagation(); handleView(d) }}>
            <Eye size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="恢复"
            onClick={(e) => { e.stopPropagation(); setRecoverTarget(d) }}>
            <RotateCcw size={15} />
          </Button>
        </div>
      ),
    },
  ], [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: BackupItem[] }>('/mrboard/backup/v1/List')
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleBackup = async () => {
    const clusterId = localStorage.getItem('clusterId') || ''
    if (!clusterId) { toast.error('请先选择集群'); return }
    if (!backupResType) { toast.error('请选择资源类型'); return }
    if (!backupResName) { toast.error('请输入资源名称'); return }
    setBackupLoading(true)
    try {
      await api('/mrboard/backup/v1/Backup?clusterId=' + clusterId + '&resType=' + backupResType + '&resName=' + encodeURIComponent(backupResName) + '&nameSpace=' + encodeURIComponent(backupNameSpace) + '&remarks=' + encodeURIComponent(backupRemarks))
      toast.success('备份成功')
      setCreateOpen(false)
      setBackupResType(''); setBackupNameSpace(''); setBackupResName(''); setBackupRemarks('')
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setBackupLoading(false) }
  }

  const handleView = async (item: BackupItem) => {
    setViewTarget(item)
    setViewLoading(true)
    setViewContent('')
    try {
      const res = await api<{ code: number; data: BackupItem }>('/mrboard/backup/v1/View?id=' + item.id)
      setViewContent(res.data?.content || '无内容')
    } catch (err) {
      toast.error((err as Error).message)
      setViewContent('加载失败')
    } finally { setViewLoading(false) }
  }

  const handleRecover = async () => {
    if (!recoverTarget) return
    try {
      await api('/mrboard/backup/v1/Recover?id=' + recoverTarget.id + '&clusterId=' + encodeURIComponent(recoverTarget.clusterId) + '&resType=' + encodeURIComponent(recoverTarget.resType))
      toast.success('恢复成功')
      setRecoverTarget(null)
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="备份管理" eyebrow="运维">
        <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-2" />立即备份</Button>
      </PageHeader>
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索资源名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
          <Button variant="outline" size="sm" onClick={() => fetchData()}><Search size={14} className="mr-1" />刷新</Button>
        </div>
      </CardContent></Card>
      <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="暂无备份" variant="cards" />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>创建备份</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">资源类型 *</label>
              <Select value={backupResType} onValueChange={v => setBackupResType(v ?? '')}>
                <SelectTrigger className="w-full h-9"><SelectValue placeholder="选择资源类型" /></SelectTrigger>
                <SelectContent>
                  {resTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">命名空间</label>
              <Input value={backupNameSpace} onChange={e => setBackupNameSpace(e.target.value)} placeholder="default (节点类型可留空)" />
            </div>
            <div>
              <label className="text-sm font-medium">资源名称 *</label>
              <Input value={backupResName} onChange={e => setBackupResName(e.target.value)} placeholder="资源名称" />
            </div>
            <div>
              <label className="text-sm font-medium">备注</label>
              <Input value={backupRemarks} onChange={e => setBackupRemarks(e.target.value)} placeholder="可选备注" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleBackup} disabled={backupLoading}>{backupLoading ? <><Loader2 size={14} className="animate-spin mr-1.5" />处理中...</> : '备份'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewTarget} onOpenChange={(v) => { if (!v) setViewTarget(null) }}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>备份内容 - {viewTarget?.resName}</DialogTitle></DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 size={16} className="animate-spin mr-2" />加载中...</div>
          ) : (
            <pre className="text-xs font-mono bg-zinc-950 text-emerald-400 p-4 rounded-lg border border-zinc-800 overflow-auto max-h-[60vh] whitespace-pre-wrap break-all">{viewContent}</pre>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!recoverTarget}
        onOpenChange={(v) => { if (!v) setRecoverTarget(null) }}
        title="确认恢复"
        description={`确定恢复 ${recoverTarget?.resType}/${recoverTarget?.resName} 的备份？这将覆盖当前资源。`}
        variant="destructive"
        onConfirm={handleRecover}
      />
    </div>
  )
}
