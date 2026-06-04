import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { List } from 'lucide-react'
import { toast } from 'sonner'
import type { Column, ApiResponse } from '@/types'

export default function ColumnList() {
  const [columns, setColumns] = useState<Column[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchColumns = async () => {
      setLoading(true)
      try {
        const resp = await api<ApiResponse<Column[]>>('/wiki/v1/List?key=column')
        setColumns(resp.data || [])
      } catch (err) {
        toast.error((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchColumns()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">栏目列表</h1>
      </div>

      <blockquote className="rounded-md border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm text-muted-foreground">
        注：文章的栏目由添加文章时自定义输入，不支持单独创建栏目
      </blockquote>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>栏目</TableHead>
                <TableHead className="w-32">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : columns.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">暂无栏目</TableCell></TableRow>
              ) : columns.map(col => (
                <TableRow key={col.xcolumn}>
                  <TableCell className="font-medium">{col.xcolumn}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" render={<Link to={`/wiki/list?xcolumn=${col.xcolumn}`} />}>
                      <List size={14} className="mr-1" />文章列表
                    </Button>
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
