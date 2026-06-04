import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import YamlViewer from '@/components/shared/YamlViewer'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Trash2, FileEdit } from 'lucide-react'
import { toast } from 'sonner'

interface RulesPath {
  host: string
  pathType: string
  path: string
  serviceName: string
  servicePort: string
}

interface IngDetailData {
  ingressName: string
  nameSpace: string
  annotations: string
  endpoint: string
  labels: string
  createTime: string
  rules: RulesPath[]
}

export default function IngressDetail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const ingressName = params.get('ingressName') || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&ingressName=${ingressName}`

  const [detail, setDetail] = useState<IngDetailData | null>(null)
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(true)
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({})

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      setDetail(await api<IngDetailData>('/mrboard/ing/v1/Detail?' + baseQuery))
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }, [baseQuery])

  useEffect(() => {
    if (!ingressName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchDetail()
  }, [fetchDetail, ingressName, nameSpace])

  const handleTabChange = (value: string) => {
    if (value === 'yaml' && !yaml) {
      setSubLoading(prev => ({ ...prev, yaml: true }))
      api<any>('/mrboard/ing/v1/Yaml?' + baseQuery)
        .then(data => setYaml(typeof data === 'string' ? data : JSON.stringify(data, null, 2)))
        .catch(err => toast.error((err as Error).message))
        .finally(() => setSubLoading(prev => ({ ...prev, yaml: false })))
    }
  }

  const handleDelete = async () => {
    try {
      await api('/mrboard/ing/v1/Del?' + baseQuery)
      toast.success('删除成功')
      navigate('/k8s/ingress')
    } catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到Ingress详情</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{ingressName}</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/k8s/ingress/yaml-edit?${baseQuery}`)}>
            <FileEdit size={14} className="mr-1" />编辑YAML
          </Button>
          <ConfirmDialog
            trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>}
            title="确认删除" description={`确定删除 Ingress "${ingressName}"？`}
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
                ['命名空间', detail.nameSpace, '地址', detail.endpoint || '-'],
                ['标签', detail.labels, '注解', detail.annotations],
                ['创建时间', detail.createTime, '', ''],
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

      <Tabs defaultValue="rules" onValueChange={handleTabChange}>
        <TabsList variant="line">
          <TabsTrigger value="rules">规则</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Host</TableHead><TableHead>Path</TableHead><TableHead>PathType</TableHead><TableHead>Service:Port</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(detail.rules || []).length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">暂无规则</TableCell></TableRow>
                ) : (detail.rules || []).map((rule, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{rule.host || '*'}</TableCell>
                    <TableCell className="font-mono text-xs">{rule.path || '/'}</TableCell>
                    <TableCell className="font-mono text-xs">{rule.pathType || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{rule.serviceName}{rule.servicePort ? `:${rule.servicePort}` : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="yaml">
          <Card><CardContent className="py-4">
            {subLoading.yaml ? <div className="text-muted-foreground">加载中...</div> : (
              <YamlViewer yaml={yaml} onUpdateUrl={'/mrboard/ing/v1/ModifyByYaml?' + baseQuery} onUpdated={fetchDetail} />
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
