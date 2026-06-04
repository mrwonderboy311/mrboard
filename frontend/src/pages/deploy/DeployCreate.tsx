import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function DeployCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const clusterId = localStorage.getItem('clusterId') || ''
  const [form, setForm] = useState({
    nameSpace: '', deployName: '', imageUrl: '',
    replicas: '1', labels: '',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/mrboard/deploy/v1/Create', {
        method: 'POST',
        body: JSON.stringify({ clusterId, ...form, replicas: Number(form.replicas) }),
      })
      toast.success('创建成功')
      navigate('/deploy/list')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">创建 Deployment</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">命名空间</label>
              <Input value={form.nameSpace} onChange={e => update('nameSpace', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Deployment 名称</label>
              <Input value={form.deployName} onChange={e => update('deployName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">镜像地址</label>
              <Input value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)} placeholder="nginx:latest" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">副本数</label>
              <Input type="number" min="1" value={form.replicas} onChange={e => update('replicas', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">标签</label>
              <Input value={form.labels} onChange={e => update('labels', e.target.value)} placeholder="app=nginx,env=prod" />
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
