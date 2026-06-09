import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { Star, Server } from 'lucide-react'
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
    {
      key: 'cluster_name', header: '名称', className: 'font-medium', render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Server size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{c.cluster_name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-mono truncate">{c.cluster_id}</span>
              <span className="text-[10px] text-muted-foreground truncate">{c.kube_version}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'default', header: '默认集群', render: (c) => (
        c.cluster_id === currentClusterId
          ? <Badge variant="default"><Star size={12} className="mr-1" />当前</Badge>
          : '-'
      ),
    },
    {
      key: 'actions', header: '', render: (c) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="设为常用集群"
            onClick={() => handleSetDefault(c)}>
            <Star size={15} />
          </Button>
        </div>
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
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="我的集群" eyebrow="RBAC" />
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 text-sm text-muted-foreground">
        注:需要在权限管理--集群授权,将集群授权到用户以后,这里才会显示。
      </blockquote>
      <DataTable columns={columns} data={items} loading={loading} emptyMessage="暂无授权集群" variant="cards" />
    </div>
  )
}
