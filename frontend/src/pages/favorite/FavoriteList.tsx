import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'

interface Favorite {
  id: string
  name: string
  url: string
  remarks: string
  createtime: string
}

export default function FavoriteList() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const resp = await api<ApiResponse<Favorite[]>>('/fav/v1/List')
      setFavorites(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFavorites() }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该收藏？')) return
    try {
      await api('/fav/v1/Del?id=' + id, { method: 'GET' })
      toast.success('删除成功')
      fetchFavorites()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的收藏</h1>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>链接</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : favorites.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无收藏</TableCell></TableRow>
              ) : favorites.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500" />
                      {f.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link to={f.url} className="text-blue-500 hover:underline">{f.url}</Link>
                  </TableCell>
                  <TableCell>{f.remarks}</TableCell>
                  <TableCell>{f.createtime}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(f.id)}>
                      <Trash2 size={14} />
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
