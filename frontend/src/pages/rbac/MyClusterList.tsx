import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Star } from 'lucide-react'
import { toast } from 'sonner'

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的k8s集群</h1>
      </div>
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 text-sm text-muted-foreground">
        注:需要在权限管理--集群授权,将集群授权到用户以后,这里才会显示。
      </blockquote>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>集群ID</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>默认集群</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无授权集群</TableCell></TableRow>
              ) : items.map(c => (
                <TableRow key={c.cluster_id}>
                  <TableCell className="font-mono text-sm">{c.cluster_id}</TableCell>
                  <TableCell className="font-medium">{c.cluster_name}</TableCell>
                  <TableCell>{c.kube_version}</TableCell>
                  <TableCell>
                    {c.cluster_id === currentClusterId ? (
                      <Badge variant="default"><Star size={12} className="mr-1" />当前</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleSetDefault(c)}>
                      <Star size={14} className="mr-1" />设为常用集群
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
