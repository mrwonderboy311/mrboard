import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

interface ResLimit {
  cpuLimit: string
  memoryLimit: string
  cpuRequest: string
  memoryRequest: string
}

export default function NamespaceResLimit() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const clusterId = searchParams.get('clusterId') || ''
  const nameSpace = searchParams.get('nameSpace') || ''

  const [form, setForm] = useState<ResLimit>({
    cpuLimit: '',
    memoryLimit: '',
    cpuRequest: '',
    memoryRequest: '',
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!clusterId || !nameSpace) {
      toast.error('缺少必要参数')
      setFetching(false)
      return
    }

    api<ResLimit>('/mrboard/ns/v1/LimitRange?clusterId=' + clusterId + '&nameSpace=' + nameSpace)
      .then(data => {
        if (data) setForm(data)
      })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setFetching(false))
  }, [clusterId, nameSpace])

  const handleChange = (field: keyof ResLimit, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api('/mrboard/ns/v1/LimitRange', {
        method: 'POST',
        body: JSON.stringify({ clusterId, nameSpace, ...form }),
      })
      toast.success('资源限制更新成功')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-1" />返回
        </Button>
        <h1 className="text-2xl font-bold">命名空间资源限制</h1>
        <span className="text-sm text-muted-foreground">{nameSpace}</span>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {fetching ? (
            <div className="text-center py-8">加载中...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">CPU Limit</label>
                  <Input
                    value={form.cpuLimit}
                    onChange={e => handleChange('cpuLimit', e.target.value)}
                    placeholder="例如: 4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Memory Limit</label>
                  <Input
                    value={form.memoryLimit}
                    onChange={e => handleChange('memoryLimit', e.target.value)}
                    placeholder="例如: 8Gi"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CPU Request</label>
                  <Input
                    value={form.cpuRequest}
                    onChange={e => handleChange('cpuRequest', e.target.value)}
                    placeholder="例如: 1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Memory Request</label>
                  <Input
                    value={form.memoryRequest}
                    onChange={e => handleChange('memoryRequest', e.target.value)}
                    placeholder="例如: 2Gi"
                  />
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? '保存中...' : '保存'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
