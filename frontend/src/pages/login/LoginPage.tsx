import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Server, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('请输入用户名和密码')
      return
    }
    setLoading(true)
    try {
      await login({ username, password })
      toast.success('登录成功')
      navigate('/')
    } catch (err) {
      toast.error((err as Error).message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background relative">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="w-full max-w-sm mx-4 relative z-10 animate-[fadeInUp_0.3s_ease-out]">
        {/* Brand */}
        <div className="text-center mb-8">
          <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-primary/5 text-primary border border-primary/10 mb-4">
            Platform
          </span>
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Server size={20} className="text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">MRBoard</span>
          </div>
          <p className="text-sm text-muted-foreground">K8s 集群管理平台</p>
        </div>

        {/* Login card */}
        <Card className="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <CardContent className="pt-6 pb-6 px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">用户名</label>
                <Input
                  placeholder="请输入用户名"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">密码</label>
                <Input
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          MRBoard &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
