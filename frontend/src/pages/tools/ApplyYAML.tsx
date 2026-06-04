import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'

interface ClusterOption {
  cluster_id: string
  cluster_name: string
}

export default function ApplyYAML() {
  const [clusters, setClusters] = useState<ClusterOption[]>([])
  const [clusterId, setClusterId] = useState('')
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api<ApiResponse<ClusterOption[]>>('/mrboard/cluster/v1/List')
      .then(resp => {
        setClusters(resp.data || [])
        if (resp.data && resp.data.length > 0) setClusterId(resp.data[0].cluster_id)
      })
      .catch(err => toast.error((err as Error).message))
  }, [])

  const handleApply = async () => {
    if (!clusterId) {
      toast.error('请选择集群')
      return
    }
    if (!yaml.trim()) {
      toast.error('请输入YAML内容')
      return
    }
    if (!confirm(`确定应用到集群: ${clusterId}？`)) return

    setLoading(true)
    try {
      const resp = await api<{ msg: string }>('/mrboard/apply/v1/ApplyYaml', {
        method: 'POST',
        body: yaml,
        headers: { 'Content-Type': 'text/plain' },
      })
      toast.success(resp.msg || '执行完成')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Apply YAML</h1>
      <p className="text-sm text-muted-foreground">功能相当于: kubectl apply -f xxx.yaml</p>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">当前集群</label>
            <select
              value={clusterId}
              onChange={e => setClusterId(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-64"
            >
              <option value="">请选择集群</option>
              {clusters.map(c => (
                <option key={c.cluster_id} value={c.cluster_id}>{c.cluster_name}</option>
              ))}
            </select>
          </div>

          <textarea
            value={yaml}
            onChange={e => setYaml(e.target.value)}
            placeholder="在此粘贴或编写YAML内容..."
            className="w-full h-96 rounded-md border border-input bg-slate-950 text-green-400 font-mono text-sm p-4 resize-y"
            spellCheck={false}
          />

          <div className="flex gap-2">
            <Button onClick={handleApply} disabled={loading}>
              {loading ? '执行中...' : 'Apply'}
            </Button>
            <a
              href="https://k8syaml.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">YAML语法在线编写</Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
