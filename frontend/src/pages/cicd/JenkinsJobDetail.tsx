import { useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Play, Pencil, Eye } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiResponse, JenkinsBuild } from '@/types'

function statusBadge(status: string) {
  if (status === 'SUCCESS') return <Badge variant="default">成功</Badge>
  if (status === 'RUNNING' || status === '') return <Badge variant="secondary">运行中</Badge>
  if (status === 'QUEUE') return <Badge variant="secondary">等待中</Badge>
  if (status === 'FAIL') return <Badge variant="destructive">失败</Badge>
  return <Badge variant="outline">{status}</Badge>
}

function statusText(status: string) {
  if (status === 'SUCCESS') return <span className="text-green-600 font-medium">成功</span>
  if (status === '' || status === 'RUNNING') return <span className="text-orange-500 font-medium">运行中</span>
  if (status === 'QUEUE') return <span className="text-orange-500 font-medium">等待中</span>
  if (status === 'FAIL') return <span className="text-red-600 font-medium">失败</span>
  return <span className="text-blue-500">{status}</span>
}

export default function JenkinsJobDetail() {
  const [searchParams] = useSearchParams()
  const cicdId = searchParams.get('cicdId') || ''
  const cicdName = searchParams.get('cicdName') || ''

  const [build, setBuild] = useState<JenkinsBuild | null>(null)
  const [builds, setBuilds] = useState<JenkinsBuild[]>([])
  const [currentBuild, setCurrentBuild] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [logContent, setLogContent] = useState('')
  const logRef = useRef<HTMLPreElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const postStatus = async (status: string) => {
    let state = 1
    if (status === 'SUCCESS') state = 1
    else if (status === 'RUNNING') state = 2
    else if (status === 'FAIL') state = 3
    try {
      await api(`/cicd/v1/PostStatus?cicdId=${cicdId}&status=${state}`)
    } catch { /* ignore */ }
  }

  const fetchBuildState = useCallback(async (buildId?: number) => {
    const bid = buildId || currentBuild
    if (!bid && !cicdId) return
    try {
      const url = bid
        ? `/cicd/jks/v1/BuildState?cicdId=${cicdId}&buildId=${bid}`
        : `/cicd/jks/v1/BuildState?cicdId=${cicdId}`
      const resp = await api<ApiResponse<JenkinsBuild>>(url)
      if (resp.code === 0 && resp.data) {
        setBuild(resp.data)
        setLogContent(resp.data.log || '')
        setTimeout(() => {
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
        }, 100)
        return resp.data
      }
    } catch { /* ignore */ }
    return null
  }, [cicdId, currentBuild])

  const fetchBuilds = async () => {
    try {
      const resp = await api<ApiResponse<JenkinsBuild[]>>(`/cicd/jks/v1/BuildList?cicdId=${cicdId}`)
      setBuilds(resp.data || [])
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!cicdId) return
    setLoading(true)
    Promise.all([fetchBuildState(), fetchBuilds()])
      .finally(() => setLoading(false))
  }, [cicdId])

  useEffect(() => {
    if (currentBuild > 0) {
      timerRef.current = setInterval(() => fetchBuildState(currentBuild), 3000)
      const timeout = setTimeout(() => {
        if (timerRef.current) clearInterval(timerRef.current)
      }, 300000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
        clearTimeout(timeout)
      }
    }
  }, [currentBuild])

  const handleRun = async () => {
    try {
      const resp = await api<{ code: number; buildId?: number; errorMessage?: string }>(`/cicd/jks/v1/Run?cicdId=${cicdId}`)
      if (resp.code === 0 && resp.buildId) {
        setCurrentBuild(resp.buildId)
        postStatus('RUNNING')
        toast.success('启动成功')
        fetchBuildState(resp.buildId)
      } else {
        toast.error(resp.errorMessage || '启动失败')
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
            <span>流水线ID: {cicdName}</span>
            {build && (
              <>
                <span>创建时间: {build.buildTime || '-'}</span>
                <span>耗时: {build.duration || 0}s</span>
                <span>运行ID: {build.id}</span>
                <span>状态: {statusText(build.status)}</span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRun}><Play size={14} className="mr-1" />运行</Button>
            <Button variant="outline" render={<Link to={`/cicd/pipelines/edit?cicdId=${cicdId}`} />}>
              <Pencil size={14} className="mr-1" />编辑
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="recent">
        <TabsList>
          <TabsTrigger value="recent">最近运行</TabsTrigger>
          <TabsTrigger value="history">运行历史</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : (
                <div className="h-[60vh] overflow-auto bg-zinc-950 rounded-md">
                  <pre
                    ref={logRef}
                    className="p-4 text-sm text-green-400 font-mono whitespace-pre-wrap break-all"
                    dangerouslySetInnerHTML={{ __html: logContent || '暂无日志' }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>构建ID</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>耗时</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {builds.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无记录</TableCell></TableRow>
                  ) : builds.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="text-blue-500 font-mono">#{b.id}</TableCell>
                      <TableCell>{statusBadge(b.status)}</TableCell>
                      <TableCell className="text-sm">{b.buildTime || '-'}</TableCell>
                      <TableCell>{b.duration || 0}s</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" render={<Link to={`/cicd/jenkins/log?cicdId=${cicdId}&buildId=${b.id}`} />}>
                          <Eye size={14} className="mr-1" />日志
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
