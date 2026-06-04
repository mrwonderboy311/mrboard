import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { Cluster } from '@/types'

const DEFAULT_LOKI_CONFIG = JSON.stringify({
  streamSelector: { namespace: 'namespace', service: 'service_name' },
  fieldMapping: {
    pod: ['pod', 'pod_name'],
    container: ['container', 'container_name'],
    app: ['app', 'service_name'],
    level: ['level', 'severity', 'log_level'],
  },
  levelDetection: {
    labelKey: 'level',
    regexFromMessage: true,
    valueMap: { err: 'error', warning: 'warn', fatal: 'error' },
  },
  messageField: '',
  timestampField: '',
}, null, 2)

export default function ClusterEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState({
    cluster_name: '', cluster_type: '', api_server: '',
    token: '', prometheus_url: '', loki_url: '', tempo_url: '', loki_config: '',
  })

  useEffect(() => {
    if (!id) return
    api<Cluster>(`/cluster/get?cluster_id=${id}`)
      .then(data => {
        setForm({
          cluster_name: data.cluster_name || '',
          cluster_type: data.cluster_type || '',
          api_server: data.api_server || '',
          token: '',
          prometheus_url: data.prometheus_url || '',
          loki_url: data.loki_url || '',
          tempo_url: data.tempo_url || '',
          loki_config: data.loki_config || '',
        })
      })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setFetching(false))
  }, [id])

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/mrboard/cluster/v1/Update', { method: 'POST', body: JSON.stringify({ cluster_id: id, ...form }) })
      toast.success('修改成功')
      navigate('/cluster/list')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="py-8 text-center text-muted-foreground">加载中...</div>

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">编辑集群</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">集群名称</label>
              <Input value={form.cluster_name} onChange={e => update('cluster_name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">集群类型</label>
              <Input value={form.cluster_type} onChange={e => update('cluster_type', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Server</label>
              <Input value={form.api_server} onChange={e => update('api_server', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Token</label>
              <Input value={form.token} onChange={e => update('token', e.target.value)} placeholder="不修改请留空" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prometheus URL</label>
              <Input value={form.prometheus_url} onChange={e => update('prometheus_url', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Loki URL</label>
              <Input value={form.loki_url} onChange={e => update('loki_url', e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Loki 字段映射配置</label>
                <Button type="button" variant="outline" size="sm" onClick={() => update('loki_config', DEFAULT_LOKI_CONFIG)}>
                  填充默认配置
                </Button>
              </div>
              <Textarea
                value={form.loki_config}
                onChange={e => update('loki_config', e.target.value)}
                placeholder='JSON格式，留空使用默认配置'
                rows={12}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">配置不同Loki环境的标签字段映射，留空将使用默认配置</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tempo URL</label>
              <Input value={form.tempo_url} onChange={e => update('tempo_url', e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/cluster/list')}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
