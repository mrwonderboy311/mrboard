import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import YamlViewer from '@/components/shared/YamlViewer'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Trash2, Terminal, FileText } from 'lucide-react'
import { toast } from 'sonner'
import type { KubeEvent, ApiResponse } from '@/types'

interface PodDetailData {
  podName: string
  nameSpace: string
  podPhase: string
  podIp: string
  hostIp: string
  nodeName: string
  imgUrl: string
  restartCount: number
  createTime: string
  labels: string
  annotations: string
  containers: ContainerInfo[]
}

interface ContainerInfo {
  name: string
  image: string
  ready: boolean
  restartCount: number
  state: string
}

export default function PodDetail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const podName = params.get('podName') || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&podName=${podName}`

  const [detail, setDetail] = useState<PodDetailData | null>(null)
  const [events, setEvents] = useState<KubeEvent[]>([])
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<PodDetailData>('/mrboard/pod/v1/Detail?' + baseQuery)
      setDetail(data)
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }, [baseQuery])

  const fetchEvents = useCallback(async () => {
    try {
      const data = await api<ApiResponse<KubeEvent[]>>('/mrboard/event/v1/List?' + baseQuery + '&objName=' + podName)
      setEvents(data.data || [])
    } catch { /* may fail */ }
  }, [baseQuery, podName])

  const fetchYaml = useCallback(async () => {
    try {
      const data = await api<any>('/mrboard/pod/v1/Yaml?' + baseQuery)
      setYaml(typeof data === 'string' ? data : data.yaml || JSON.stringify(data, null, 2))
    } catch (err) { toast.error((err as Error).message) }
  }, [baseQuery])

  useEffect(() => {
    if (!podName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchDetail()
  }, [fetchDetail, podName, nameSpace])

  const handleTabChange = (value: string) => {
    if (value === 'events' && events.length === 0) fetchEvents()
    if (value === 'yaml' && !yaml) fetchYaml()
  }

  const handleDelete = async () => {
    try {
      await api('/mrboard/pod/v1/Del?' + baseQuery)
      toast.success('删除成功')
      navigate('/k8s/pod')
    } catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到Pod详情</div>

  const containerColumns: Column<ContainerInfo>[] = [
    { key: 'name', header: '名称', render: (c) => <span className="font-mono text-xs">{c.name}</span> },
    { key: 'image', header: '镜像', render: (c) => <span className="font-mono text-xs break-all">{c.image}</span> },
    { key: 'state', header: '状态', render: (c) => <StatusBadge status={c.state} /> },
    { key: 'restartCount', header: '重启次数', render: (c) => c.restartCount },
  ]

  const eventColumns: Column<KubeEvent>[] = [
    { key: 'eventType', header: '类型', render: (e) => <StatusBadge status={e.eventType} /> },
    { key: 'kind', header: '对象', render: (e) => e.kind },
    { key: 'reason', header: '原因', render: (e) => e.reason },
    { key: 'message', header: '消息', className: 'max-w-lg truncate', render: (e) => <span title={e.message}>{e.message}</span> },
    { key: 'createTime', header: '时间', render: (e) => e.createTime },
  ]

  const infoRows: [string, string][] = [
    ['命名空间', detail.nameSpace],
    ['节点', detail.nodeName],
    ['Pod IP', detail.podIp],
    ['节点 IP', detail.hostIp],
    ['创建时间', detail.createTime],
    ['镜像', detail.imgUrl],
    ['标签', detail.labels],
    ['注解', detail.annotations],
  ]

  return (
    <div className="space-y-4">
      <PageHeader title={podName}>
        <StatusBadge status={detail.podPhase} />
        <Button variant="outline" size="sm" onClick={() => navigate(`/pod/log?clusterId=${clusterId}&nameSpace=${nameSpace}&podName=${podName}`)}>
          <FileText size={14} className="mr-1" />日志
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate(`/pod/terminal?clusterId=${clusterId}&nameSpace=${nameSpace}&podName=${podName}`)}>
          <Terminal size={14} className="mr-1" />终端
        </Button>
        <ConfirmDialog
          trigger={<Button variant="destructive" size="sm"><Trash2 size={14} className="mr-1" />删除</Button>}
          title="确认删除" description={`确定删除 Pod "${podName}"？`}
          variant="destructive" onConfirm={handleDelete}
        />
      </PageHeader>

      <Tabs defaultValue="overview" onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="containers">容器</TabsTrigger>
          <TabsTrigger value="events">事件</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {infoRows.map(([label, value]) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap w-16 shrink-0">{label}</span>
                    <span className="text-sm font-mono break-all">{value || '-'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="containers">
          <DataTable columns={containerColumns} data={detail.containers || []} emptyMessage="暂无容器信息" />
        </TabsContent>

        <TabsContent value="events">
          <DataTable columns={eventColumns} data={events} emptyMessage="暂无事件" />
        </TabsContent>

        <TabsContent value="yaml">
          <Card><CardContent className="py-4">
            <YamlViewer yaml={yaml} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
