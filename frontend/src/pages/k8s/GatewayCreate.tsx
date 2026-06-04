import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function GatewayCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const clusterId = localStorage.getItem('clusterId') || ''
  const [form, setForm] = useState({
    nameSpace: '', gatewayName: '', gatewayClassName: '',
    listenerName: '', protocol: 'HTTP', port: '80',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/mrboard/gateway/v1/Create', {
        method: 'POST',
        body: JSON.stringify({ clusterId, ...form, port: Number(form.port) }),
      })
      toast.success('创建成功')
      navigate('/k8s/gateway')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">创建 Gateway</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">命名空间</label>
              <Input value={form.nameSpace} onChange={e => update('nameSpace', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gateway 名称</label>
              <Input value={form.gatewayName} onChange={e => update('gatewayName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">GatewayClass 名称</label>
              <Input value={form.gatewayClassName} onChange={e => update('gatewayClassName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Listener 名称</label>
              <Input value={form.listenerName} onChange={e => update('listenerName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">协议</label>
              <select
                value={form.protocol}
                onChange={e => update('protocol', e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">端口</label>
              <Input type="number" min="1" value={form.port} onChange={e => update('port', e.target.value)} required />
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
