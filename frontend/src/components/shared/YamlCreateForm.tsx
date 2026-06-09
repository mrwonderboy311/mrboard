import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

interface ClusterOption {
  cluster_id: string
  cluster_name: string
}

interface YamlCreateFormProps {
  title: string
  apiUrl: string
  successRedirect: string
  placeholder?: string
}

export default function YamlCreateForm({ title, apiUrl, successRedirect, placeholder }: YamlCreateFormProps) {
  const navigate = useNavigate()
  const [clusters, setClusters] = useState<ClusterOption[]>([])
  const [clusterId, setClusterId] = useState('')
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api<ClusterOption[]>('/mrboard/cluster/v1/List')
      .then(data => {
        setClusters(data || [])
        const saved = localStorage.getItem('clusterId')
        if (saved && data?.some(c => c.cluster_id === saved)) {
          setClusterId(saved)
        } else if (data && data.length > 0) {
          setClusterId(data[0].cluster_id)
        }
      })
      .catch(err => toast.error((err as Error).message))
  }, [])

  const handleSubmit = async () => {
    if (!clusterId) {
      toast.error('请选择集群')
      return
    }
    if (!yaml.trim()) {
      toast.error('请输入YAML内容')
      return
    }

    setLoading(true)
    try {
      const resp = await api<{ msg: string }>(apiUrl + '?clusterId=' + clusterId, {
        method: 'POST',
        body: yaml,
        headers: { 'Content-Type': 'text/plain' },
      })
      toast.success(resp.msg || '创建成功')
      navigate(successRedirect)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(successRedirect)}>
          <ArrowLeft size={16} className="mr-1" />返回
        </Button>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">当前集群</label>
            <Select value={clusterId} onValueChange={(v) => v && setClusterId(v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="请选择集群" />
              </SelectTrigger>
              <SelectContent>
                {clusters.map(c => (
                  <SelectItem key={c.cluster_id} value={c.cluster_id}>{c.cluster_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <textarea
            value={yaml}
            onChange={e => setYaml(e.target.value)}
            placeholder={placeholder || '在此粘贴或编写YAML内容...'}
            className="w-full h-96 rounded-md border border-zinc-800 bg-zinc-950 text-emerald-400 font-mono text-sm p-4 resize-y"
            spellCheck={false}
          />

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '创建中...' : '创建'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
