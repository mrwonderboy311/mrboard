import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, Layers } from 'lucide-react'
import { toast } from 'sonner'

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

  const handleDelete = async (app: AppName) => {
    if (!confirm(`确定删除 ${app.appname}？`)) return
    try {
      await api(`/mrboard/appname/v1/Del?id=${app.id}`)
      toast.success('删除成功')
      fetchApps(searchName)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">应用集</h1>
        <Button render={<Link to="/app/add" />}>
          <Plus size={16} className="mr-2" />添加
        </Button>
      </div>

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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : apps.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">暂无应用</TableCell></TableRow>
              ) : apps.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <Link to={`/resource/list?appname=${a.appname}`} className="text-blue-500 hover:underline flex items-center gap-1">
                      <Layers size={14} />{a.appname}
                    </Link>
                  </TableCell>
                  <TableCell>{a.createtime}</TableCell>
                  <TableCell>
                    <InlineEdit value={a.remarks} onSave={(val) => handleInlineEdit(a, 'remarks', val)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" render={<Link to={`/resource/list?appname=${a.appname}`} />}>
                        资源集合
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(a)}>
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
