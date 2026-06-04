import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import type { ApiResponse } from '@/types'

interface ClusterOption {
  cluster_id: string
  cluster_name: string
}

export default function CreateBackup() {
  const navigate = useNavigate()
  const [clusters, setClusters] = useState<ClusterOption[]>([])
  const [clusterId, setClusterId] = useState('')
  const [backupName, setBackupName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api<ApiResponse<ClusterOption[]>>('/mrboard/cluster/v1/List')
      .then(resp => {
        const data = resp.data || []
        setClusters(data)
        const saved = localStorage.getItem('clusterId')
        if (saved && data.some(c => c.cluster_id === saved)) {
          setClusterId(saved)
        } else if (data.length > 0) {
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
    if (!backupName.trim()) {
      toast.error('请输入备份名称')
      return
    }

    setLoading(true)
    try {
      await api('/mrboard/backup/v1/Backup', {
        method: 'POST',
        body: JSON.stringify({ clusterId, backupName }),
      })
      toast.success('备份创建成功')
      navigate('/ops/backup')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ops/backup')}>
          <ArrowLeft size={16} className="mr-1" />返回
        </Button>
        <h1 className="text-2xl font-bold">创建备份</h1>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">选择集群</label>
            <select
              value={clusterId}
              onChange={e => setClusterId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm w-64"
            >
              <option value="">请选择集群</option>
              {clusters.map(c => (
                <option key={c.cluster_id} value={c.cluster_id}>{c.cluster_name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">备份名称</label>
            <Input
              value={backupName}
              onChange={e => setBackupName(e.target.value)}
              placeholder="请输入备份名称"
              className="w-64"
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '创建中...' : '创建备份'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
