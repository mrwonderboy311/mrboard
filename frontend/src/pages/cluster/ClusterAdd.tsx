import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

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

function parseKubeconfig(yaml: string): { server: string; token: string; ca: string } {
  // Simple extraction — works for most kubeconfig formats
  const serverMatch = yaml.match(/server:\s*(https?:\/\/[^\s\n]+)/)
  const tokenMatch = yaml.match(/token:\s*([^\s\n]+)/)
  // Extract certificate-authority-data
  const caMatch = yaml.match(/certificate-authority-data:\s*([^\s\n]+)/)
  return {
    server: serverMatch?.[1] || '',
    token: tokenMatch?.[1] || '',
    ca: caMatch?.[1] || '',
  }
}

export default function ClusterAdd() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'kubeconfig' | 'manual'>('kubeconfig')
  const [kubeconfigText, setKubeconfigText] = useState('')
  const [form, setForm] = useState({
    cluster_id: '', cluster_name: '', idc_name: '',
    kube_config: '', bearer_token: '', api_server: '',
    lan_slbip: '', wan_slbip: '', remarks: '',
    loki_url: '', tempo_url: '', prometheus_url: '',
    loki_config: '',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleParseKubeconfig = () => {
    if (!kubeconfigText.trim()) {
      toast.error('请粘贴 kubeconfig 内容')
      return
    }
    const parsed = parseKubeconfig(kubeconfigText)
    if (!parsed.server) {
      toast.error('未能从 kubeconfig 中解析出 server 地址')
      return
    }
    setForm(prev => ({
      ...prev,
      kube_config: kubeconfigText,
      api_server: parsed.server,
      bearer_token: parsed.token,
    }))
    // Auto-generate cluster_id if empty
    if (!form.cluster_id) {
      const name = form.cluster_name || 'cluster-' + Date.now().toString(36)
      update('cluster_id', name.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    }
    toast.success(`已解析: server=${parsed.server}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cluster_id) {
      toast.error('请填写集群ID')
      return
    }
    if (!form.cluster_name) {
      toast.error('请填写集群名称')
      return
    }
    setLoading(true)
    try {
      await api('/mrboard/cluster/v1/Add', {
        method: 'POST',
        body: JSON.stringify({
          cluster_id: form.cluster_id,
          cluster_name: form.cluster_name,
          idc_name: form.idc_name,
          kube_config: form.kube_config,
          bearer_token: form.bearer_token,
          lan_slbip: form.lan_slbip,
          wan_slbip: form.wan_slbip,
          remarks: form.remarks,
          loki_url: form.loki_url,
          tempo_url: form.tempo_url,
          prometheus_url: form.prometheus_url,
          loki_config: form.loki_config,
          status: 1,
        }),
      })
      toast.success('添加成功')
      navigate('/cluster/list')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">添加集群</h1>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button variant={mode === 'kubeconfig' ? 'default' : 'outline'} onClick={() => setMode('kubeconfig')}>
          粘贴 kubeconfig
        </Button>
        <Button variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => setMode('manual')}>
          手动填写
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Kubeconfig paste mode */}
        {mode === 'kubeconfig' && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">粘贴 kubeconfig 内容</label>
                <Textarea
                  value={kubeconfigText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setKubeconfigText(e.target.value)}
                  placeholder={`apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://10.0.0.1:6443
    certificate-authority-data: LS0t...
  name: my-cluster
users:
- user:
    token: eyJhbGciOi...
  name: my-user`}
                  className="font-mono text-sm min-h-[200px]"
                />
              </div>
              <Button type="button" variant="secondary" onClick={handleParseKubeconfig}>
                解析 kubeconfig
              </Button>
              {form.api_server && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                  解析结果: Server={form.api_server}, Token={form.bearer_token ? '已获取' : '未找到'}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Common fields */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">集群ID <span className="text-red-500">*</span></label>
                <Input value={form.cluster_id} onChange={e => update('cluster_id', e.target.value)} placeholder="my-cluster" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">集群名称 <span className="text-red-500">*</span></label>
                <Input value={form.cluster_name} onChange={e => update('cluster_name', e.target.value)} placeholder="生产集群" required />
              </div>
            </div>

            {mode === 'manual' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Server</label>
                  <Input value={form.api_server} onChange={e => update('api_server', e.target.value)} placeholder="https://10.0.0.1:6443" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bearer Token</label>
                  <Textarea value={form.bearer_token} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update('bearer_token', e.target.value)} className="font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">KubeConfig</label>
                  <Textarea value={form.kube_config} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update('kube_config', e.target.value)} className="font-mono text-sm min-h-[120px]" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">IDC / 机房</label>
              <Input value={form.idc_name} onChange={e => update('idc_name', e.target.value)} placeholder="cn-hangzhou" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">内网SLB IP</label>
                <Input value={form.lan_slbip} onChange={e => update('lan_slbip', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">外网SLB IP</label>
                <Input value={form.wan_slbip} onChange={e => update('wan_slbip', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prometheus 地址</label>
              <Input value={form.prometheus_url} onChange={e => update('prometheus_url', e.target.value)} placeholder="http://prometheus.monitoring.svc.cluster.local:9090" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Loki URL</label>
                <Input value={form.loki_url} onChange={e => update('loki_url', e.target.value)} placeholder="http://loki:3100" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tempo URL</label>
                <Input value={form.tempo_url} onChange={e => update('tempo_url', e.target.value)} placeholder="http://tempo:3100" />
              </div>
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
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update('loki_config', e.target.value)}
                placeholder='JSON格式，留空使用默认配置'
                rows={12}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">配置不同Loki环境的标签字段映射，留空将使用默认配置</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input value={form.remarks} onChange={e => update('remarks', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? '提交中...' : '提交'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate('/cluster/list')}>取消</Button>
        </div>
      </form>
    </div>
  )
}
