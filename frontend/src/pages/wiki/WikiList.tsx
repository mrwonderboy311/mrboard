import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Eye, Trash2, Lock, BookOpen, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Article, ApiResponse } from '@/types'

export default function WikiList() {
  const [searchParams] = useSearchParams()
  const xcolumnFilter = searchParams.get('xcolumn') || ''
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {xcolumnFilter ? `栏目: ${xcolumnFilter}` : '文档列表'}
        </h1>
        <Button render={<Link to={`/wiki/add${xcolumnFilter ? `?xcolumn=${xcolumnFilter}` : ''}`} />}>
          <Plus size={16} className="mr-2" />添加文档
        </Button>
      </div>

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="w-28">栏目</TableHead>
                <TableHead>标题</TableHead>
                <TableHead className="w-24">作者</TableHead>
                <TableHead className="w-40">更新时间</TableHead>
                <TableHead className="w-16">加密</TableHead>
                <TableHead className="w-44">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无文档</TableCell></TableRow>
              ) : filtered.map(article => (
                <TableRow key={article.id}>
                  <TableCell>{article.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{article.xcolumn}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/wiki/detail/${article.id}`} className="text-blue-600 hover:underline">
                      {article.title}
                    </Link>
                  </TableCell>
                  <TableCell>{article.author}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{article.updatetime}</TableCell>
                  <TableCell>
                    {article.authkey === 'true' ? (
                      <Lock size={16} className="text-red-500" />
                    ) : (
                      <BookOpen size={16} className="text-green-600" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" render={<Link to={`/wiki/edit/${article.id}`} />}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="outline" size="sm" render={<Link to={`/wiki/detail/${article.id}`} />}>
                        <Eye size={14} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(article.id, article.title)}>
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
