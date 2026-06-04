import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import YamlViewer from '@/components/shared/YamlViewer'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Pod, KubeEvent, ApiResponse } from '@/types'

export default function DaemonSetDetail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const dsName = params.get('dsName') || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&dsName=${dsName}`

  const [detail, setDetail] = useState<any>(null)
  const [pods, setPods] = useState<Pod[]>([])
  const [events, setEvents] = useState<KubeEvent[]>([])
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(true)
  const [, setSubLoading] = useState<Record<string, boolean>>({})

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try { setDetail(await api<any>('/mrboard/ds/v1/Detail?' + baseQuery)) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }, [baseQuery])

  const fetchPods = useCallback(async () => {
    try {
      const data = await api<ApiResponse<Pod[]>>('/mrboard/pod/v1/List?' + baseQuery + '&resType=daemonset&resName=' + dsName)
      setPods(data.data || [])
    } catch { /* may fail */ }
  }, [baseQuery, dsName])

  const fetchSub = async (key: string, url: string, setter: (v: any) => void) => {
    setSubLoading(prev => ({ ...prev, [key]: true }))
    try { setter(await api<any>(url)) }
    catch (err) { toast.error((err as Error).message) }
    finally { setSubLoading(prev => ({ ...prev, [key]: false })) }
  }

  useEffect(() => {
    if (!dsName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchDetail(); fetchPods()
  }, [fetchDetail, fetchPods, dsName, nameSpace])

  const handleTabChange = (value: string) => {
    if (value === 'events' && events.length === 0) fetchSub('events', '/mrboard/event/v1/List?' + baseQuery + '&objName=' + dsName, (d) => setEvents(d.data || []))
    if (value === 'yaml' && !yaml) fetchSub('yaml', '/mrboard/ds/v1/Yaml?' + baseQuery, setYaml)
  }

  const handleDelete = async () => {
    try { await api('/mrboard/ds/v1/Del?' + baseQuery); toast.success('删除成功'); navigate('/k8s/daemonset') }
    catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到DaemonSet详情</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{dsName}</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>返回</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <ConfirmDialog trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>} title="确认删除" description={`确定删除 DaemonSet "${dsName}"？`} variant="destructive" onConfirm={handleDelete} />
      </div>
      <Card><CardHeader><CardTitle>基本信息</CardTitle></CardHeader><CardContent>
        <table className="w-full text-sm"><tbody>
          {[
            ['名称', detail.dsName || dsName, '命名空间', nameSpace],
            ['镜像', detail.imageUrl || '', '创建时间', detail.createTime || ''],
            ['标签', detail.labels || '', '选择器', detail.selector || ''],
          ].map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 pr-4 text-muted-foreground w-28 whitespace-nowrap">{row[0]}</td>
              <td className="py-2 pr-8 font-mono text-xs break-all">{row[1] || '-'}</td>
              <td className="py-2 pr-4 text-muted-foreground w-28 whitespace-nowrap">{row[2]}</td>
              <td className="py-2 font-mono text-xs break-all">{row[3] || '-'}</td>
            </tr>
          ))}
        </tbody></table>
      </CardContent></Card>
      <Tabs defaultValue="pods" onValueChange={handleTabChange}>
        <TabsList variant="line"><TabsTrigger value="pods">容器组</TabsTrigger><TabsTrigger value="events">事件</TabsTrigger><TabsTrigger value="yaml">YAML</TabsTrigger></TabsList>
        <TabsContent value="pods"><Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>名称</TableHead><TableHead>状态</TableHead><TableHead>重启</TableHead><TableHead>Pod IP</TableHead><TableHead>节点</TableHead></TableRow></TableHeader>
          <TableBody>{pods.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无容器组</TableCell></TableRow>
          : pods.map(pod => (<TableRow key={pod.podName}>
            <TableCell className="font-mono text-xs">{pod.podName}</TableCell>
            <TableCell><Badge variant={pod.podPhase === 'Running' ? 'default' : 'destructive'}>{pod.podPhase}</Badge></TableCell>
            <TableCell>{pod.restartCount}</TableCell><TableCell className="font-mono text-xs">{pod.podIp}</TableCell><TableCell className="font-mono text-xs">{pod.hostIp}</TableCell>
          </TableRow>))}</TableBody>
        </Table></CardContent></Card></TabsContent>
        <TabsContent value="events"><Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>类型</TableHead><TableHead>消息</TableHead><TableHead>原因</TableHead></TableRow></TableHeader>
          <TableBody>{events.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">暂无事件</TableCell></TableRow>
          : events.map((e, i) => (<TableRow key={i}>
            <TableCell><Badge variant={e.eventType === 'Normal' ? 'default' : 'destructive'}>{e.eventType}</Badge></TableCell>
            <TableCell className="max-w-lg truncate">{e.message}</TableCell><TableCell>{e.reason}</TableCell>
          </TableRow>))}</TableBody>
        </Table></CardContent></Card></TabsContent>
        <TabsContent value="yaml"><Card><CardContent className="py-4">
          <YamlViewer yaml={typeof yaml === 'string' ? yaml : JSON.stringify(yaml, null, 2)} onUpdateUrl={'/mrboard/ds/v1/ModifyByYaml?' + baseQuery} onUpdated={fetchDetail} />
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  )
}
