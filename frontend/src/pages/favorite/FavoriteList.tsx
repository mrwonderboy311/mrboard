import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const columns: Column<Favorite>[] = useMemo(() => [
    {
      key: 'name', header: '名称', className: 'font-medium', render: (f) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Star size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{f.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">{f.remarks || '-'}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'url', header: '链接', className: 'text-xs', render: (f) => (
        <Link to={f.url} className="text-blue-500 hover:underline">{f.url}</Link>
      ),
    },
    { key: 'createtime', header: '创建时间', className: 'text-xs text-muted-foreground', render: (f) => f.createtime },
    {
      key: 'actions', header: '', render: (f) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(f.id) }}>
            <Trash2 size={15} />
          </Button>
        </div>
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

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/fav/v1/Del?id=' + deleteTarget, { method: 'GET' })
      toast.success('删除成功')
      fetchFavorites()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="我的收藏" eyebrow="收藏" />
      <DataTable columns={columns} data={favorites} loading={loading} emptyMessage="暂无收藏" variant="cards" />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description="确定删除该收藏？"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
