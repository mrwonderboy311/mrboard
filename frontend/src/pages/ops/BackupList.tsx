import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Eye, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

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

  const columns: Column<BackupItem>[] = useMemo(() => [
    { key: 'clusterName', header: '集群', render: (d) => d.clusterName },
    { key: 'resourceType', header: '资源类型', render: (d) => <Badge variant="outline">{d.resourceType}</Badge> },
    { key: 'resourceName', header: '资源名称', render: (d) => <span className="font-medium">{d.resourceName}</span> },
    { key: 'nameSpace', header: '命名空间', render: (d) => d.nameSpace || '-' },
    { key: 'createTime', header: '备份时间', render: (d) => <span className="text-sm text-muted-foreground whitespace-nowrap">{d.createTime}</span> },
    {
      key: 'actions', header: '操作', render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleView(d) }}><Eye size={14} /></Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleRecover(d) }}><RotateCcw size={14} /></Button>
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
    try {
      await api('/mrboard/backup/v1/Backup?clusterId=' + clusterId)
      toast.success('备份成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleView = async (item: BackupItem) => {
    try {
      const res = await api<string>('/mrboard/backup/v1/View?id=' + item.id)
      const w = window.open('', '_blank')
      if (w) { w.document.write('<pre>' + (typeof res === 'string' ? res : JSON.stringify(res, null, 2)).replace(/</g, '&lt;') + '</pre>') }
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleRecover = async (item: BackupItem) => {
    if (!confirm('确定恢复该备份？')) return
    try {
      await api('/mrboard/backup/v1/Recover?id=' + item.id)
      toast.success('恢复成功')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="备份管理">
        <Button onClick={handleBackup}><Plus size={16} className="mr-2" />立即备份</Button>
      </PageHeader>
      <Card><CardContent className="p-0">
        <DataTable columns={columns} data={items} loading={loading} emptyMessage="暂无备份" />
      </CardContent></Card>
    </div>
  )
}
