import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pencil, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function WikiDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [xcolumn, setXcolumn] = useState('')
  const [content, setContent] = useState('')
  const [needPassword, setNeedPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordPrompt, setPasswordPrompt] = useState(false)

  const fetchArticle = async (authkey?: string) => {
    setLoading(true)
    try {
      let url = `/wiki/v1/Read?id=${id}&key=content`
      if (authkey) {
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authkey }),
        })
        const text = await res.text()
        if (text === 'passwordError') {
          toast.error('阅读密码错误')
          setLoading(false)
          return
        }
        setContent(text)
        setPasswordPrompt(false)
      } else {
        const text = await api<string>(url)
        setContent(text)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMeta = async () => {
    try {
      const data = await api<{ title: string; author: string; xcolumn: string; authkey: string }>(
        `/wiki/v1/Read?id=${id}`
      )
      setTitle(data.title || '')
      setXcolumn(data.xcolumn || '')
      if (data.authkey === 'true') {
        setNeedPassword(true)
        setPasswordPrompt(true)
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  useEffect(() => {
    if (!id) return
    fetchMeta()
    fetchArticle()
  }, [id])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchArticle(password)
  }

  if (loading && !needPassword) {
    return <div className="py-8 text-center text-muted-foreground">加载中...</div>
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/wiki/list')}>
            <ArrowLeft size={14} className="mr-1" />返回
          </Button>
          <h1 className="text-2xl font-bold">{title || '文档详情'}</h1>
          {xcolumn && <span className="text-sm text-muted-foreground">栏目: {xcolumn}</span>}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/wiki/edit/${id}`)}>
          <Pencil size={14} className="mr-1" />编辑
        </Button>
      </div>

      {passwordPrompt && needPassword ? (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordSubmit} className="flex items-center gap-2 max-w-sm">
              <Input
                type="password"
                placeholder="输入阅读密码"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Button type="submit" size="sm">提交</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {content}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
