import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface AppName {
  id: string
  appname: string
  createtime: string
  remarks: string
}

export default function AppNameList() {
  const [apps, setApps] = useState<AppName[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AppName | null>(null)

  const columns: Column<AppName>[] = useMemo(() => [
    {
      key: 'appname', header: '名称', className: 'font-medium', render: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Layers size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{a.appname}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground truncate">{a.createtime}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'remarks', header: '备注', className: 'text-xs', render: (a) => (
        <InlineEdit value={a.remarks} onSave={(val) => handleInlineEdit(a, 'remarks', val)} />
      ),
    },
    {
      key: 'actions', header: '', render: (a) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="资源集合" render={<Link to={`/resource/list?appname=${a.appname}`} />}>
            <Layers size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(a) }}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ], [])

  const fetchApps = async (name?: string) => {
    setLoading(true)
    try {
      const query = name ? `?appname=${encodeURIComponent(name.trim())}` : ''
      const res = await api<{ code: number; data: AppName[] }>(`/mrboard/appname/v1/List${query}`)
      setApps(res.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchApps() }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchApps(searchName)
  }

  const handleInlineEdit = async (app: AppName, field: string, value: string) => {
    try {
      await api(`/mrboard/appname/v1/Update?id=${app.id}`, {
        method: 'POST',
        body: JSON.stringify({ id: app.id, name: field, value }),
      })
      toast.success(`[${app.id}] ${field} 更改为: ${value}`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api(`/mrboard/appname/v1/Del?id=${deleteTarget.id}`)
      toast.success('删除成功')
      fetchApps(searchName)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="应用集" eyebrow="应用">
        <Button render={<Link to="/app/add" />}>
          <Plus size={16} className="mr-2" />添加
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <Input
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              placeholder="应用名称"
              className="max-w-xs"
            />
            <Button type="submit" variant="secondary">搜索</Button>
          </form>
          <p className="text-sm text-muted-foreground mb-4">
            注: 添加应用后，需要在资源的标签中增加 appname:应用名，然后才会在资源集合中展现出来
          </p>
        </CardContent>
      </Card>

      <DataTable columns={columns} data={apps} loading={loading} emptyMessage="暂无应用" variant="cards" />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认操作"
        description={`确定删除 ${deleteTarget?.appname}？`}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

function InlineEdit({ value, onSave }: { value: string; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const handleBlur = () => {
    setEditing(false)
    if (draft !== value) {
      onSave(draft)
    }
  }

  if (editing) {
    return (
      <Input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') handleBlur() }}
        autoFocus
        className="h-7 text-sm"
      />
    )
  }

  return (
    <span onClick={() => { setDraft(value); setEditing(true) }} className="cursor-pointer hover:underline">
      {value || '-'}
    </span>
  )
}
