import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function IngressCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const clusterId = localStorage.getItem('clusterId') || ''
  const [form, setForm] = useState({
    nameSpace: '', ingressName: '', host: '',
    path: '/', backendService: '', backendPort: '80',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/mrboard/ing/v1/Create', {
        method: 'POST',
        body: JSON.stringify({ clusterId, ...form, backendPort: Number(form.backendPort) }),
      })
      toast.success('创建成功')
      navigate('/k8s/ingress')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">创建 Ingress</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">命名空间</label>
              <Input value={form.nameSpace} onChange={e => update('nameSpace', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ingress 名称</label>
              <Input value={form.ingressName} onChange={e => update('ingressName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">域名</label>
              <Input value={form.host} onChange={e => update('host', e.target.value)} placeholder="example.com" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">路径</label>
              <Input value={form.path} onChange={e => update('path', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">后端 Service 名称</label>
              <Input value={form.backendService} onChange={e => update('backendService', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">后端端口</label>
              <Input type="number" min="1" value={form.backendPort} onChange={e => update('backendPort', e.target.value)} required />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '提交中...' : '提交'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>返回</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
