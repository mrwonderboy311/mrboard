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
import KeyValueEditor from '@/components/shared/KeyValueEditor'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Trash2, Droplets, Save } from 'lucide-react'
import { toast } from 'sonner'

interface NodeDetailData {
  nodeName: string
  status: string
  roles: string
  kubeletVersion: string
  os: string
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
  }

  const handleDrain = async () => {
    try { await api('/mrboard/node/v1/Drain?' + baseQuery); toast.success('排空成功') }
    catch (err) { toast.error((err as Error).message) }
  }

  const handleDelete = async () => {
    try { await api('/mrboard/node/v1/Del?' + baseQuery); toast.success('删除成功'); navigate('/k8s/node') }
    catch (err) { toast.error((err as Error).message) }
  }

  const handleSaveLabels = async () => {
    try { await api('/mrboard/node/v1/UpdateLabels?' + baseQuery, { method: 'POST', body: JSON.stringify(labels) }); toast.success('标签更新成功') }
    catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到节点详情</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{nodeName}</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>返回</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleDrain}><Droplets size={14} className="mr-1" />排空节点</Button>
        <ConfirmDialog
          trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>}
          title="确认删除" description={`确定删除节点 "${nodeName}"？`} variant="destructive" onConfirm={handleDelete}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['节点名称', detail.nodeName, '状态', detail.status],
                ['角色', detail.roles, 'Kubelet版本', detail.kubeletVersion],
                ['操作系统', detail.os, '容器运行时', detail.containerRuntime],
                ['CPU容量', detail.cpuCapacity, '内存容量', detail.memCapacity],
                ['CPU已分配', detail.cpuAllocated, '内存已分配', detail.memAllocated],
                ['内部IP', detail.internalIp, '外部IP', detail.externalIp],
                ['创建时间', detail.createTime, '污点', detail.taints],
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

      <Tabs defaultValue="labels" onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="labels">标签</TabsTrigger>
          <TabsTrigger value="taints">污点</TabsTrigger>
          <TabsTrigger value="allocated">资源分配</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        <TabsContent value="labels">
          <Card><CardContent className="space-y-4 py-4">
            {subLoading.labels ? <div className="text-muted-foreground">加载中...</div> : (
              <>
                <KeyValueEditor value={labels} onChange={setLabels} />
                <Button onClick={handleSaveLabels}><Save size={14} className="mr-1" />保存标签</Button>
              </>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="taints">
          <Card><CardContent className="space-y-4 py-4">
            {subLoading.taints ? <div className="text-muted-foreground">加载中...</div> : taints.length > 0 ? (
              <>
                <Table>
                  <TableHeader><TableRow><TableHead>键</TableHead><TableHead>值</TableHead><TableHead>效果</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {taints.map((t: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{t.key}</TableCell>
                        <TableCell className="font-mono text-xs">{t.value}</TableCell>
                        <TableCell><Badge variant="outline">{t.effect}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : <div className="text-muted-foreground">暂无污点</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="allocated">
          <Card><CardContent className="py-4">
            {subLoading.allocated ? <div className="text-muted-foreground">加载中...</div> : allocated ? (
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">{JSON.stringify(allocated, null, 2)}</pre>
            ) : <div className="text-muted-foreground">暂无资源分配数据</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="yaml">
          <Card><CardContent className="py-4">
            {subLoading.yaml ? <div className="text-muted-foreground">加载中...</div> : (
              <YamlViewer yaml={typeof yaml === 'string' ? yaml : JSON.stringify(yaml, null, 2)} />
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
