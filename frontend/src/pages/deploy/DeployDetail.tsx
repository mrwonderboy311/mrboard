import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import {
  RotateCcw, FileCode, RefreshCw, Trash2, History, Save,
} from 'lucide-react'
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

  // Sub-data states
  const [image, setImage] = useState('')
  const [envData, setEnvData] = useState<Record<string, string>>({})
  const [labelsData, setLabelsData] = useState<Record<string, string>>({})
  const [resourceData, setResourceData] = useState<any>(null)
  const [probeData, setProbeData] = useState<any>(null)
  const [hostData, setHostData] = useState<any[]>([])
  const [lifecycleData, setLifecycleData] = useState<any>(null)
  const [nodeAffinity, setNodeAffinity] = useState('')
  const [podAffinity, setPodAffinity] = useState('')
  const [tolerations, setTolerations] = useState<any[]>([])
  const [replicasets, setReplicasets] = useState<DeployReplicaSet[]>([])
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({})

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<DeployDetailType>('/mrboard/deploy/v1/Detail?' + baseQuery)
      setDetail(data)
      setReplicasets(data.replicasets || [])
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

  const fetchSub = async (key: string, url: string, setter: (v: any) => void) => {
    setSubLoading(prev => ({ ...prev, [key]: true }))
    try {
      const data = await api<any>(url)
      setter(data)
    } catch (err) { toast.error((err as Error).message) }
    finally { setSubLoading(prev => ({ ...prev, [key]: false })) }
  }

  useEffect(() => {
    if (!deployName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchDetail()
    fetchPods()
  }, [fetchDetail, fetchPods, deployName, nameSpace])

  const handleTabChange = (value: string) => {
    if (value === 'events' && events.length === 0) fetchEvents()
    if (value === 'yaml' && !yaml) fetchYaml()
    if (value === 'image' && !image) fetchSub('image', '/mrboard/deploy/v1/Image?' + baseQuery, (d) => setImage(typeof d === 'string' ? d : d.imageUrl || d.image || ''))
    if (value === 'env' && Object.keys(envData).length === 0) fetchSub('env', '/mrboard/deploy/v1/Env?' + baseQuery, setEnvData)
    if (value === 'labels' && Object.keys(labelsData).length === 0) fetchSub('labels', '/mrboard/deploy/v1/Labels?' + baseQuery, setLabelsData)
    if (value === 'resource' && !resourceData) fetchSub('resource', '/mrboard/deploy/v1/Resource?' + baseQuery, setResourceData)
    if (value === 'probe' && !probeData) fetchSub('probe', '/mrboard/deploy/v1/Probe?' + baseQuery, setProbeData)
    if (value === 'host' && hostData.length === 0) fetchSub('host', '/mrboard/deploy/v1/Host?' + baseQuery, setHostData)
    if (value === 'lifecycle' && !lifecycleData) fetchSub('lifecycle', '/mrboard/deploy/v1/Lifecycle?' + baseQuery, setLifecycleData)
    if (value === 'nodeaffinity' && !nodeAffinity) fetchSub('nodeaffinity', '/mrboard/deploy/v1/GetNodeAffinity?' + baseQuery, setNodeAffinity)
    if (value === 'podaffinity' && !podAffinity) fetchSub('podaffinity', '/mrboard/deploy/v1/GetPodAffinity?' + baseQuery, setPodAffinity)
    if (value === 'tolerations' && tolerations.length === 0) fetchSub('tolerations', '/mrboard/deploy/v1/GetTolerations?' + baseQuery, setTolerations)
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

  const handleRollback = async () => {
    const rs = replicasets.length > 0 ? replicasets[replicasets.length - 1] : null
    if (!rs) { toast.error('无可回滚的ReplicaSet'); return }
    try {
      await api('/mrboard/deploy/v1/RollBack?' + baseQuery + '&replicasetName=' + rs.replicasetName)
      toast.success('回滚成功'); fetchDetail()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleDelete = async () => {
    try {
      await api('/mrboard/deploy/v1/Del?' + baseQuery)
      toast.success('删除成功')
      navigate('/deploy/list')
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleSaveSub = async (url: string, body: any, successMsg: string) => {
    try {
      await api(url, { method: 'POST', body: JSON.stringify(body) })
      toast.success(successMsg)
    } catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到应用详情</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{deployName}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate('/deploy/yaml?' + baseQuery)}><FileCode size={14} className="mr-1" />编辑YAML</Button>
        <Button onClick={handleScale}><RotateCcw size={14} className="mr-1" />副本伸缩</Button>
        <Button onClick={handleRestart}><RefreshCw size={14} className="mr-1" />重新部署</Button>
        <Button variant="outline" onClick={handleRollback}><History size={14} className="mr-1" />回滚</Button>
        <Button variant="outline" onClick={() => fetchPods()}><RefreshCw size={14} className="mr-1" />刷新Pod</Button>
        <ConfirmDialog
          trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>}
          title="确认删除"
          description={`确定删除 Deployment "${deployName}"？此操作不可恢复。`}
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['名称', detail.deployName, '创建时间', detail.createTime],
                ['命名空间', detail.nameSpace, '策略', detail.strategy],
                ['滚动升级策略', detail.strategyRollingUpdate, '标签', detail.labels],
                ['选择器', detail.selector, '注解', detail.annotations],
                ['状态', detail.status, '端口', detail.ports],
                ['镜像', detail.imageUrl, '副本数', String(detail.podNumber)],
              ].map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-muted-foreground w-28 whitespace-nowrap">{row[0]}</td>
                  <td className="py-2 pr-8 font-mono text-xs break-all">{row[1] || '-'}</td>
                  <td className="py-2 pr-4 text-muted-foreground w-28 whitespace-nowrap">{row[2]}</td>
                  <td className="py-2 font-mono text-xs break-all">{row[3] || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {detail.conditions && detail.conditions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">状态条件</h4>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="pods" onValueChange={handleTabChange}>
        <TabsList variant="line" className="flex-wrap">
          <TabsTrigger value="pods">容器组</TabsTrigger>
          <TabsTrigger value="image">镜像</TabsTrigger>
          <TabsTrigger value="env">环境变量</TabsTrigger>
          <TabsTrigger value="labels">标签</TabsTrigger>
          <TabsTrigger value="resource">资源限制</TabsTrigger>
          <TabsTrigger value="probe">探针</TabsTrigger>
          <TabsTrigger value="host">主机别名</TabsTrigger>
          <TabsTrigger value="lifecycle">生命周期</TabsTrigger>
          <TabsTrigger value="nodeaffinity">节点亲和</TabsTrigger>
          <TabsTrigger value="podaffinity">Pod亲和</TabsTrigger>
          <TabsTrigger value="tolerations">容忍</TabsTrigger>
          <TabsTrigger value="replicasets">ReplicaSet</TabsTrigger>
          <TabsTrigger value="events">事件</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        {/* Pods */}
        <TabsContent value="pods">
          <Card><CardContent className="p-0">
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
          </CardContent></Card>
        </TabsContent>

        {/* Image */}
        <TabsContent value="image">
          <Card><CardContent className="space-y-4 py-4">
            {subLoading.image ? <div className="text-muted-foreground">加载中...</div> : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-16">镜像:</span>
                  <Input value={image || detail.imageUrl} onChange={e => setImage(e.target.value)} className="flex-1" />
                </div>
                <Button onClick={() => handleSaveSub('/mrboard/deploy/v1/Image?' + baseQuery, { imageUrl: image || detail.imageUrl }, '镜像更新成功')}>
                  <Save size={14} className="mr-1" />更新镜像
                </Button>
              </>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Env */}
        <TabsContent value="env">
          <Card><CardContent className="space-y-4 py-4">
            {subLoading.env ? <div className="text-muted-foreground">加载中...</div> : (
              <>
                <KeyValueEditor value={envData} onChange={setEnvData} keyPlaceholder="变量名" valuePlaceholder="变量值" />
                <Button onClick={() => handleSaveSub('/mrboard/deploy/v1/UpdateEnv?' + baseQuery, envData, '环境变量更新成功')}>
                  <Save size={14} className="mr-1" />保存环境变量
                </Button>
              </>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Labels */}
        <TabsContent value="labels">
          <Card><CardContent className="space-y-4 py-4">
            {subLoading.labels ? <div className="text-muted-foreground">加载中...</div> : (
              <>
                <KeyValueEditor value={labelsData} onChange={setLabelsData} />
                <Button onClick={() => handleSaveSub('/mrboard/deploy/v1/Labels?' + baseQuery, labelsData, '标签更新成功')}>
                  <Save size={14} className="mr-1" />保存标签
                </Button>
              </>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* Resource */}
        <TabsContent value="resource">
          <Card><CardContent className="py-4">
            {subLoading.resource ? <div className="text-muted-foreground">加载中...</div> : resourceData ? (
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">{JSON.stringify(resourceData, null, 2)}</pre>
            ) : <div className="text-muted-foreground">暂无资源限制数据</div>}
          </CardContent></Card>
        </TabsContent>

        {/* Probe */}
        <TabsContent value="probe">
          <Card><CardContent className="py-4">
            {subLoading.probe ? <div className="text-muted-foreground">加载中...</div> : probeData ? (
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">{JSON.stringify(probeData, null, 2)}</pre>
            ) : <div className="text-muted-foreground">暂无探针数据</div>}
          </CardContent></Card>
        </TabsContent>

        {/* Host */}
        <TabsContent value="host">
          <Card><CardContent className="py-4">
            {subLoading.host ? <div className="text-muted-foreground">加载中...</div> : hostData.length > 0 ? (
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">{JSON.stringify(hostData, null, 2)}</pre>
            ) : <div className="text-muted-foreground">暂无主机别名</div>}
          </CardContent></Card>
        </TabsContent>

        {/* Lifecycle */}
        <TabsContent value="lifecycle">
          <Card><CardContent className="py-4">
            {subLoading.lifecycle ? <div className="text-muted-foreground">加载中...</div> : lifecycleData ? (
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">{JSON.stringify(lifecycleData, null, 2)}</pre>
            ) : <div className="text-muted-foreground">暂无生命周期配置</div>}
          </CardContent></Card>
        </TabsContent>

        {/* Node Affinity */}
        <TabsContent value="nodeaffinity">
          <Card><CardContent className="py-4">
            {subLoading.nodeaffinity ? <div className="text-muted-foreground">加载中...</div> : nodeAffinity ? (
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">{typeof nodeAffinity === 'string' ? nodeAffinity : JSON.stringify(nodeAffinity, null, 2)}</pre>
            ) : <div className="text-muted-foreground">暂无节点亲和性配置</div>}
          </CardContent></Card>
        </TabsContent>

        {/* Pod Affinity */}
        <TabsContent value="podaffinity">
          <Card><CardContent className="py-4">
            {subLoading.podaffinity ? <div className="text-muted-foreground">加载中...</div> : podAffinity ? (
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">{typeof podAffinity === 'string' ? podAffinity : JSON.stringify(podAffinity, null, 2)}</pre>
            ) : <div className="text-muted-foreground">暂无Pod亲和性配置</div>}
          </CardContent></Card>
        </TabsContent>

        {/* Tolerations */}
        <TabsContent value="tolerations">
          <Card><CardContent className="py-4">
            {subLoading.tolerations ? <div className="text-muted-foreground">加载中...</div> : tolerations.length > 0 ? (
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">{JSON.stringify(tolerations, null, 2)}</pre>
            ) : <div className="text-muted-foreground">暂无容忍配置</div>}
          </CardContent></Card>
        </TabsContent>

        {/* ReplicaSets */}
        <TabsContent value="replicasets">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>名称</TableHead><TableHead>镜像</TableHead><TableHead>创建时间</TableHead><TableHead>操作</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {replicasets.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">暂无ReplicaSet</TableCell></TableRow>
                : replicasets.map(rs => (
                  <TableRow key={rs.replicasetName}>
                    <TableCell className="font-mono text-xs">{rs.replicasetName}</TableCell>
                    <TableCell className="font-mono text-xs">{rs.imageUrl}</TableCell>
                    <TableCell className="whitespace-nowrap">{rs.createTime}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={async () => {
                        try { await api('/mrboard/deploy/v1/RollBack?' + baseQuery + '&replicasetName=' + rs.replicasetName); toast.success('回滚成功'); fetchDetail() }
                        catch (err) { toast.error((err as Error).message) }
                      }}>回滚</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
