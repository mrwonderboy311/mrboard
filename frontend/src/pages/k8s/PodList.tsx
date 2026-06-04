import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, FileCode, Trash2, Terminal, Eye, ScrollText } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
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
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchNamespaces = async () => {
    try {
      const data = await api<Namespace[] | ApiResponse<Namespace[]>>('/mrboard/ns/v1/List?clusterId=' + clusterId)
      const list = Array.isArray(data) ? data : (data as ApiResponse<Namespace[]>).data || []
      setNamespaces(list.map(n => typeof n === 'string' ? n : n.name))
    } catch { /* optional */ }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const nsParam = namespace ? '&nameSpace=' + namespace : ''
      const res = await api<{ code: number; data: Pod[] }>('/mrboard/pod/v1/List?clusterId=' + clusterId + nsParam)
      setItems(res.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
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
    try {
      await api('/mrboard/pod/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&podName=' + deleteTarget.podName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleTerminal = (pod: Pod) => {
    window.open('/k8s/pod/terminal?clusterId=' + clusterId + '&nameSpace=' + pod.nameSpace + '&podName=' + pod.podName, '_blank')
  }

  const columns: Column<Pod>[] = [
    {
      key: 'podName',
      header: '名称',
      className: 'font-medium max-w-xs truncate',
      render: (p) => <span title={p.podName}>{p.podName}</span>,
    },
    {
      key: 'nameSpace',
      header: '命名空间',
      render: (p) => p.nameSpace,
    },
    {
      key: 'podPhase',
      header: '状态',
      render: (p) => <StatusBadge status={p.podPhase} />,
    },
    {
      key: 'restartCount',
      header: '重启',
      render: (p) => p.restartCount,
    },
    {
      key: 'podIp',
      header: 'Pod IP',
      className: 'font-mono text-sm',
      render: (p) => p.podIp,
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
      className: 'text-sm text-muted-foreground whitespace-nowrap',
      render: (p) => p.createTime,
    },
    {
      key: 'actions',
      header: '操作',
      render: (p) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/pod/detail?clusterId=' + clusterId + '&nameSpace=' + p.nameSpace + '&podName=' + p.podName) }}><Eye size={14} /></Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/pod/log?clusterId=' + clusterId + '&nameSpace=' + p.nameSpace + '&podName=' + p.podName) }}><ScrollText size={14} /></Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleTerminal(p) }}><Terminal size={14} /></Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/k8s/pod/yaml?clusterId=' + clusterId + '&nameSpace=' + p.nameSpace + '&podName=' + p.podName) }}><FileCode size={14} /></Button>
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(p) }}><Trash2 size={14} className="text-destructive" /></Button>
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
            <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            data={paged as unknown as Record<string, unknown>[]}
            loading={loading}
            pagination={{ page, limit: 20, total: filtered.length }}
            onPageChange={setPage}
            emptyMessage="暂无 Pod"
          />
        </CardContent>
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">确定删除 Pod <span className="font-mono font-medium text-foreground">{deleteTarget?.podName}</span>？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
