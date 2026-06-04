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
import { Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export interface ResourceDetailConfig {
  title: string
  nameParam: string
  detailApi: string
  yamlApi: string
  deleteApi?: string
  modifyYamlApi?: string
  backPath: string
  extraTabs?: { key: string; label: string; api: string }[]
  infoFields: [string, string, string, string][] // [label1, key1, label2, key2]
}

export default function ResourceDetailPage({ config }: { config: ResourceDetailConfig }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const name = params.get(config.nameParam) || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&${config.nameParam}=${name}`

  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subData, setSubData] = useState<Record<string, any>>({})
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({})

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try { setDetail(await api<any>(config.detailApi + '?' + baseQuery)) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }, [config.detailApi, baseQuery])

  const fetchSub = async (key: string, url: string) => {
    setSubLoading(prev => ({ ...prev, [key]: true }))
    try {
      const data = await api<any>(url)
      setSubData(prev => ({ ...prev, [key]: data }))
    } catch (err) { toast.error((err as Error).message) }
    finally { setSubLoading(prev => ({ ...prev, [key]: false })) }
  }

  useEffect(() => {
    if (!name) { toast.error('缺少必要参数'); return }
    fetchDetail()
  }, [fetchDetail, name])

  const handleTabChange = (value: string) => {
    if (value === 'yaml' && !subData.yaml) fetchSub('yaml', config.yamlApi + '?' + baseQuery)
    if (value === 'events' && !subData.events) fetchSub('events', '/mrboard/event/v1/List?' + baseQuery + '&objName=' + name)
    config.extraTabs?.forEach(tab => {
      if (value === tab.key && !subData[tab.key]) fetchSub(tab.key, tab.api + '?' + baseQuery)
    })
  }

  const handleDelete = async () => {
    try {
      await api(config.deleteApi + '?' + baseQuery)
      toast.success('删除成功')
      navigate(config.backPath)
    } catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到{config.title}详情</div>

  const yamlContent = typeof subData.yaml === 'string' ? subData.yaml : JSON.stringify(subData.yaml || '', null, 2)
  const eventsList = Array.isArray(subData.events) ? subData.events : (subData.events as any)?.data || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{name}</h1>
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft size={14} className="mr-1" />返回</Button>
      </div>
      {config.deleteApi && (
        <div className="flex flex-wrap gap-2">
          <ConfirmDialog
            trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>}
            title="确认删除" description={`确定删除 ${config.title} "${name}"？`} variant="destructive" onConfirm={handleDelete}
          />
        </div>
      )}
      <Card><CardHeader><CardTitle>基本信息</CardTitle></CardHeader><CardContent>
        <table className="w-full text-sm"><tbody>
          {config.infoFields.map((row, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 pr-4 text-muted-foreground w-28 whitespace-nowrap">{row[0]}</td>
              <td className="py-2 pr-8 font-mono text-xs break-all">{detail[row[1]] ?? '-'}</td>
              <td className="py-2 pr-4 text-muted-foreground w-28 whitespace-nowrap">{row[2]}</td>
              <td className="py-2 font-mono text-xs break-all">{detail[row[3]] ?? '-'}</td>
            </tr>
          ))}
        </tbody></table>
      </CardContent></Card>
      <Tabs defaultValue="yaml" onValueChange={handleTabChange}>
        <TabsList variant="line">
          {config.extraTabs?.map(tab => <TabsTrigger key={tab.key} value={tab.key}>{tab.label}</TabsTrigger>)}
          <TabsTrigger value="events">事件</TabsTrigger>
          <TabsTrigger value="yaml">YAML</TabsTrigger>
        </TabsList>
        {config.extraTabs?.map(tab => (
          <TabsContent key={tab.key} value={tab.key}>
            <Card><CardContent className="py-4">
              {subLoading[tab.key] ? <div className="text-muted-foreground">加载中...</div> : subData[tab.key] ? (
                <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">{typeof subData[tab.key] === 'string' ? subData[tab.key] : JSON.stringify(subData[tab.key], null, 2)}</pre>
              ) : <div className="text-muted-foreground">暂无数据</div>}
            </CardContent></Card>
          </TabsContent>
        ))}
        <TabsContent value="events">
          <Card><CardContent className="p-0"><Table>
            <TableHeader><TableRow><TableHead>类型</TableHead><TableHead>消息</TableHead><TableHead>原因</TableHead></TableRow></TableHeader>
            <TableBody>{eventsList.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">暂无事件</TableCell></TableRow>
            : eventsList.map((e: any, i: number) => (<TableRow key={i}>
              <TableCell><Badge variant={e.eventType === 'Normal' ? 'default' : 'destructive'}>{e.eventType}</Badge></TableCell>
              <TableCell className="max-w-lg truncate">{e.message}</TableCell><TableCell>{e.reason}</TableCell>
            </TableRow>))}</TableBody>
          </Table></CardContent></Card>
        </TabsContent>
        <TabsContent value="yaml">
          <Card><CardContent className="py-4">
            {subLoading.yaml ? <div className="text-muted-foreground">加载中...</div> : (
              <YamlViewer yaml={yamlContent} onUpdateUrl={config.modifyYamlApi ? config.modifyYamlApi + '?' + baseQuery : undefined} onUpdated={fetchDetail} />
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
