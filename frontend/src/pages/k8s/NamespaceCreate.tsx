import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function NamespaceCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const clusterId = localStorage.getItem('clusterId') || ''
  const [nameSpace, setNameSpace] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/mrboard/ns/v1/Create', {
        method: 'POST',
        body: JSON.stringify({ clusterId, nameSpace }),
      })
      toast.success('创建成功')
      navigate('/k8s/namespace')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">创建命名空间</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">命名空间名称</label>
              <Input value={nameSpace} onChange={e => setNameSpace(e.target.value)} placeholder="my-namespace" required />
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
