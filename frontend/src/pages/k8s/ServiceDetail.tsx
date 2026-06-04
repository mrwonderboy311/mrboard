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
import { Trash2, FileEdit } from 'lucide-react'
import { toast } from 'sonner'

interface SvcDetailData {
  serviceName: string
  nameSpace: string
  svcType: string
  svcIp: string
  labels: string
  svcPort: string
  lanEndpoint: string
  wanEndpoint: string
  createTime: string
}

export default function ServiceDetail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const serviceName = params.get('serviceName') || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&serviceName=${serviceName}`

  const [detail, setDetail] = useState<SvcDetailData | null>(null)
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(true)
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({})

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      setDetail(await api<SvcDetailData>('/mrboard/svc/v1/Detail?' + baseQuery))
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }, [baseQuery])

  useEffect(() => {
    if (!serviceName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchDetail()
  }, [fetchDetail, serviceName, nameSpace])

  const handleTabChange = (value: string) => {
    if (value === 'yaml' && !yaml) {
      setSubLoading(prev => ({ ...prev, yaml: true }))
      api<any>('/mrboard/svc/v1/Yaml?' + baseQuery)
        .then(data => setYaml(typeof data === 'string' ? data : JSON.stringify(data, null, 2)))
        .catch(err => toast.error((err as Error).message))
        .finally(() => setSubLoading(prev => ({ ...prev, yaml: false })))
    }
  }

  const handleDelete = async () => {
    try {
      await api('/mrboard/svc/v1/Del?' + baseQuery)
      toast.success('删除成功')
      navigate('/k8s/service')
    } catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到Service详情</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{serviceName}</h1>
          <Badge variant="outline">{detail.svcType}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/k8s/service/yaml-edit?${baseQuery}`)}>
            <FileEdit size={14} className="mr-1" />编辑YAML
          </Button>
          <ConfirmDialog
            trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>}
            title="确认删除" description={`确定删除 Service "${serviceName}"？`}
            variant="destructive" onConfirm={handleDelete}
          />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['命名空间', detail.nameSpace, '类型', detail.svcType],
                ['ClusterIP', detail.svcIp, '端口', detail.svcPort],
                ['选择器', detail.lanEndpoint, '创建时间', detail.createTime],
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

      <Card>
        <CardHeader><CardTitle>标签</CardTitle></CardHeader>
        <CardContent>
          <p className="font-mono text-xs break-all">{detail.labels || '-'}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="endpoints" onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>类型</TableHead><TableHead>端点</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {detail.lanEndpoint || detail.wanEndpoint ? (
                  <>
                    {detail.lanEndpoint && (
                      <TableRow>
                        <TableCell><Badge variant="default">内部</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{detail.lanEndpoint}</TableCell>
                      </TableRow>
                    )}
                    {detail.wanEndpoint && (
                      <TableRow>
                        <TableCell><Badge variant="secondary">外部</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{detail.wanEndpoint}</TableCell>
                      </TableRow>
                    )}
                  </>
                ) : (
                  <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">暂无Endpoints</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="yaml">
          <Card><CardContent className="py-4">
            {subLoading.yaml ? <div className="text-muted-foreground">加载中...</div> : (
              <YamlViewer yaml={yaml} onUpdateUrl={'/mrboard/svc/v1/ModifyByYaml?' + baseQuery} onUpdated={fetchDetail} />
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
