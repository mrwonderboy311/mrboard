import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

interface SearchResult {
  id: string
  resName: string
  clusterId: string
  nameSpace: string
  resType: string
  message: string
  labels: string
  createtime: string
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const columns: Column<SearchResult>[] = useMemo(() => [
    { key: 'resName', header: '名称', render: (r) => <span className="font-medium">{r.resName}</span> },
    { key: 'clusterId', header: '集群ID', render: (r) => r.clusterId },
    { key: 'nameSpace', header: '命名空间', render: (r) => r.nameSpace },
    { key: 'resType', header: '资源类型', render: (r) => <Badge variant="secondary">{r.resType}</Badge> },
    { key: 'message', header: '内容', render: (r) => <span className="max-w-xs truncate block">{r.message}</span> },
    { key: 'createtime', header: '索引时间', render: (r) => r.createtime },
    {
      key: 'actions', header: '操作', render: (r) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleDetail(r)}>
            <ExternalLink size={14} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(r)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ], [])

  const doSearch = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      const resp = await api<ApiResponse<SearchResult[]>>(`/search/v1/List?keyword=${encodeURIComponent(trimmed)}`)
      setResults(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const kw = searchParams.get('keyword')
    if (kw) {
      setKeyword(kw)
      doSearch(kw)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = keyword.trim()
    setSearchParams(trimmed ? { keyword: trimmed } : {})
    doSearch(trimmed)
  }

  const handleDetail = (row: SearchResult) => {
    navigate(`/page/mrboard/${row.resType}Detail?clusterId=${row.clusterId}&nameSpace=${row.nameSpace}&${row.resType}Name=${row.resName}`)
  }

  const handleDelete = async (row: SearchResult) => {
    if (!confirm(`确定删除 ${row.resName}？`)) return
    try {
      await api(`/search/v1/Del?id=${row.id}`)
      toast.success('删除成功')
      setResults(prev => prev.filter(r => r.id !== row.id))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="搜索" />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
            <Input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="输入搜索内容"
              className="max-w-sm"
            />
            <Button type="submit">
              <Search size={16} className="mr-1" />搜索
            </Button>
          </form>
          <p className="text-sm text-muted-foreground mb-4">
            注: 需将接口 /task/v1/UpdateIndex 部署成定时任务，每天执行一次更新资源索引，才会有搜索结果
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} data={results} loading={loading} emptyMessage="暂无搜索结果" />
        </CardContent>
      </Card>
    </div>
  )
}
