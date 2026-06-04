import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

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

  const columns: Column<Favorite>[] = useMemo(() => [
    {
      key: 'name', header: '名称', render: (f) => (
        <div className="flex items-center gap-1">
          <Star size={14} className="text-yellow-500" />
          {f.name}
        </div>
      ),
    },
    {
      key: 'url', header: '链接', render: (f) => (
        <Link to={f.url} className="text-blue-500 hover:underline">{f.url}</Link>
      ),
    },
    { key: 'remarks', header: '备注', render: (f) => f.remarks },
    { key: 'createtime', header: '创建时间', render: (f) => f.createtime },
    {
      key: 'actions', header: '操作', render: (f) => (
        <Button variant="outline" size="sm" onClick={() => handleDelete(f.id)}>
          <Trash2 size={14} />
        </Button>
      ),
    },
  ], [])

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
      <PageHeader title="我的收藏" />
      <DataTable columns={columns} data={favorites} loading={loading} emptyMessage="暂无收藏" />
    </div>
  )
}
