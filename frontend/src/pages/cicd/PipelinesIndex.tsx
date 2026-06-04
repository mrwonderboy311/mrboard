import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Play, Square, Pencil, Eye, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiResponse, PipelineRun, PipelineRunListResponse, PipelineRunResponse } from '@/types'

const triggerModeLabel: Record<number, string> = {
  1: '人工触发', 2: '定时触发', 3: '代码提交触发', 4: '流水线触发', 5: '流水线触发', 6: 'WEBHOOK触发',
}

function statusBadge(status: string) {
  if (status === 'SUCCESS') return <Badge variant="default">成功</Badge>
  if (status === 'RUNNING') return <Badge variant="secondary">运行中</Badge>
  if (status === 'WAITING') return <Badge variant="secondary">等待中</Badge>
  if (status === 'FAIL') return <Badge variant="destructive">失败</Badge>
  return <Badge variant="outline">{status}</Badge>
}

function statusText(status: string) {
  if (status === 'SUCCESS') return <span className="text-green-600 font-medium">成功</span>
  if (status === 'RUNNING') return <span className="text-orange-500 font-medium">运行中</span>
  if (status === 'WAITING') return <span className="text-orange-500 font-medium">等待中</span>
  if (status === 'FAIL') return <span className="text-red-600 font-medium">失败</span>
  return <span className="text-blue-500">{status}</span>
}

function formatTime(ts: number) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleString('zh-CN')
}

function formatDuration(ms: number) {
  if (!ms || isNaN(ms)) return '0s'
  return `${Math.round(ms / 1000)}s`
}

interface JobBlock {
  stageIndex: number
  jobIndex: number
  id: number
  name: string
  status: string
  duration: string
  actionType: string
  stageStatus: string
}

function getJobBlocks(run: PipelineRun): { blocks: JobBlock[][]; isLinear: boolean } {
  if (!run.stages || run.stages.length === 0) return { blocks: [], isLinear: false }
  const sources = run.sources?.length || 0
  const stagesLen = run.stages.length
  const jobs0Len = run.stages[0]?.stageInfo?.jobs?.length || 0

  if (sources === 1 && stagesLen >= 2 && jobs0Len === 1) {
    const row: JobBlock[] = run.stages.map((stage, si) => {
      const job = stage.stageInfo.jobs[0]
      const dur = formatDuration(job.endTime - job.startTime)
      const actionType = job.actions?.[0]?.type || ''
      return { stageIndex: si, jobIndex: 0, id: job.id, name: job.name, status: job.status, duration: dur, actionType, stageStatus: stage.stageInfo.status }
    })
    return { blocks: [row], isLinear: true }
  }

  const rows: JobBlock[][] = run.stages.map((stage, si) =>
    stage.stageInfo.jobs.map((job, ji) => {
      const dur = formatDuration(job.endTime - job.startTime)
      const actionType = job.actions?.[0]?.type || ''
      return { stageIndex: si, jobIndex: ji, id: job.id, name: job.name, status: job.status, duration: dur, actionType, stageStatus: stage.stageInfo.status }
    })
  )
  return { blocks: rows, isLinear: false }
}

