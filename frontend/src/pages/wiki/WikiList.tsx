import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { Input } from '@/components/ui/input'
import { Plus, Pencil, Eye, Trash2, Lock, BookOpen, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Article, ApiResponse } from '@/types'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

export default function WikiList() {
  const [searchParams] = useSearchParams()
  const xcolumnFilter = searchParams.get('xcolumn') || ''
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null)

  const columns: Column<Article>[] = useMemo(() => [
    {
      key: 'title', header: '标题', className: 'font-medium', render: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{a.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px]">{a.xcolumn}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{a.author}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'updatetime', header: '更新时间', className: 'text-xs text-muted-foreground', render: (a) => a.updatetime },
    {
      key: 'authkey', header: '加密', render: (a) => (
        a.authkey === 'true'
          ? <Lock size={16} className="text-red-500" />
          : <BookOpen size={16} className="text-green-600" />
      ),
    },
    {
      key: 'actions', header: '', render: (a) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="编辑" render={<Link to={`/wiki/edit/${a.id}`} />}>
            <Pencil size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="查看" render={<Link to={`/wiki/detail/${a.id}`} />}>
            <Eye size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: a.id, title: a.title }) }}>
            <Trash2 size={15} />
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

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api(`/wiki/v1/Del?id=${deleteTarget.id}`)
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
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title={xcolumnFilter ? `栏目: ${xcolumnFilter}` : '文档中心'} eyebrow="Knowledge">
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

      <DataTable
        columns={columns}
        data={paged}
        loading={loading}
        emptyMessage="暂无文档"
        pagination={{ page, limit: PAGE_SIZE, total: filtered.length }}
        onPageChange={setPage}
        variant="cards"
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description={`确定删除 "${deleteTarget?.title}" ？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
