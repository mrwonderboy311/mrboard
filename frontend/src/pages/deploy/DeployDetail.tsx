import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import YamlViewer from '@/components/shared/YamlViewer'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { FileCode, RefreshCw, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { DeployDetail as DeployDetailType, Pod, KubeEvent, DeployReplicaSet, ApiResponse } from '@/types'

export default function DeployDetail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const deployName = params.get('deployName') || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&deployName=${deployName}`

  const [detail, setDetail] = useState<DeployDetailType | null>(null)
  const [pods, setPods] = useState<Pod[]>([])
  const [events, setEvents] = useState<KubeEvent[]>([])
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(true)
  const [resourceData, setResourceData] = useState<any>(null)
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({})

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<DeployDetailType>('/mrboard/deploy/v1/Detail?' + baseQuery)
      setDetail(data)
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }, [baseQuery])

  const fetchPods = useCallback(async () => {
    try {
      const data = await api<ApiResponse<Pod[]>>('/mrboard/pod/v1/List?' + baseQuery + '&resType=deploy&resName=' + deployName)
      setPods(data.data || [])
    } catch { /* may fail temporarily */ }
  }, [baseQuery, deployName])

  const fetchEvents = useCallback(async () => {
    try {
      const data = await api<ApiResponse<KubeEvent[]>>('/mrboard/event/v1/List?' + baseQuery + '&objName=' + deployName)
      setEvents(data.data || [])
    } catch { /* may fail */ }
  }, [baseQuery, deployName])

  const fetchYaml = useCallback(async () => {
    try {
      const data = await api<any>('/mrboard/deploy/v1/Yaml?' + baseQuery)
      setYaml(typeof data === 'string' ? data : data.yaml || JSON.stringify(data, null, 2))
    } catch (err) { toast.error((err as Error).message) }
  }, [baseQuery])

  const fetchResource = useCallback(async () => {
    setSubLoading(prev => ({ ...prev, resource: true }))
    try {
      const data = await api<any>('/mrboard/deploy/v1/Resource?' + baseQuery)
      setResourceData(data)
    } catch (err) { toast.error((err as Error).message) }
    finally { setSubLoading(prev => ({ ...prev, resource: false })) }
  }, [baseQuery])

  useEffect(() => {
    if (!deployName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchDetail()
    fetchPods()
    fetchResource()
  }, [fetchDetail, fetchPods, fetchResource, deployName, nameSpace])

  const handleTabChange = (value: string) => {
    if (value === 'events' && events.length === 0) fetchEvents()
    if (value === 'yaml' && !yaml) fetchYaml()
  }

  const handleRestart = async () => {
    try { await api('/mrboard/deploy/v1/Restart?' + baseQuery); toast.success('重启成功') }
    catch (err) { toast.error((err as Error).message) }
  }

  const handleScale = async () => {
    const val = prompt('请输入副本数量', String(detail?.podNumber || 0))
    if (val === null) return
    const num = parseInt(val, 10)
    if (isNaN(num) || num < 0) { toast.error('请输入有效的副本数量'); return }
    try {
      await api('/mrboard/deploy/v1/Replicas?' + baseQuery, { method: 'POST', body: JSON.stringify({ podNumber: num }) })
      toast.success('伸缩成功'); fetchDetail()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleDelete = async () => {
    try {
      await api('/mrboard/deploy/v1/Del?' + baseQuery)
      toast.success('删除成功')
      navigate('/deploy/list')
    } catch (err) { toast.error((err as Error).message) }
  }

  const rsColumns: Column<DeployReplicaSet>[] = [
    { key: 'name', header: '名称', render: (rs) => <span className="font-mono text-xs">{rs.replicasetName}</span> },
    { key: 'image', header: '镜像', render: (rs) => <span className="font-mono text-xs">{rs.imageUrl}</span> },
    { key: 'createTime', header: '创建时间', render: (rs) => <span className="whitespace-nowrap text-sm text-muted-foreground">{rs.createTime}</span> },
    {
      key: 'actions', header: '操作', className: 'w-24',
      render: (rs) => (
        <Button variant="outline" size="sm" onClick={async () => {
          try { await api('/mrboard/deploy/v1/RollBack?' + baseQuery + '&replicasetName=' + rs.replicasetName); toast.success('回滚成功'); fetchDetail() }
          catch (err) { toast.error((err as Error).message) }
        }}>回滚</Button>
      ),
    },
  ]

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到应用详情</div>

  return (
    <div className="space-y-4">
      <PageHeader title={deployName}>
        <StatusBadge status={detail.status} />
        <Button variant="outline" onClick={() => navigate('/deploy/yaml?' + baseQuery)}>
          <FileCode size={14} className="mr-1" />编辑YAML
        </Button>
        <Button variant="outline" onClick={handleRestart}>
          <RefreshCw size={14} className="mr-1" />重启
        </Button>
        <Button variant="outline" onClick={handleScale}>
          <RotateCcw size={14} className="mr-1" />伸缩
        </Button>
        <ConfirmDialog
          trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>}
          title="确认删除"
          description={`确定删除 Deployment "${deployName}"？此操作不可恢复。`}
          variant="destructive"
          onConfirm={handleDelete}
        />
      </PageHeader>

      <Tabs defaultValue="overview" onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="replicasets">ReplicaSet</TabsTrigger>
          <TabsTrigger value="events">事件</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 pr-4 text-muted-foreground w-28 whitespace-nowrap">命名空间</td>
                      <td className="py-2 pr-8 font-mono text-xs">{detail.nameSpace || '-'}</td>
                      <td className="py-2 pr-4 text-muted-foreground w-28 whitespace-nowrap">策略</td>
                      <td className="py-2 font-mono text-xs">{detail.strategy || '-'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">副本数</td>
                      <td className="py-2 pr-8 font-mono text-xs">{String(detail.podNumber)}</td>
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">创建时间</td>
                      <td className="py-2 font-mono text-xs">{detail.createTime || '-'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">滚动升级策略</td>
                      <td className="py-2 pr-8 font-mono text-xs">{detail.strategyRollingUpdate || '-'}</td>
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">选择器</td>
                      <td className="py-2 font-mono text-xs">{detail.selector || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Container Info */}
            <Card>
              <CardHeader><CardTitle>容器信息</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 pr-4 text-muted-foreground w-28 whitespace-nowrap">镜像</td>
                      <td className="py-2 font-mono text-xs break-all">{detail.imageUrl || '-'}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">端口</td>
                      <td className="py-2 font-mono text-xs">{detail.ports || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">资源限制</td>
                      <td className="py-2 font-mono text-xs">
                        {subLoading.resource ? (
                          <span className="text-muted-foreground">加载中...</span>
                        ) : resourceData ? (
                          <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-auto max-h-[200px]">{JSON.stringify(resourceData, null, 2)}</pre>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Labels and Annotations */}
            <Card>
              <CardHeader><CardTitle>标签和注解</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 pr-4 text-muted-foreground w-28 whitespace-nowrap">标签</td>
                      <td className="py-2 font-mono text-xs break-all">{detail.labels || '-'}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">注解</td>
                      <td className="py-2 font-mono text-xs break-all">{detail.annotations || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Conditions */}
            {detail.conditions && detail.conditions.length > 0 && (
              <Card>
                <CardHeader><CardTitle>状态条件</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>类型</TableHead><TableHead>状态</TableHead><TableHead>更新时间</TableHead><TableHead>原因</TableHead><TableHead>消息</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {detail.conditions.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>{c.ctype}</TableCell>
                          <TableCell><Badge variant={c.status === 'True' ? 'default' : 'secondary'}>{c.status}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap">{c.lastUpdateTime}</TableCell>
                          <TableCell>{c.reason}</TableCell>
                          <TableCell className="max-w-sm truncate" title={c.message}>{c.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Pods */}
            <Card>
              <CardHeader><CardTitle>容器组</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>名称</TableHead><TableHead>状态</TableHead><TableHead>重启</TableHead><TableHead>Pod IP</TableHead><TableHead>节点</TableHead><TableHead>内存</TableHead><TableHead>CPU</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {pods.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无容器组</TableCell></TableRow>
                    : pods.map(pod => (
                      <TableRow key={pod.podName}>
                        <TableCell className="font-mono text-xs">{pod.podName}</TableCell>
                        <TableCell><Badge variant={pod.podPhase === 'Running' ? 'default' : 'destructive'}>{pod.podPhase}</Badge></TableCell>
                        <TableCell>{pod.restartCount}</TableCell>
                        <TableCell className="font-mono text-xs">{pod.podIp}</TableCell>
                        <TableCell className="font-mono text-xs">{pod.hostIp}</TableCell>
                        <TableCell>{pod.memUsage}</TableCell>
                        <TableCell>{pod.cpuUsage}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{pod.createTime}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/pod/detail?clusterId=${clusterId}&nameSpace=${pod.nameSpace}&podName=${pod.podName}`)}>详情</Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/pod/log?clusterId=${clusterId}&nameSpace=${pod.nameSpace}&podName=${pod.podName}`)}>日志</Button>
                            <Button variant="outline" size="sm" onClick={() => navigate(`/pod/terminal?clusterId=${clusterId}&nameSpace=${pod.nameSpace}&podName=${pod.podName}`)}>终端</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ReplicaSets */}
        <TabsContent value="replicasets">
          <Card><CardContent className="p-0">
            <DataTable<DeployReplicaSet>
              columns={rsColumns}
              data={detail.replicasets || []}
              emptyMessage="暂无ReplicaSet"
            />
          </CardContent></Card>
        </TabsContent>

        {/* Events */}
        <TabsContent value="events">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-24">类型</TableHead><TableHead>对象</TableHead><TableHead>名称</TableHead><TableHead>消息</TableHead><TableHead>原因</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {events.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无事件</TableCell></TableRow>
                : events.map((evt, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant={evt.eventType === 'Normal' ? 'default' : 'destructive'}>{evt.eventType}</Badge></TableCell>
                    <TableCell>{evt.kind}</TableCell>
                    <TableCell className="font-mono text-xs">{evt.objName}</TableCell>
                    <TableCell className="max-w-lg truncate" title={evt.message}>{evt.message}</TableCell>
                    <TableCell>{evt.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* YAML */}
        <TabsContent value="yaml">
          <Card><CardContent className="py-4">
            <YamlViewer yaml={yaml} onUpdateUrl={'/mrboard/deploy/v1/ModifyByYaml?' + baseQuery} onUpdated={fetchDetail} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
