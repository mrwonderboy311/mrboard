import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Eye, Trash2, Lock, BookOpen, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Article, ApiResponse } from '@/types'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

export default function WikiList() {
  const [searchParams] = useSearchParams()
  const xcolumnFilter = searchParams.get('xcolumn') || ''
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const columns: Column<Article>[] = useMemo(() => [
    { key: 'id', header: 'ID', className: 'w-16', render: (a) => a.id },
    {
      key: 'xcolumn', header: '栏目', className: 'w-28', render: (a) => (
        <Badge variant="outline">{a.xcolumn}</Badge>
      ),
    },
    {
      key: 'title', header: '标题', render: (a) => (
        <Link to={`/wiki/detail/${a.id}`} className="text-blue-600 hover:underline font-medium">
          {a.title}
        </Link>
      ),
    },
    { key: 'author', header: '作者', className: 'w-24', render: (a) => a.author },
    { key: 'updatetime', header: '更新时间', className: 'w-40', render: (a) => <span className="text-sm text-muted-foreground">{a.updatetime}</span> },
    {
      key: 'authkey', header: '加密', className: 'w-16', render: (a) => (
        a.authkey === 'true'
          ? <Lock size={16} className="text-red-500" />
          : <BookOpen size={16} className="text-green-600" />
      ),
    },
    {
      key: 'actions', header: '操作', className: 'w-44', render: (a) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<Link to={`/wiki/edit/${a.id}`} />}>
            <Pencil size={14} />
          </Button>
          <Button variant="outline" size="sm" render={<Link to={`/wiki/detail/${a.id}`} />}>
            <Eye size={14} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDelete(a.id, a.title)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ], [])

  const fetchArticles = async () => {
    setLoading(true)
    try {
      let url = '/wiki/v1/List'
      const params = new URLSearchParams()
      if (xcolumnFilter) params.set('xcolumn', xcolumnFilter)
      if (params.toString()) url += '?' + params.toString()
      const resp = await api<ApiResponse<Article[]>>(url)
      setArticles(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchArticles() }, [xcolumnFilter])

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`确定删除 "${title}" ？`)) return
    try {
      await api(`/wiki/v1/Del?id=${id}`)
      toast.success('删除成功')
      fetchArticles()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const filtered = articles.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.xcolumn.toLowerCase().includes(search.toLowerCase()) ||
    a.author.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => { setPage(1) }, [search, xcolumnFilter])

  const PAGE_SIZE = 20
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-4">
      <PageHeader title={xcolumnFilter ? `栏目: ${xcolumnFilter}` : '文档中心'}>
        <Button render={<Link to={`/wiki/add${xcolumnFilter ? `?xcolumn=${xcolumnFilter}` : ''}`} />}>
          <Plus size={16} className="mr-2" />添加文档
        </Button>
      </PageHeader>

      <div className="flex items-center gap-2 max-w-sm">
        <Search size={16} className="text-muted-foreground" />
        <Input
          placeholder="搜索标题、栏目、作者..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={paged}
            loading={loading}
            emptyMessage="暂无文档"
            pagination={{ page, limit: PAGE_SIZE, total: filtered.length }}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
