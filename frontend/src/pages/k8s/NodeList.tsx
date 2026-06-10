import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Search, FileCode, Trash2, Eye, Server, Loader2, Cpu, MemoryStick } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface NodeItem {
  nodeName: string
  nodeState: string
  nodeRole: string
  nodeIp: string
  nodeInfo: string
  cpuUsage: string
  memUsage: string
  podNum: string
  capacity: string
  allocatable: string
  unschedulable: string
  podCIDR: string
  createTime: string
}

export default function NodeK8sList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NodeItem[]>([])
  const [filtered, setFiltered] = useState<NodeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''
  const pageSize = 20
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api<{ code: number; data: NodeItem[] }>('/mrboard/node/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [clusterId])

  useEffect(() => {
    setFiltered(searchName ? items.filter(i => i.nodeName.toLowerCase().includes(searchName.toLowerCase())) : items)
    setPage(1)
  }, [items, searchName])

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/node/v1/Del?clusterId=' + clusterId + '&nodeName=' + deleteTarget)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) }
    finally { setOperationProgress('完成 ✓'); setTimeout(() => { setOperatingDeploy(null); setOperationProgress(''); fetchData(true) }, 600) }
  }

  const columns: Column<NodeItem>[] = [
    {
      key: 'name',
      header: '名称',
      className: 'font-semibold',
      render: n => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === n.nodeName ? <Loader2 size={14} className="text-primary animate-spin" /> : <Server size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{n.nodeName}</div>
            {operatingDeploy === n.nodeName && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <StatusBadge status={n.nodeState} />
              <Badge variant="secondary" className="text-[10px]">{n.nodeRole}</Badge>
              <span className="text-[10px] text-muted-foreground font-mono">{n.nodeIp}</span>
            </div>
            {n.nodeInfo && (
              <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-md">{n.nodeInfo}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'cpu', header: 'CPU', className: 'w-24', render: n => (
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-blue-500 shrink-0" />
          <span className="font-mono text-sm tabular-nums">{n.cpuUsage || '-'}</span>
        </div>
      ),
    },
    {
      key: 'mem', header: '内存', className: 'w-24', render: n => (
        <div className="flex items-center gap-1.5">
          <MemoryStick size={12} className="text-purple-500 shrink-0" />
          <span className="font-mono text-sm tabular-nums">{n.memUsage || '-'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: n => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/node/detail?clusterId=' + clusterId + '&nodeName=' + n.nodeName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/node/yaml?clusterId=' + clusterId + '&nodeName=' + n.nodeName) }}>
            <FileCode size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(n.nodeName) }}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="节点" description="Node 管理" />
      <Card>
        <CardContent className="py-3">
          <div className="flex gap-3 items-center">
            <Input placeholder="搜索节点名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
            <Button variant="outline" size="sm" onClick={() => fetchData()}><Search size={14} className="mr-1" />刷新</Button>
          </div>
        </CardContent>
      </Card>
      <DataTable
        columns={columns}
        data={paged}
        loading={loading}
        pagination={{ page, limit: pageSize, total: filtered.length }}
        onPageChange={setPage}
        variant="cards"
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description={`确定删除节点 ${deleteTarget}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
