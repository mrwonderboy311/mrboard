import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

interface MyCluster {
  cluster_id: string
  cluster_name: string
  kube_version: string
  username: string
}

export default function MyClusterList() {
  const [items, setItems] = useState<MyCluster[]>([])
  const [loading, setLoading] = useState(true)
  const currentClusterId = localStorage.getItem('clusterId') || ''

  const columns: Column<MyCluster>[] = useMemo(() => [
    { key: 'cluster_id', header: '集群ID', render: (c) => <span className="font-mono text-sm">{c.cluster_id}</span> },
    { key: 'cluster_name', header: '名称', render: (c) => <span className="font-medium">{c.cluster_name}</span> },
    { key: 'kube_version', header: '版本', render: (c) => c.kube_version },
    {
      key: 'default', header: '默认集群', render: (c) => (
        c.cluster_id === currentClusterId
          ? <Badge variant="default"><Star size={12} className="mr-1" />当前</Badge>
          : '-'
      ),
    },
    {
      key: 'actions', header: '操作', render: (c) => (
        <Button variant="outline" size="sm" onClick={() => handleSetDefault(c)}>
          <Star size={14} className="mr-1" />设为常用集群
        </Button>
      ),
    },
  ], [currentClusterId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: MyCluster[] }>('/rbac/cluster/MyClusterList')
      setItems(res.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSetDefault = (cluster: MyCluster) => {
    localStorage.setItem('clusterId', cluster.cluster_id)
    toast.success('已设置 ' + cluster.cluster_name + ' 为常用集群')
    fetchData()
  }

  return (
    <div className="space-y-4">
      <PageHeader title="我的集群" />
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 text-sm text-muted-foreground">
        注:需要在权限管理--集群授权,将集群授权到用户以后,这里才会显示。
      </blockquote>
      <Card>
        <CardContent className="p-0">
          <DataTable columns={columns} data={items} loading={loading} emptyMessage="暂无授权集群" />
        </CardContent>
      </Card>
    </div>
  )
}
