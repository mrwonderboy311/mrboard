import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import YamlViewer from '@/components/shared/YamlViewer'
import KeyValueEditor from '@/components/shared/KeyValueEditor'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { RotateCcw, Trash2, Save, History } from 'lucide-react'
import { toast } from 'sonner'
import type { Pod, KubeEvent, ApiResponse } from '@/types'

export default function StatefulSetDetail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const stsName = params.get('stsName') || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&stsName=${stsName}`

  const [detail, setDetail] = useState<any>(null)
  const [pods, setPods] = useState<Pod[]>([])
  const [events, setEvents] = useState<KubeEvent[]>([])
  const [yaml, setYaml] = useState('')
  const [image, setImage] = useState('')
  const [envData, setEnvData] = useState<Record<string, string>>({})
  const [labelsData, setLabelsData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({})

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try { setDetail(await api<any>('/mrboard/sts/v1/Detail?' + baseQuery)) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }, [baseQuery])

  const fetchPods = useCallback(async () => {
    try {
      const data = await api<ApiResponse<Pod[]>>('/mrboard/pod/v1/List?' + baseQuery + '&resType=statefulset&resName=' + stsName)
      setPods(data.data || [])
    } catch { /* may fail */ }
  }, [baseQuery, stsName])

  const fetchSub = async (key: string, url: string, setter: (v: any) => void) => {
    setSubLoading(prev => ({ ...prev, [key]: true }))
    try { setter(await api<any>(url)) }
    catch (err) { toast.error((err as Error).message) }
    finally { setSubLoading(prev => ({ ...prev, [key]: false })) }
  }

  useEffect(() => {
    if (!stsName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchDetail(); fetchPods()
  }, [fetchDetail, fetchPods, stsName, nameSpace])

  const handleTabChange = (value: string) => {
    if (value === 'events' && events.length === 0) fetchSub('events', '/mrboard/event/v1/List?' + baseQuery + '&objName=' + stsName, (d) => setEvents(d.data || []))
    if (value === 'yaml' && !yaml) fetchSub('yaml', '/mrboard/sts/v1/Yaml?' + baseQuery, setYaml)
    if (value === 'image' && !image) fetchSub('image', '/mrboard/sts/v1/Image?' + baseQuery, (d) => setImage(typeof d === 'string' ? d : d.imageUrl || d.image || ''))
    if (value === 'env' && Object.keys(envData).length === 0) fetchSub('env', '/mrboard/sts/v1/GetEnv?' + baseQuery, setEnvData)
    if (value === 'labels' && Object.keys(labelsData).length === 0) fetchSub('labels', '/mrboard/sts/v1/Labels?' + baseQuery, setLabelsData)
  }

  const handleRestart = async () => {
    try { await api('/mrboard/sts/v1/Restart?' + baseQuery); toast.success('重启成功') }
    catch (err) { toast.error((err as Error).message) }
  }

  const handleScale = async () => {
    const val = prompt('请输入副本数量', String(detail?.replicas || 0))
    if (val === null) return
    const num = parseInt(val, 10)
    if (isNaN(num) || num < 0) { toast.error('请输入有效的副本数量'); return }
    try {
      await api('/mrboard/sts/v1/Replicas?' + baseQuery, { method: 'POST', body: JSON.stringify({ podNumber: num }) })
      toast.success('伸缩成功'); fetchDetail()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleRollback = async () => {
    try { await api('/mrboard/sts/v1/RollBack?' + baseQuery); toast.success('回滚成功'); fetchDetail() }
    catch (err) { toast.error((err as Error).message) }
  }

  const handleDelete = async () => {
    try { await api('/mrboard/sts/v1/Del?' + baseQuery); toast.success('删除成功'); navigate('/k8s/statefulset') }
    catch (err) { toast.error((err as Error).message) }
  }

  const handleSaveSub = async (url: string, body: any, msg: string) => {
    try { await api(url, { method: 'POST', body: JSON.stringify(body) }); toast.success(msg) }
    catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到StatefulSet详情</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{stsName}</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>返回</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleScale}><RotateCcw size={14} className="mr-1" />副本伸缩</Button>
        <Button onClick={handleRestart}><RotateCcw size={14} className="mr-1" />重启</Button>
        <Button variant="outline" onClick={handleRollback}><History size={14} className="mr-1" />回滚</Button>
        <ConfirmDialog trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>} title="确认删除" description={`确定删除 StatefulSet "${stsName}"？`} variant="destructive" onConfirm={handleDelete} />
      </div>
      <Card><CardHeader><CardTitle>基本信息</CardTitle></CardHeader><CardContent>
        <table className="w-full text-sm"><tbody>
          {[
            ['名称', detail.stsName || stsName, '命名空间', nameSpace],
            ['副本数', String(detail.replicas || ''), '策略', detail.strategy || ''],
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
        <TabsList variant="line" className="flex-wrap">
          <TabsTrigger value="pods">容器组</TabsTrigger>
          <TabsTrigger value="image">镜像</TabsTrigger>
          <TabsTrigger value="env">环境变量</TabsTrigger>
          <TabsTrigger value="labels">标签</TabsTrigger>
          <TabsTrigger value="events">事件</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>
        <TabsContent value="pods"><Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>名称</TableHead><TableHead>状态</TableHead><TableHead>重启</TableHead><TableHead>Pod IP</TableHead><TableHead>节点</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
          <TableBody>{pods.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无容器组</TableCell></TableRow>
          : pods.map(pod => (<TableRow key={pod.podName}>
            <TableCell className="font-mono text-xs">{pod.podName}</TableCell>
            <TableCell><Badge variant={pod.podPhase === 'Running' ? 'default' : 'destructive'}>{pod.podPhase}</Badge></TableCell>
            <TableCell>{pod.restartCount}</TableCell><TableCell className="font-mono text-xs">{pod.podIp}</TableCell><TableCell className="font-mono text-xs">{pod.hostIp}</TableCell>
            <TableCell><div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => navigate(`/pod/detail?clusterId=${clusterId}&nameSpace=${pod.nameSpace}&podName=${pod.podName}`)}>详情</Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/pod/log?clusterId=${clusterId}&nameSpace=${pod.nameSpace}&podName=${pod.podName}`)}>日志</Button>
            </div></TableCell>
          </TableRow>))}</TableBody>
        </Table></CardContent></Card></TabsContent>
        <TabsContent value="image"><Card><CardContent className="space-y-4 py-4">
          {subLoading.image ? <div className="text-muted-foreground">加载中...</div> : (<>
            <Input value={image || detail.imageUrl || ''} onChange={e => setImage(e.target.value)} placeholder="镜像地址" />
            <Button onClick={() => handleSaveSub('/mrboard/sts/v1/Image?' + baseQuery, { imageUrl: image }, '镜像更新成功')}><Save size={14} className="mr-1" />更新镜像</Button>
          </>)}
        </CardContent></Card></TabsContent>
        <TabsContent value="env"><Card><CardContent className="space-y-4 py-4">
          {subLoading.env ? <div className="text-muted-foreground">加载中...</div> : (<>
            <KeyValueEditor value={envData} onChange={setEnvData} keyPlaceholder="变量名" valuePlaceholder="变量值" />
            <Button onClick={() => handleSaveSub('/mrboard/sts/v1/UpdateEnv?' + baseQuery, envData, '环境变量更新成功')}><Save size={14} className="mr-1" />保存</Button>
          </>)}
        </CardContent></Card></TabsContent>
        <TabsContent value="labels"><Card><CardContent className="space-y-4 py-4">
          {subLoading.labels ? <div className="text-muted-foreground">加载中...</div> : (<>
            <KeyValueEditor value={labelsData} onChange={setLabelsData} />
            <Button onClick={() => handleSaveSub('/mrboard/sts/v1/Labels?' + baseQuery, labelsData, '标签更新成功')}><Save size={14} className="mr-1" />保存</Button>
          </>)}
        </CardContent></Card></TabsContent>
        <TabsContent value="events"><Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>类型</TableHead><TableHead>消息</TableHead><TableHead>原因</TableHead></TableRow></TableHeader>
          <TableBody>{events.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">暂无事件</TableCell></TableRow>
          : events.map((e, i) => (<TableRow key={i}>
            <TableCell><Badge variant={e.eventType === 'Normal' ? 'default' : 'destructive'}>{e.eventType}</Badge></TableCell>
            <TableCell className="max-w-lg truncate">{e.message}</TableCell><TableCell>{e.reason}</TableCell>
          </TableRow>))}</TableBody>
        </Table></CardContent></Card></TabsContent>
        <TabsContent value="yaml"><Card><CardContent className="py-4">
          <YamlViewer yaml={typeof yaml === 'string' ? yaml : JSON.stringify(yaml, null, 2)} onUpdateUrl={'/mrboard/sts/v1/ModifyByYaml?' + baseQuery} onUpdated={fetchDetail} />
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  )
}
