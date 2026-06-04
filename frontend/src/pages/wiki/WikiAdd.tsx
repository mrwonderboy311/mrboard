import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function WikiAdd() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    xcolumn: searchParams.get('xcolumn') || '',
    title: '',
    authkey: '',
    content: '',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api<{ code: number; msg: string }>('/wiki/v1/Add', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      if (res.code === 0) {
        toast.success('提交成功')
        navigate('/wiki/list')
      } else {
        toast.error(res.msg || '提交失败')
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">添加文档</h1>
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
              <Button type="submit" disabled={loading}>{loading ? '提交中...' : '提交'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/wiki/list')}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
