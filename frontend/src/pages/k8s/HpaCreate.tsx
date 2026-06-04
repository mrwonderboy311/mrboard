import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function HpaCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const clusterId = localStorage.getItem('clusterId') || ''
  const [form, setForm] = useState({
    nameSpace: '', hpaName: '', targetRef: '',
    minReplicas: '1', maxReplicas: '10', targetCPU: '80',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/mrboard/hpa/v1/Create', {
        method: 'POST',
        body: JSON.stringify({
          clusterId,
          ...form,
          minReplicas: Number(form.minReplicas),
          maxReplicas: Number(form.maxReplicas),
          targetCPU: Number(form.targetCPU),
        }),
      })
      toast.success('创建成功')
      navigate('/k8s/hpa')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">创建 HPA</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">命名空间</label>
              <Input value={form.nameSpace} onChange={e => update('nameSpace', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">HPA 名称</label>
              <Input value={form.hpaName} onChange={e => update('hpaName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">目标工作负载</label>
              <Input value={form.targetRef} onChange={e => update('targetRef', e.target.value)} placeholder="Deployment/my-app" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">最小副本数</label>
              <Input type="number" min="1" value={form.minReplicas} onChange={e => update('minReplicas', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">最大副本数</label>
              <Input type="number" min="1" value={form.maxReplicas} onChange={e => update('maxReplicas', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">目标 CPU 利用率 (%)</label>
              <Input type="number" min="1" max="100" value={form.targetCPU} onChange={e => update('targetCPU', e.target.value)} required />
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
