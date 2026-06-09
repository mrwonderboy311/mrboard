import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, FileCode, Trash2, Terminal, Eye, ScrollText, Container, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Pod, Namespace, ApiResponse } from '@/types'

export default function PodK8sList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Pod[]>([])
  const [filtered, setFiltered] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [namespace, setNamespace] = useState('')
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Pod | null>(null)
  const [operatingDeploy, setOperatingDeploy] = useState<string | null>(null)
  const [operationProgress, setOperationProgress] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchNamespaces = async () => {
    try {
      const data = await api<Namespace[] | ApiResponse<Namespace[]>>('/mrboard/ns/v1/List?clusterId=' + clusterId)
      const list = Array.isArray(data) ? data : (data as ApiResponse<Namespace[]>).data || []
      setNamespaces(list.map(n => typeof n === 'string' ? n : n.name))
    } catch { /* optional */ }
  }

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const nsParam = namespace ? '&nameSpace=' + namespace : ''
      const res = await api<{ code: number; data: Pod[] }>('/mrboard/pod/v1/List?clusterId=' + clusterId + nsParam)
      setItems(res.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { fetchNamespaces() }, [])
  useEffect(() => { fetchData() }, [namespace])

  useEffect(() => {
    setFiltered(searchName ? items.filter(i => i.podName.toLowerCase().includes(searchName.toLowerCase())) : items)
  }, [items, searchName])

  useEffect(() => { setPage(1) }, [searchName, namespace])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setOperatingDeploy(deleteTarget.podName)
    setOperationProgress('删除中...')
    try {
      await api('/mrboard/pod/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&podName=' + deleteTarget.podName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData(true)
    } catch (err) { toast.error((err as Error).message) }
    finally { setOperationProgress('完成 ✓'); setTimeout(() => { setOperatingDeploy(null); setOperationProgress(''); fetchData(true) }, 600) }
  }

  const handleTerminal = (pod: Pod) => {
    window.open('/k8s/pod/terminal?clusterId=' + clusterId + '&nameSpace=' + pod.nameSpace + '&podName=' + pod.podName, '_blank')
  }

  const columns: Column<Pod>[] = [
    {
      key: 'podName',
      header: '名称',
      className: 'font-semibold',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {operatingDeploy === p.podName ? <Loader2 size={14} className="text-primary animate-spin" /> : <Container size={14} className="text-primary" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{p.podName}</div>
            {operatingDeploy === p.podName && <span className="text-[11px] text-primary font-medium animate-pulse">{operationProgress}</span>}
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{p.nameSpace}</Badge>
              <StatusBadge status={p.podPhase} />
              <span className="text-[10px] text-muted-foreground font-mono">{p.podIp || '-'}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'restartCount',
      header: '重启',
      render: (p) => p.restartCount,
    },
    {
      key: 'nodeName',
      header: '节点',
      render: (p) => p.nodeName,
    },
    {
      key: 'cpuUsage',
      header: 'CPU',
      render: (p) => p.cpuUsage ? p.cpuUsage.toFixed(2) : '-',
    },
    {
      key: 'memUsage',
      header: '内存',
      render: (p) => p.memUsage ? p.memUsage.toFixed(0) + 'Mi' : '-',
    },
    {
      key: 'createTime',
      header: '创建时间',
      className: 'text-xs text-muted-foreground whitespace-nowrap',
      render: (p) => p.createTime,
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={(e) => { e.stopPropagation(); navigate('/pod/detail?clusterId=' + clusterId + '&nameSpace=' + p.nameSpace + '&podName=' + p.podName) }}>
            <Eye size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="日志"
            onClick={(e) => { e.stopPropagation(); navigate('/pod/log?clusterId=' + clusterId + '&nameSpace=' + p.nameSpace + '&podName=' + p.podName) }}>
            <ScrollText size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="终端"
            onClick={(e) => { e.stopPropagation(); handleTerminal(p) }}>
            <Terminal size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="YAML"
            onClick={(e) => { e.stopPropagation(); navigate('/k8s/pod/yaml?clusterId=' + clusterId + '&nameSpace=' + p.nameSpace + '&podName=' + p.podName) }}>
            <FileCode size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="容器组" description="Pod 管理" />

      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <Input placeholder="搜索Pod名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
            <Select value={namespace || '__all__'} onValueChange={v => setNamespace(v === '__all__' ? '' : (v ?? ''))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="所有空间" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">所有空间</SelectItem>
                {namespaces.map(ns => <SelectItem key={ns} value={ns}>{ns}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => fetchData()}><Search size={14} className="mr-1" />刷新</Button>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns as unknown as Column<Record<string, unknown>>[]}
        data={paged as unknown as Record<string, unknown>[]}
        loading={loading}
        pagination={{ page, limit: 20, total: filtered.length }}
        onPageChange={setPage}
        emptyMessage="暂无 Pod"
        variant="cards"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认删除"
        description={`确定删除 ${deleteTarget?.podName}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
