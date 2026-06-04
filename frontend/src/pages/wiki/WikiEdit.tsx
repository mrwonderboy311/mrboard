import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function WikiEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [needPassword, setNeedPassword] = useState(false)
  const [readPassword, setReadPassword] = useState('')
  const [form, setForm] = useState({
    xcolumn: '',
    title: '',
    authkey: '',
    content: '',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const data = await api<{ title: string; author: string; xcolumn: string; authkey: string }>(
          `/wiki/v1/Read?id=${id}`
        )
        setForm(prev => ({
          ...prev,
          title: data.title || '',
          xcolumn: data.xcolumn || '',
          authkey: data.authkey === 'true' ? '******' : '',
        }))

        if (data.authkey === 'true') {
          setNeedPassword(true)
        } else {
          const content = await api<string>(`/wiki/v1/Read?id=${id}&key=content`)
          setForm(prev => ({ ...prev, content }))
        }
      } catch (err) {
        toast.error((err as Error).message)
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [id])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch(`/wiki/v1/Read?id=${id}&key=content`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authkey: readPassword }),
      })
      const text = await res.text()
      if (text === 'passwordError') {
        toast.error('阅读密码错误')
        return
      }
      setForm(prev => ({ ...prev, content: text }))
      setNeedPassword(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api<{ code: number; msg: string }>('/wiki/v1/Update', {
        method: 'POST',
        body: JSON.stringify({ id, ...form }),
      })
      if (res.code === 0) {
        toast.success('修改成功')
        navigate('/wiki/list')
      } else {
        toast.error(res.msg || '修改失败')
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="py-8 text-center text-muted-foreground">加载中...</div>

  if (needPassword) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-2xl font-bold">编辑文档</h1>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">该文档已加密，请输入阅读密码以加载内容</p>
              <Input
                type="password"
                placeholder="输入阅读密码"
                value={readPassword}
                onChange={e => setReadPassword(e.target.value)}
                required
              />
              <Button type="submit">确认</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">编辑文档</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="space-y-2 flex-shrink-0 w-40">
                <label className="text-sm font-medium">栏目</label>
                <Input
                  value={form.xcolumn}
                  onChange={e => update('xcolumn', e.target.value)}
                  placeholder="栏目名称"
                  required
                />
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">标题</label>
                <Input
                  value={form.title}
                  onChange={e => update('title', e.target.value)}
                  placeholder="文档标题"
                  required
                />
              </div>
              <div className="space-y-2 flex-shrink-0 w-32">
                <label className="text-sm font-medium">阅读密码</label>
                <Input
                  type="password"
                  value={form.authkey}
                  onChange={e => update('authkey', e.target.value)}
                  placeholder="可留空"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">内容 (Markdown)</label>
              <textarea
                className="w-full min-h-[500px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.content}
                onChange={e => update('content', e.target.value)}
                placeholder="输入 Markdown 内容..."
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/wiki/list')}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
