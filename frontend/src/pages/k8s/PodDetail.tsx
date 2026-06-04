import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{podName}</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>返回</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate(`/pod/log?clusterId=${clusterId}&nameSpace=${nameSpace}&podName=${podName}`)}>
          <FileText size={14} className="mr-1" />查看日志
        </Button>
        <Button onClick={() => navigate(`/pod/terminal?clusterId=${clusterId}&nameSpace=${nameSpace}&podName=${podName}`)}>
          <Terminal size={14} className="mr-1" />终端
        </Button>
        <ConfirmDialog
          trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>}
          title="确认删除" description={`确定删除 Pod "${podName}"？`}
          variant="destructive" onConfirm={handleDelete}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['名称', detail.podName, '命名空间', detail.nameSpace],
                ['状态', detail.podPhase, 'Pod IP', detail.podIp],
                ['节点', detail.nodeName, '节点 IP', detail.hostIp],
                ['镜像', detail.imgUrl, '重启次数', String(detail.restartCount)],
                ['标签', detail.labels, '创建时间', detail.createTime],
              ].map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-muted-foreground w-24 whitespace-nowrap">{row[0]}</td>
                  <td className="py-2 pr-8 font-mono text-xs break-all">{row[1] || '-'}</td>
                  <td className="py-2 pr-4 text-muted-foreground w-24 whitespace-nowrap">{row[2]}</td>
                  <td className="py-2 font-mono text-xs break-all">{row[3] || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Tabs defaultValue="containers" onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="containers">容器</TabsTrigger>
          <TabsTrigger value="events">事件</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        <TabsContent value="containers">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>名称</TableHead><TableHead>镜像</TableHead><TableHead>状态</TableHead><TableHead>就绪</TableHead><TableHead>重启</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(detail.containers || []).length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无容器信息</TableCell></TableRow>
                : (detail.containers || []).map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.image}</TableCell>
                    <TableCell><Badge variant={c.state === 'running' ? 'default' : 'secondary'}>{c.state}</Badge></TableCell>
                    <TableCell><Badge variant={c.ready ? 'default' : 'destructive'}>{c.ready ? '是' : '否'}</Badge></TableCell>
                    <TableCell>{c.restartCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="events">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>类型</TableHead><TableHead>对象</TableHead><TableHead>消息</TableHead><TableHead>原因</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {events.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">暂无事件</TableCell></TableRow>
                : events.map((evt, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant={evt.eventType === 'Normal' ? 'default' : 'destructive'}>{evt.eventType}</Badge></TableCell>
                    <TableCell>{evt.kind}</TableCell>
                    <TableCell className="max-w-lg truncate" title={evt.message}>{evt.message}</TableCell>
                    <TableCell>{evt.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
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
