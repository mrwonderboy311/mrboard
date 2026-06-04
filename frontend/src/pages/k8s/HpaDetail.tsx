import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import YamlViewer from '@/components/shared/YamlViewer'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

interface HpaDetail {
  hpaName: string
  nameSpace: string
  targetRef: string
  minReplicas: number
  maxReplicas: number
  currentReplicas: number
  targetCPU: string
  currentCPU: string
  targetMemory?: string
  currentMemory?: string
  createTime: string
}

export default function HpaDetail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const hpaName = params.get('hpaName') || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&hpaName=${hpaName}`

  const [detail, setDetail] = useState<HpaDetail | null>(null)
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(true)
  const [subLoading, setSubLoading] = useState<Record<string, boolean>>({})

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: HpaDetail[] }>('/mrboard/hpa/v1/List?clusterId=' + clusterId + '&nameSpace=' + nameSpace + '&hpaName=' + hpaName)
      setDetail(res.data?.[0] || null)
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }, [clusterId, nameSpace, hpaName])

  useEffect(() => {
    if (!hpaName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchDetail()
  }, [fetchDetail, hpaName, nameSpace])

  const handleTabChange = (value: string) => {
    if (value === 'yaml' && !yaml) {
      setSubLoading(prev => ({ ...prev, yaml: true }))
      api<any>('/mrboard/hpa/v1/Yaml?' + baseQuery)
        .then(data => setYaml(typeof data === 'string' ? data : data.yaml || JSON.stringify(data, null, 2)))
        .catch(err => toast.error((err as Error).message))
        .finally(() => setSubLoading(prev => ({ ...prev, yaml: false })))
    }
  }

  const handleDelete = async () => {
    try { await api('/mrboard/hpa/v1/Del?' + baseQuery); toast.success('删除成功'); navigate('/k8s/hpa') }
    catch (err) { toast.error((err as Error).message) }
  }

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>
  if (!detail) return <div className="flex items-center justify-center py-16 text-muted-foreground">未找到HPA详情</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{hpaName}</h1>
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft size={14} className="mr-1" />返回</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <ConfirmDialog trigger={<Button variant="destructive"><Trash2 size={14} className="mr-1" />删除</Button>} title="确认删除" description={`确定删除 HPA "${hpaName}"？`} variant="destructive" onConfirm={handleDelete} />
      </div>
      <Card><CardHeader><CardTitle>基本信息</CardTitle></CardHeader><CardContent>
        <table className="w-full text-sm"><tbody>
          {[
            ['名称', detail.hpaName, '命名空间', detail.nameSpace],
            ['目标引用', detail.targetRef, '创建时间', detail.createTime || ''],
            ['最小副本', String(detail.minReplicas || 0), '最大副本', String(detail.maxReplicas || 0)],
            ['当前副本', String(detail.currentReplicas || 0), '', ''],
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
      <Card><CardHeader><CardTitle>指标</CardTitle></CardHeader><CardContent>
        <table className="w-full text-sm"><tbody>
          {[
            ['目标CPU', detail.targetCPU ? detail.targetCPU + '%' : '-', '当前CPU', detail.currentCPU ? detail.currentCPU + '%' : '-'],
            ['目标内存', detail.targetMemory ? detail.targetMemory + '%' : '-', '当前内存', detail.currentMemory ? detail.currentMemory + '%' : '-'],
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
      <Tabs defaultValue="yaml" onValueChange={handleTabChange}>
        <TabsList variant="line"><TabsTrigger value="yaml">YAML</TabsTrigger></TabsList>
        <TabsContent value="yaml"><Card><CardContent className="py-4">
          {subLoading.yaml ? <div className="text-muted-foreground">加载中...</div> : (
            <YamlViewer yaml={yaml} onUpdateUrl={'/mrboard/hpa/v1/ModifyByYaml?' + baseQuery} onUpdated={fetchDetail} />
          )}
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  )
}
