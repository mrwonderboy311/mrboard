import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import YamlViewer from '@/components/shared/YamlViewer'
import KeyValueEditor from '@/components/shared/KeyValueEditor'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Trash2, Play, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function CronJobDetail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const cronjobName = params.get('cronjobName') || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&cronjobName=${cronjobName}`

  const [detail, setDetail] = useState<any>(null)
  const [yaml, setYaml] = useState('')
  const [labelsData, setLabelsData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({})

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try { setDetail(await api<any>('/mrboard/cronjob/v1/Detail?' + baseQuery)) }
    catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }, [baseQuery])

  const fetchSub = async (key: string, url: string, setter: (v: any) => void) => {
    setSubLoading(prev => ({ ...prev, [key]: true }))
    try { setter(await api<any>(url)) }
    catch (err) { toast.error((err as Error).message) }
    finally { setSubLoading(prev => ({ ...prev, [key]: false })) }
  }

  useEffect(() => {
    if (!cronjobName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchDetail()
  }, [fetchDetail, cronjobName, nameSpace])

  const handleTabChange = (value: string) => {
    if (value === 'yaml' && !yaml) fetchSub('yaml', '/mrboard/cronjob/v1/Yaml?' + baseQuery, setYaml)
    if (value === 'labels' && Object.keys(labelsData).length === 0) fetchSub('labels', '/mrboard/cronjob/v1/Labels?' + baseQuery, setLabelsData)
  }

  const handleRun = async () => {
    try { await api('/mrboard/cronjob/v1/Run?' + baseQuery); toast.success('手动执行成功') }
    catch (err) { toast.error((err as Error).message) }
  }

  const handleDelete = async () => {
    try { await api('/mrboard/cronjob/v1/Del?' + baseQuery); toast.success('删除成功'); navigate('/k8s/cronjob') }
    catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到CronJob详情</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{cronjobName}</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>返回</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleRun}><Play size={14} className="mr-1" />手动执行</Button>
        <ConfirmDialog trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>} title="确认删除" description={`确定删除 CronJob "${cronjobName}"？`} variant="destructive" onConfirm={handleDelete} />
      </div>
      <Card><CardHeader><CardTitle>基本信息</CardTitle></CardHeader><CardContent>
        <table className="w-full text-sm"><tbody>
          {[
            ['名称', detail.cronjobName || cronjobName, '命名空间', nameSpace],
            ['调度', detail.schedule || '', '暂停', String(detail.suspend || false)],
            ['镜像', detail.imageUrl || '', '创建时间', detail.createTime || ''],
            ['并发策略', detail.concurrencyPolicy || '', '成功Jobs', String(detail.active || 0)],
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
      <Tabs defaultValue="labels" onValueChange={handleTabChange}>
        <TabsList variant="line"><TabsTrigger value="labels">标签</TabsTrigger><TabsTrigger value="yaml">YAML</TabsTrigger></TabsList>
        <TabsContent value="labels"><Card><CardContent className="space-y-4 py-4">
          {subLoading.labels ? <div className="text-muted-foreground">加载中...</div> : (<>
            <KeyValueEditor value={labelsData} onChange={setLabelsData} />
            <Button onClick={async () => {
              try { await api('/mrboard/cronjob/v1/Labels?' + baseQuery, { method: 'POST', body: JSON.stringify(labelsData) }); toast.success('标签更新成功') }
              catch (err) { toast.error((err as Error).message) }
            }}><Save size={14} className="mr-1" />保存</Button>
          </>)}
        </CardContent></Card></TabsContent>
        <TabsContent value="yaml"><Card><CardContent className="py-4">
          <YamlViewer yaml={typeof yaml === 'string' ? yaml : JSON.stringify(yaml, null, 2)} onUpdateUrl={'/mrboard/cronjob/v1/ModifyByYaml?' + baseQuery} onUpdated={fetchDetail} />
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  )
}
