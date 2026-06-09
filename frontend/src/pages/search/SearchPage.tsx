import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search as SearchIcon, ExternalLink, Trash2, FileSearch } from 'lucide-react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
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
  const [deleteTarget, setDeleteTarget] = useState<SearchResult | null>(null)

  const columns: Column<SearchResult>[] = useMemo(() => [
    {
      key: 'resName', header: '名称', className: 'font-medium', render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileSearch size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{r.resName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px]">{r.resType}</Badge>
              <span className="text-[10px] text-muted-foreground truncate">{r.nameSpace}</span>
            </div>
          </div>
        </div>
      ),
    },
    { key: 'clusterId', header: '集群ID', className: 'text-xs', render: (r) => r.clusterId },
    { key: 'message', header: '内容', className: 'text-xs max-w-xs truncate', render: (r) => <span className="max-w-xs truncate block">{r.message}</span> },
    { key: 'createtime', header: '索引时间', className: 'text-xs text-muted-foreground', render: (r) => r.createtime },
    {
      key: 'actions', header: '', render: (r) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="详情"
            onClick={() => handleDetail(r)}>
            <ExternalLink size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(r) }}>
            <Trash2 size={15} />
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

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api(`/search/v1/Del?id=${deleteTarget.id}`)
      toast.success('删除成功')
      setResults(prev => prev.filter(r => r.id !== deleteTarget.id))
    } catch (err) {
      toast.error((err as Error).message)
    } finally { setDeleteTarget(null) }
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="搜索" eyebrow="搜索" />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="输入搜索内容"
                className="h-11 text-base pl-10"
              />
            </div>
            <Button type="submit" className="h-11">
              搜索
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground -mt-2">
        注: 需将接口 /task/v1/UpdateIndex 部署成定时任务，每天执行一次更新资源索引，才会有搜索结果
      </p>

      <DataTable columns={columns} data={results} loading={loading} emptyMessage="暂无搜索结果" variant="cards" />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认删除"
        description={`确定删除 ${deleteTarget?.resName || ''}？`}
        variant="destructive"
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  )
}