export default function PipelinesIndex() {
  const [searchParams] = useSearchParams()
  const cicdName = searchParams.get('cicdName') || ''
  const cicdId = searchParams.get('cicdId') || ''
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [currentRun, setCurrentRun] = useState<PipelineRun | null>(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const postStatus = async (status: string, lastRunTime?: string) => {
    let state = 1
    if (status === 'SUCCESS') state = 1
    else if (status === 'RUNNING') state = 2
    else if (status === 'FAIL') state = 3
    try {
      await api(`/cicd/v1/PostStatus?cicdId=${cicdId}&status=${state}&lastRunTime=${lastRunTime || ''}`)
    } catch { /* ignore */ }
  }

  const fetchRun = useCallback(async (pipelineRunId: string) => {
    try {
      const resp = await api<PipelineRunResponse>(`/cicd/pipeline/GetRun?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}`)
      if (resp.success) {
        setCurrentRun(resp.pipelineRun)
        return resp.pipelineRun
      }
    } catch { /* ignore */ }
    return null
  }, [cicdId])

  const fetchRuns = useCallback(async () => {
    try {
      const resp = await api<PipelineRunListResponse>(`/cicd/pipeline/ListRun?cicdId=${cicdId}&num=10`)
      if (resp.success && resp.pipelineRuns) {
        setRuns(resp.pipelineRuns)
        return resp.pipelineRuns
      }
    } catch { /* ignore */ }
    return []
  }, [cicdId])

  useEffect(() => {
    if (!cicdId) return
    setLoading(true)
    Promise.all([fetchRuns(), api<PipelineRunListResponse>(`/cicd/pipeline/ListRun?cicdId=${cicdId}&num=1`)])
      .then(([, latestResp]) => {
        const latestId = (latestResp as PipelineRunListResponse).pipelineRuns?.[0]?.pipelineRunId
        if (latestId) return fetchRun(latestId)
      })
      .finally(() => setLoading(false))
  }, [cicdId, fetchRuns, fetchRun])

  useEffect(() => {
    if (!currentRun) return
    if (currentRun.status === 'RUNNING' || currentRun.status === 'WAITING') {
      timerRef.current = setInterval(() => {
        fetchRun(currentRun.pipelineRunId).then(run => {
          if (run && run.status !== 'RUNNING' && run.status !== 'WAITING') {
            postStatus(run.status, formatTime(run.createTime))
            if (timerRef.current) clearInterval(timerRef.current)
          }
        })
      }, 3000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    } else {
      postStatus(currentRun.status, formatTime(currentRun.createTime))
    }
  }, [currentRun?.pipelineRunId, currentRun?.status, fetchRun])

  const handleStart = async () => {
    try {
      const resp = await api<{ success: boolean; pipelineRunId?: string; errorMessage?: string }>(`/cicd/pipeline/Start?cicdId=${cicdId}`)
      if (resp.success) {
        postStatus('RUNNING')
        toast.success('启动成功')
        setTimeout(() => fetchRuns(), 1000)
      } else {
        toast.error(resp.errorMessage || '启动失败')
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleStop = async () => {
    if (!confirm('确定停止？')) return
    try {
      const runResp = await api<PipelineRunResponse>(`/cicd/pipeline/GetRun?cicdId=${cicdId}`)
      if (runResp.pipelineRun?.status === 'RUNNING') {
        const resp = await api<{ success: boolean; errorMessage?: string }>(`/cicd/pipeline/Stop?cicdId=${cicdId}`)
        if (resp.success) {
          toast.success('停止成功')
          fetchRuns()
        } else {
          toast.error(resp.errorMessage || '停止失败')
        }
      } else {
        toast.info('任务已经停止')
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleRetry = async (jobId: number, pipelineRunId: string) => {
    if (!confirm('确定重试？')) return
    try {
      const resp = await api<ApiResponse<unknown>>(`/cicd/pipeline/Retry?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${jobId}`, { method: 'POST' })
      if (resp.code === 0) {
        toast.success('重试成功')
        fetchRun(pipelineRunId)
      } else {
        toast.error(resp.msg)
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handlePass = async (jobId: number, pipelineRunId: string) => {
    try {
      await api<ApiResponse<unknown>>(`/cicd/pipeline/PassValidate?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${jobId}`, { method: 'POST' })
      toast.success('通过成功')
      fetchRun(pipelineRunId)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleRefuse = async (jobId: number, pipelineRunId: string) => {
    try {
      await api<ApiResponse<unknown>>(`/cicd/pipeline/RefuseValidate?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${jobId}`, { method: 'POST' })
      toast.success('拒绝成功')
      fetchRun(pipelineRunId)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleStopJob = async (jobId: number, pipelineRunId: string) => {
    try {
      await api<ApiResponse<unknown>>(`/cicd/pipeline/StopJob?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${jobId}`, { method: 'POST' })
      toast.success('停止成功')
      fetchRun(pipelineRunId)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleSkip = async (jobId: number, pipelineRunId: string) => {
    try {
      await api<ApiResponse<unknown>>(`/cicd/pipeline/SkipJob?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${jobId}`, { method: 'POST' })
      toast.success('跳过成功')
      fetchRun(pipelineRunId)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const renderJobActions = (block: JobBlock, pipelineRunId: string) => {
    if (block.actionType === 'PassPipelineValidate' || block.actionType === 'RefusePipelineValidate') {
      return (
        <div className="flex gap-1 mt-1">
          <Button size="sm" variant="outline" onClick={() => handlePass(block.id, pipelineRunId)}>通过</Button>
          <Button size="sm" variant="destructive" onClick={() => handleRefuse(block.id, pipelineRunId)}>拒绝</Button>
        </div>
      )
    }
    if (block.actionType === 'RetryPipelineJobRun') {
      return <Button size="sm" variant="destructive" className="mt-1" onClick={() => handleRetry(block.id, pipelineRunId)}>重试</Button>
    }
    if (block.actionType === 'StopPipelineJobRun') {
      return <Button size="sm" variant="destructive" className="mt-1" onClick={() => handleStopJob(block.id, pipelineRunId)}>取消</Button>
    }
    if (block.actionType === 'SkipPipelineJobRun') {
      return <Button size="sm" variant="destructive" className="mt-1" onClick={() => handleSkip(block.id, pipelineRunId)}>跳过</Button>
    }
    if (block.status === 'FAIL') {
      return <Button size="sm" variant="destructive" className="mt-1" onClick={() => handleRetry(block.id, pipelineRunId)}>重试</Button>
    }
    return null
  }

  const renderJobCard = (block: JobBlock, pipelineRunId: string, showLog = true) => {
    let borderColor = 'border-border'
    if (block.status === 'SUCCESS') borderColor = 'border-green-500'
    else if (block.status === 'FAIL') borderColor = 'border-red-500'
    else if (block.status === 'RUNNING' || block.status === 'WAITING') borderColor = 'border-orange-400'

    return (
      <div key={block.id} className={`rounded-md border-l-4 p-3 min-w-[160px] bg-card ${borderColor}`}>
        <div className="text-sm font-medium mb-1">{block.name}</div>
        <div className="text-xs">{statusText(block.status)}</div>
        {block.duration && block.duration !== '0s' && (
          <div className="text-xs text-muted-foreground mt-1">{block.duration}</div>
        )}
        {block.stageStatus === 'SWITCH_MANUAL' && block.jobIndex === 0 && (
          <Button size="sm" variant="outline" className="mt-1" onClick={() => handlePass(block.id, pipelineRunId)}>
            等待手动触发
          </Button>
        )}
        {renderJobActions(block, pipelineRunId)}
        {showLog && block.status && block.status !== 'INIT' && (
          <Button size="sm" variant="ghost" className="mt-1 h-6 text-xs" render={<Link to={`/cicd/pipelines/log?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${block.id}`} />}>
            日志
          </Button>
        )}
      </div>
    )
  }

  const renderStages = (run: PipelineRun) => {
    const { blocks } = getJobBlocks(run)
    if (blocks.length === 0) return <div className="text-muted-foreground py-4">暂无阶段数据</div>

    return (
      <div className="space-y-3">
        {blocks.map((row, ri) => (
          <div key={ri} className="flex items-center gap-2 flex-wrap">
            {row.map((block, bi) => (
              <div key={block.id} className="flex items-center gap-2">
                {renderJobCard(block, run.pipelineRunId, true)}
                {bi < row.length - 1 && <ArrowRight size={16} className="text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{cicdName} 流水线</h1>
          {currentRun && (
            <div className="text-sm text-muted-foreground mt-1 space-x-3">
              <span>创建时间: {formatTime(currentRun.createTime)}</span>
              <span>流水线ID: {currentRun.pipelineId}</span>
              <span>触发模式: {triggerModeLabel[currentRun.triggerMode] || currentRun.triggerMode}</span>
              <span>运行ID: {currentRun.pipelineRunId}</span>
              <span>状态: {statusText(currentRun.status)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleStart}><Play size={14} className="mr-1" />运行</Button>
          <Button variant="destructive" onClick={handleStop}><Square size={14} className="mr-1" />停止</Button>
          <Button variant="outline" render={<Link to={`/cicd/pipelines/edit?cicdId=${cicdId}`} />}>
            <Pencil size={14} className="mr-1" />编辑
          </Button>
        </div>
      </div>

      <Tabs defaultValue="recent">
        <TabsList>
          <TabsTrigger value="recent">最近运行</TabsTrigger>
          <TabsTrigger value="history">运行历史</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : currentRun ? (
                renderStages(currentRun)
              ) : (
                <div className="text-center py-8 text-muted-foreground">暂没有运行记录，可点击运行</div>
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
                    <TableHead>运行ID</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>结束时间</TableHead>
                    <TableHead>触发模式</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">暂无记录</TableCell></TableRow>
                  ) : runs.map(run => (
                    <TableRow key={run.pipelineRunId}>
                      <TableCell className="text-blue-500 font-mono">#{run.pipelineRunId}</TableCell>
                      <TableCell>{statusBadge(run.status)}</TableCell>
                      <TableCell className="text-sm">{formatTime(run.startTime)}</TableCell>
                      <TableCell className="text-sm">{formatTime(run.endTime)}</TableCell>
                      <TableCell>{triggerModeLabel[run.triggerMode] || run.triggerMode}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" render={<Link to={`/cicd/pipelines?cicdName=${cicdName}&cicdId=${cicdId}&pipelineRunId=${run.pipelineRunId}`} />}>
                          <Eye size={14} className="mr-1" />详情
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
