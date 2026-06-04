import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, FileCode, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

interface CrdItem {
  cdrName: string
  cdrKind: string
  apiGroup: string
  apiVersion: string
  scope: string
}

export default function CrdList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CrdItem[]>([])
  const [filtered, setFiltered] = useState<CrdItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [page, setPage] = useState(1)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: CrdItem[] }>('/mrboard/cdr/v1/List?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])
  useEffect(() => { setFiltered(searchName ? items.filter(i => i.cdrName.toLowerCase().includes(searchName.toLowerCase())) : items) }, [items, searchName])
  useEffect(() => { setPage(1) }, [searchName])

  const paged = useMemo(() => {
    const start = (page - 1) * 20
    return filtered.slice(start, start + 20)
  }, [filtered, page])

  const handleDelete = async (name: string) => {
    if (!confirm('确定删除 CRD ' + name + '？')) return
    try {
      await api('/mrboard/cdr/v1/Del?clusterId=' + clusterId + '&crdName=' + name)
      toast.success('删除成功')
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const columns: Column<CrdItem>[] = [
    { key: 'cdrName', header: '名称', className: 'font-medium', render: (d) => d.cdrName },
    { key: 'apiGroup', header: '组', render: (d) => d.apiGroup },
    { key: 'apiVersion', header: '版本', render: (d) => d.apiVersion },
    { key: 'cdrKind', header: 'Kind', render: (d) => d.cdrKind },
    { key: 'scope', header: '范围', render: (d) => d.scope },
    {
      key: 'actions', header: '操作', render: (d) => (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => navigate('/k8s/crd/yaml?clusterId=' + clusterId + '&crdName=' + d.cdrName)}><FileCode size={14} /></Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(d.cdrName)}><Trash2 size={14} className="text-destructive" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="自定义资源" description="CRD 管理" />
      <Card><CardContent className="py-3">
        <div className="flex gap-3 items-center">
          <Input placeholder="搜索CRD名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
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
    </div>
  )
}
