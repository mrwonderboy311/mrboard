import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function ServiceCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const clusterId = localStorage.getItem('clusterId') || ''
  const [form, setForm] = useState({
    nameSpace: '', serviceName: '', type: 'ClusterIP',
    ports: '', selector: '',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/mrboard/svc/v1/Create', {
        method: 'POST',
        body: JSON.stringify({ clusterId, ...form }),
      })
      toast.success('创建成功')
      navigate('/k8s/service')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">创建 Service</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">命名空间</label>
              <Input value={form.nameSpace} onChange={e => update('nameSpace', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Service 名称</label>
              <Input value={form.serviceName} onChange={e => update('serviceName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">类型</label>
              <Select value={form.type} onValueChange={val => { if (val) update('type', val) }}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ClusterIP">ClusterIP</SelectItem>
                  <SelectItem value="NodePort">NodePort</SelectItem>
                  <SelectItem value="LoadBalancer">LoadBalancer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">端口</label>
              <Input value={form.ports} onChange={e => update('ports', e.target.value)} placeholder="80:80/TCP,443:443/TCP" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Selector</label>
              <Input value={form.selector} onChange={e => update('selector', e.target.value)} placeholder="app=nginx" required />
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
