import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable } from '@/components/shared/DataTable'
import YamlViewer from '@/components/shared/YamlViewer'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Trash2, Droplets, FileCode } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { Pod, KubeEvent } from '@/types'
import type { Column } from '@/components/shared/DataTable'

interface NodeDetailData {
  nodeName: string
  status: string
  roles: string
  kubeletVersion: string
  os: string
  kernelVersion: string
  containerRuntime: string
  cpuCapacity: string
  memCapacity: string
  cpuAllocated: string
  memAllocated: string
  internalIp: string
  externalIp: string
  createTime: string
  taints: string
  labels: Record<string, string>
}

const podColumns: Column<Pod>[] = [
  { key: 'podName', header: 'Pod名称', render: (p) => <span className="font-mono text-xs">{p.podName}</span> },
  { key: 'nameSpace', header: '命名空间', render: (p) => p.nameSpace },
  { key: 'podPhase', header: '状态', render: (p) => <StatusBadge status={p.podPhase} /> },
  { key: 'podIp', header: 'Pod IP', render: (p) => <span className="font-mono text-xs">{p.podIp}</span> },
  { key: 'restartCount', header: '重启次数', render: (p) => p.restartCount },
  { key: 'createTime', header: '创建时间', render: (p) => p.createTime },
]

function parsePercent(val: string | undefined): number {
  if (!val) return 0
  const num = parseFloat(val)
  return isNaN(num) ? 0 : Math.min(100, num)
}

