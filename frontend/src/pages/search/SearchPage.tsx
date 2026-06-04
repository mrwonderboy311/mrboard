import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'

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
      <h1 className="text-2xl font-bold">搜索结果</h1>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>集群ID</TableHead>
                <TableHead>命名空间</TableHead>
                <TableHead>资源类型</TableHead>
                <TableHead>内容</TableHead>
                <TableHead>索引时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : results.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无搜索结果</TableCell></TableRow>
              ) : results.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.resName}</TableCell>
                  <TableCell>{r.clusterId}</TableCell>
                  <TableCell>{r.nameSpace}</TableCell>
                  <TableCell><Badge variant="secondary">{r.resType}</Badge></TableCell>
                  <TableCell className="max-w-xs truncate">{r.message}</TableCell>
                  <TableCell>{r.createtime}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleDetail(r)}>
                        <ExternalLink size={14} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(r)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
