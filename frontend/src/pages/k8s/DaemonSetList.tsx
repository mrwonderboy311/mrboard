import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, FileCode, Trash2, Eye, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface DsItem {
  daemonsetName: string
  nameSpace: string
  podNumber: number
  imgUrl: string
  labels: string
  createTime: string
  status: string
  strategy: string
  selector: string
}

export default function DaemonSetList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<DsItem[]>([])
  const [filtered, setFiltered] = useState<DsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [nsFilter, setNsFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<DsItem | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api<{ code: number; data: DsItem[] }>('/mrboard/ds/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { if (!silent) setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  const namespaces = useMemo(() => [...new Set(items.map(i => i.nameSpace).filter(Boolean))].sort(), [items])
  useEffect(() => { setFiltered(items.filter(i => (!nsFilter || i.nameSpace === nsFilter) && (!searchName || i.daemonsetName.toLowerCase().includes(searchName.toLowerCase())))) }, [items, searchName, nsFilter])
  useEffect(() => { setPage(1) }, [searchName, nsFilter])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget.daemonsetName)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/ds/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&dsName=' + deleteTarget.daemonsetName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) }
    finally { setOperationProgress('完成 ✓'); setTimeout(() => { setOperatingDeploy(null); setOperationProgress(''); fetchData(true) }, 600) }
  }

  const columns: Column<DsItem>[] = [
    {
      key: 'daemonsetName', header: '名称', className: 'font-medium', render: (d) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === d.daemonsetName ? <Loader2 size={14} className="text-primary animate-spin" /> : <Shield size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{d.daemonsetName}</div>
            {operatingDeploy === d.daemonsetName && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{d.nameSpace}</Badge>
              <span className="text-[10px] text-muted-foreground font-mono truncate" title={d.imgUrl}>{d.imgUrl}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'podNumber', header: 'Pod数', className: 'w-24', render: (d) => (
        <Badge variant={d.status === 'Ready' ? 'default' : 'secondary'} className="tabular-nums text-xs">
          {d.podNumber}
        </Badge>
      ),
    },
    { key: 'status', header: '状态', render: (d) => <StatusBadge status={d.status} /> },
    { key: 'createTime', header: '创建时间', className: 'text-xs text-muted-foreground whitespace-nowrap', render: (d) => d.createTime },
    {
      key: 'actions', header: '', render: (d) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/daemonset/detail?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&dsName=' + d.daemonsetName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/daemonset/yaml?clusterId=' + clusterId + '&nameSpace=' + d.nameSpace + '&dsName=' + d.daemonsetName) }}>
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
      <PageHeader title="守护进程集" description="DaemonSet 管理" />
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">命名空间</label>
            <Select value={nsFilter || '__all__'} onValueChange={v => setNsFilter(v === '__all__' ? '' : (v ?? ''))}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="全部命名空间" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部命名空间</SelectItem>
                {namespaces.map(ns => <SelectItem key={ns} value={ns}>{ns}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description={`确定删除 ${deleteTarget?.daemonsetName}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