export default function NodeDetail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nodeName = params.get('nodeName') || ''
  const baseQuery = `clusterId=${clusterId}&nodeName=${nodeName}`

  const [detail, setDetail] = useState<NodeDetailData | null>(null)
  const [yaml, setYaml] = useState('')
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [taints, setTaints] = useState<any[]>([])
  const [allocated, setAllocated] = useState<any>(null)
  const [pods, setPods] = useState<Pod[]>([])
  const [events, setEvents] = useState<KubeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({})

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<NodeDetailData>('/mrboard/node/v1/Detail?' + baseQuery)
      setDetail(data)
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }, [baseQuery])

  const fetchSub = async (key: string, url: string, setter: (v: any) => void) => {
    setSubLoading(prev => ({ ...prev, [key]: true }))
    try { setter(await api<any>(url)) }
    catch (err) { toast.error((err as Error).message) }
    finally { setSubLoading(prev => ({ ...prev, [key]: false })) }
  }

  useEffect(() => {
    if (!nodeName) { toast.error('缺少必要参数'); return }
    fetchDetail()
  }, [fetchDetail, nodeName])

  const handleTabChange = (value: string) => {
    if (value === 'yaml' && !yaml) fetchSub('yaml', '/mrboard/node/v1/Yaml?' + baseQuery, setYaml)
    if (value === 'labels' && Object.keys(labels).length === 0) fetchSub('labels', '/mrboard/node/v1/GetLabels?' + baseQuery, setLabels)
    if (value === 'taints' && taints.length === 0) fetchSub('taints', '/mrboard/node/v1/GetTaint?' + baseQuery, setTaints)
    if (value === 'allocated' && !allocated) fetchSub('allocated', '/mrboard/node/v1/GetAllocated?' + baseQuery, setAllocated)
    if (value === 'pods' && pods.length === 0) {
      fetchSub('pods', '/mrboard/pod/v1/List?' + baseQuery + '&nodeName=' + nodeName, (d) => setPods(d.data || []))
    }
    if (value === 'events' && events.length === 0) {
      fetchSub('events', '/mrboard/event/v1/List?' + baseQuery + '&objName=' + nodeName, (d) => setEvents(d.data || []))
    }
  }

  const handleDrain = async () => {
    try { await api('/mrboard/node/v1/Drain?' + baseQuery); toast.success('排空成功') }
    catch (err) { toast.error((err as Error).message) }
  }

  const handleDelete = async () => {
    try { await api('/mrboard/node/v1/Del?' + baseQuery); toast.success('删除成功'); navigate('/k8s/node') }
    catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-lg" /><Skeleton className="h-7 w-40" /></div>
      <div className="flex gap-2"><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-20" /><Skeleton className="h-9 w-20" /></div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  )
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到节点详情</div>

  const cpuPercent = parsePercent(detail.cpuAllocated)
  const memPercent = parsePercent(detail.memAllocated)
  const labelEntries = labels && typeof labels === 'object' ? Object.entries(labels) : []
  const yamlContent = typeof yaml === 'string' ? yaml : JSON.stringify(yaml, null, 2)

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title={detail.nodeName} eyebrow="Node">
        <StatusBadge status={detail.status} />
        <Button variant="outline" size="sm" onClick={() => navigate('/k8s/node/yaml?' + baseQuery)}>
          <FileCode size={14} className="mr-1" />YAML
        </Button>
        <Button variant="outline" size="sm" onClick={handleDrain}>
          <Droplets size={14} className="mr-1" />排水
        </Button>
        <ConfirmDialog
          trigger={<Button variant="destructive" size="sm"><Trash2 size={14} className="mr-1" />删除</Button>}
          title="确认删除" description={`确定删除节点 "${nodeName}"？`} variant="destructive" onConfirm={handleDelete}
        />
      </PageHeader>

      <Tabs defaultValue="overview" onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="pods">Pod列表</TabsTrigger>
          <TabsTrigger value="events">事件</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ['角色', detail.roles, 'IP', detail.internalIp || detail.externalIp],
                      ['操作系统', detail.os, '内核版本', detail.kernelVersion],
                      ['容器运行时', detail.containerRuntime, 'Kubelet版本', detail.kubeletVersion],
                      ['创建时间', detail.createTime, '外部IP', detail.externalIp],
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
              </CardContent>
            </Card>

            {/* Resource Allocation */}
            <Card>
              <CardHeader><CardTitle>资源分配</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {subLoading.allocated ? (
                  <div className="space-y-3"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /></div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">CPU 使用率</span>
                        <span className="font-mono text-xs">{detail.cpuAllocated || '-'}</span>
                      </div>
                      <Progress value={cpuPercent} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">内存使用率</span>
                        <span className="font-mono text-xs">{detail.memAllocated || '-'}</span>
                      </div>
                      <Progress value={memPercent} />
                    </div>
                    <div className="text-xs text-muted-foreground pt-2">
                      CPU容量: {detail.cpuCapacity || '-'} | 内存容量: {detail.memCapacity || '-'}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Labels */}
            <Card>
              <CardHeader><CardTitle>标签</CardTitle></CardHeader>
              <CardContent>
                {subLoading.labels ? (
                  <div className="flex gap-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-6 w-32" /><Skeleton className="h-6 w-20" /></div>
                ) : labelEntries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {labelEntries.map(([k, v]) => (
                      <Badge key={k} variant="outline" className="font-mono text-xs">
                        {k}={v}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground">暂无标签</div>
                )}
              </CardContent>
            </Card>

            {/* Taints */}
            <Card>
              <CardHeader><CardTitle>污点</CardTitle></CardHeader>
              <CardContent>
                {subLoading.taints ? (
                  <div className="flex gap-2"><Skeleton className="h-6 w-28" /><Skeleton className="h-6 w-24" /></div>
                ) : taints.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {taints.map((t: any, i: number) => (
                      <Badge key={i} variant="destructive" className="font-mono text-xs">
                        {t.key}={t.value}:{t.effect}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground">暂无污点</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pods Tab */}
        <TabsContent value="pods">
          <Card><CardContent className="py-4">
            <DataTable
              columns={podColumns}
              data={pods}
              loading={subLoading.pods}
              emptyMessage="该节点暂无Pod"
              onRowClick={(p) => navigate(`/k8s/pod/detail?clusterId=${clusterId}&nameSpace=${p.nameSpace}&podName=${p.podName}`)}
            />
          </CardContent></Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card><CardContent className="p-0">
            {subLoading.events ? (
              <div className="p-4 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">暂无事件</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">类型</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">原因</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">消息</th>
                    <th className="py-3 px-4 text-left font-medium text-muted-foreground">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-4">
                        <Badge variant={e.eventType === 'Normal' ? 'default' : 'destructive'}>{e.eventType}</Badge>
                      </td>
                      <td className="py-2 px-4">{e.reason}</td>
                      <td className="py-2 px-4 max-w-lg truncate">{e.message}</td>
                      <td className="py-2 px-4 text-muted-foreground whitespace-nowrap">{e.createTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* YAML Tab */}
        <TabsContent value="yaml">
          <Card><CardContent className="py-4">
            {subLoading.yaml ? <Skeleton className="h-64 w-full" /> : (
              <YamlViewer yaml={yamlContent} />
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
