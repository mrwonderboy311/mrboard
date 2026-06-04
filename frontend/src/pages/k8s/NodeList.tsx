import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Search, FileCode, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

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

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: NodeItem[] }>('/mrboard/node/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [clusterId])

  useEffect(() => {
    setFiltered(searchName ? items.filter(i => i.nodeName.toLowerCase().includes(searchName.toLowerCase())) : items)
    setPage(1)
  }, [items, searchName])

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleDelete = async (name: string) => {
    if (!confirm('确定删除节点 ' + name + '？')) return
    try {
      await api('/mrboard/node/v1/Del?clusterId=' + clusterId + '&nodeName=' + name)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const columns: Column<NodeItem>[] = [
    { key: 'name', header: '名称', render: n => <span className="font-medium">{n.nodeName}</span> },
    { key: 'state', header: '状态', render: n => <StatusBadge status={n.nodeState} /> },
    { key: 'role', header: '角色', render: n => n.nodeRole },
    { key: 'ip', header: 'IP', className: 'font-mono text-sm', render: n => n.nodeIp },
    { key: 'info', header: '节点信息', className: 'text-xs', render: n => n.nodeInfo || '-' },
    { key: 'cpu', header: 'CPU', render: n => n.cpuUsage },
    { key: 'mem', header: '内存', render: n => n.memUsage },
    {
      key: 'actions',
      header: '操作',
      render: n => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => navigate('/node/detail?clusterId=' + clusterId + '&nodeName=' + n.nodeName)}><Eye size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/node/yaml?clusterId=' + clusterId + '&nodeName=' + n.nodeName)}><FileCode size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(n.nodeName)}><Trash2 size={14} className="text-destructive" /></Button>
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
            <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={paged}
            loading={loading}
            pagination={{ page, limit: pageSize, total: filtered.length }}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
