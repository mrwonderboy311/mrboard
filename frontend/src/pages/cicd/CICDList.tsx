import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Play, Pencil, Trash2, Eye, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { CicdItem, ApiResponse, CicdPipelineConfig } from '@/types'

const cicdTypeLabel: Record<number, string> = { 1: '阿里云流水线', 2: 'Jenkins' }
const statusLabel: Record<number, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { text: '成功', variant: 'default' },
  2: { text: '运行中', variant: 'secondary' },
  3: { text: '失败', variant: 'destructive' },
}

export default function CICDList() {
  const [items, setItems] = useState<CicdItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [searchApp, setSearchApp] = useState('')
  const [appNames, setAppNames] = useState<string[]>([])

  const fetchList = async (params?: { cicdName?: string; appname?: string }) => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (params?.cicdName) query.set('cicdName', params.cicdName)
      if (params?.appname) query.set('appname', params.appname)
      const qs = query.toString()
      const resp = await api<ApiResponse<CicdItem[]>>(`/cicd/v1/List${qs ? '?' + qs : ''}`)
      setItems(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAppNames = async () => {
    try {
      const resp = await api<ApiResponse<{ appname: string }[]>>('/cicd/v1/ListAppname')
      setAppNames(resp.data?.map(d => d.appname) || [])
    } catch { /* ignore */ }
  }

  useEffect(() => {
    fetchList()
    fetchAppNames()
  }, [])

  const handleSearch = () => {
    fetchList({ cicdName: searchName, appname: searchApp })
  }

  const handleRun = async (item: CicdItem) => {
    if (!confirm(`确定运行 ${item.cicd_name}？`)) return
    try {
      const pipelineResp = await api<ApiResponse<CicdPipelineConfig>>(`/cicd/v1/GetPipelines?cicdId=${item.id}`)
      if (item.cicd_type === 1) {
        const p = pipelineResp.data
        const resp = await api<{ success: boolean; errorMessage?: string }>(
          `/cicd/pipeline/Start?aliyun_id=${p.aliyun_id}&organization_id=${p.organization_id}&pipeline_id=${p.pipeline_id}`
        )
        if (resp.success) {
          await api(`/cicd/v1/PostStatus?cicdId=${item.id}&status=2&lastRunTime=`)
          toast.success('启动成功')
          fetchList()
        } else {
          toast.error(resp.errorMessage || '启动失败')
        }
      } else if (item.cicd_type === 2) {
        const p = pipelineResp.data
        const resp = await api<ApiResponse<unknown>>(`/cicd/jks/v1/Run?jksId=${p.jks_id}&jobName=${p.pipeline_id}`)
        if (resp.code === 0) {
          await api(`/cicd/v1/PostStatus?cicdId=${item.id}&status=2&lastRunTime=`)
          toast.success('启动成功')
          fetchList()
        } else {
          toast.error(resp.msg || '启动失败')
        }
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleDelete = async (item: CicdItem) => {
    if (!confirm(`确定删除 ${item.cicd_name}？`)) return
    try {
      await api<ApiResponse<unknown>>(`/cicd/v1/Del?id=${item.id}`)
      toast.success('删除成功')
      fetchList()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">流水线列表</h1>
        <Button variant="outline" size="sm" onClick={() => fetchList()}>
          <RefreshCw size={14} className="mr-1" />刷新
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-2 mb-4 flex-wrap">
            <Input
              placeholder="流水线名称"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="w-48"
            />
            <Select value={searchApp} onValueChange={(v) => setSearchApp(v ?? '')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="选择应用" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部应用</SelectItem>
                {appNames.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>搜索</Button>
            <Button render={<Link to="/cicd/pipelines/add" />}>
              <Plus size={14} className="mr-1" />添加流水线
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>流水线名称</TableHead>
                <TableHead>应用名</TableHead>
                <TableHead>集群</TableHead>
                <TableHead>命名空间</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>上次运行</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.cicd_name}</TableCell>
                  <TableCell>{item.appname}</TableCell>
                  <TableCell className="font-mono text-sm">{item.cluster_id}</TableCell>
                  <TableCell>{item.namespace}</TableCell>
                  <TableCell>
                    <span className={item.cicd_type === 1 ? 'text-green-600' : 'text-blue-500'}>
                      {cicdTypeLabel[item.cicd_type] || '未知'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.status ? (
                      <Badge variant={statusLabel[item.status]?.variant || 'outline'}>
                        {statusLabel[item.status]?.text || '停止'}
                      </Badge>
                    ) : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.last_runtime || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" render={<Link to={`/cicd/pipelines?cicdName=${item.cicd_name}&cicdId=${item.id}`} />}>
                        <Eye size={14} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleRun(item)}>
                        <Play size={14} />
                      </Button>
                      <Button variant="outline" size="sm" render={<Link to={`/cicd/pipelines/edit?cicdName=${item.cicd_name}&cicdId=${item.id}`} />}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(item)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
