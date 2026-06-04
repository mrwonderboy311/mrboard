import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function GrpcRouteCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const clusterId = localStorage.getItem('clusterId') || ''
  const [form, setForm] = useState({
    nameSpace: '', routeName: '', gatewayName: '',
    hostnames: '', backendService: '', backendPort: '50051',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/mrboard/grpcroute/v1/Create', {
        method: 'POST',
        body: JSON.stringify({ clusterId, ...form, backendPort: Number(form.backendPort) }),
      })
      toast.success('创建成功')
      navigate('/k8s/grpcroute')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">创建 gRPC Route</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">命名空间</label>
              <Input value={form.nameSpace} onChange={e => update('nameSpace', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Route 名称</label>
              <Input value={form.routeName} onChange={e => update('routeName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">关联 Gateway</label>
              <Input value={form.gatewayName} onChange={e => update('gatewayName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">主机名</label>
              <Input value={form.hostnames} onChange={e => update('hostnames', e.target.value)} placeholder="grpc.example.com" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">后端 Service</label>
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
