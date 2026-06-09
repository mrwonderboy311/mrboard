import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { Plus, Eye, RotateCcw, Archive, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface BackupItem {
  id: number
  clusterId: string
  clusterName: string
  resourceType: string
  resourceName: string
  nameSpace: string
  yamlContent: string
  createTime: string
}

export default function BackupList() {
  const [items, setItems] = useState<BackupItem[]>([])
  const [loading, setLoading] = useState(true)
  const [recoverTarget, setRecoverTarget] = useState<BackupItem | null>(null)
  const [backupLoading, setBackupLoading] = useState(false)

  const columns: Column<BackupItem>[] = useMemo(() => [
    {
      key: 'resourceName', header: '资源名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Archive size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.resourceName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.resourceType}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{d.clusterName}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'nameSpace', header: '命名空间', className: 'text-xs', render: (d) => d.nameSpace || '-' },
    { key: 'createTime', header: '备份时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
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
    setBackupLoading(true)
    try {
      await api('/mrboard/backup/v1/Backup?clusterId=' + clusterId)
      toast.success('备份成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) } finally { setBackupLoading(false) }
  }

  const handleView = async (item: BackupItem) => {
    try {
      const res = await api<string>('/mrboard/backup/v1/View?id=' + item.id)
      const w = window.open('', '_blank')
      if (w) { w.document.write('<pre>' + (typeof res === 'string' ? res : JSON.stringify(res, null, 2)).replace(/</g, '&lt;') + '</pre>') }
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleRecover = async () => {
    if (!recoverTarget) return
    try {
      await api('/mrboard/backup/v1/Recover?id=' + recoverTarget.id)
      toast.success('恢复成功')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="备份管理" eyebrow="运维">
        <Button onClick={handleBackup} disabled={backupLoading}>{backupLoading ? <><Loader2 size={14} className="animate-spin mr-1.5" />处理中...</> : <><Plus size={16} className="mr-2" />立即备份</>}</Button>
      </PageHeader>
      <DataTable columns={columns} data={items} loading={loading} emptyMessage="暂无备份" variant="cards" />
      <ConfirmDialog
        open={!!recoverTarget}
        onOpenChange={(v) => { if (!v) setRecoverTarget(null) }}
        title="确认操作"
        description="确定恢复该备份？"
        onConfirm={handleRecover}
      />
    </div>
  )
}
