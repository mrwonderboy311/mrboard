import { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import type { PipelineRun, PipelineRunResponse, ApiResponse } from '@/types'

const triggerModeLabel: Record<number, string> = {
  1: '人工触发', 2: '定时触发', 3: '代码提交触发', 5: '流水线触发', 6: 'WEBHOOK触发',
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
  return new Date(ts).toLocaleString('zh-CN')
}

function formatDuration(ms: number) {
  if (!ms || isNaN(ms)) return '0s'
  return `${Math.round(ms / 1000)}s`
}


export default function PipelinesDetail() {
  const [searchParams] = useSearchParams()
  const cicdId = searchParams.get('cicdId') || ''
  const pipelineRunId = searchParams.get('pipelineRunId') || ''
  const [run, setRun] = useState<PipelineRun | null>(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchRun = async () => {
    try {
      const resp = await api<PipelineRunResponse>(`/cicd/pipeline/GetRun?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}`)
      if (resp.success) {
        setRun(resp.pipelineRun)
        return resp.pipelineRun
      }
    } catch { /* ignore */ }
    return null
  }

  useEffect(() => {
    if (!cicdId || !pipelineRunId) return
    setLoading(true)
    fetchRun().finally(() => setLoading(false))
  }, [cicdId, pipelineRunId])

  useEffect(() => {
    if (!run) return
    if (run.status === 'RUNNING' || run.status === 'WAITING') {
      timerRef.current = setInterval(async () => {
        const updated = await fetchRun()
        if (updated && updated.status !== 'RUNNING' && updated.status !== 'WAITING') {
          if (timerRef.current) clearInterval(timerRef.current)
        }
      }, 3000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }
  }, [run?.status, run?.pipelineRunId])

  const renderJob = (job: { id: number; name: string; status: string; startTime: number; endTime: number; actions?: { type: string }[] }, stageStatus: string) => {
    const dur = formatDuration(job.endTime - job.startTime)
    let borderColor = 'border-border'
    if (job.status === 'SUCCESS') borderColor = 'border-green-500'
    else if (job.status === 'FAIL') borderColor = 'border-red-500'
    else if (job.status === 'RUNNING' || job.status === 'WAITING') borderColor = 'border-orange-400'

    const actionType = job.actions?.[0]?.type || ''
    let actionBtn = null
    if (actionType === 'PassPipelineValidate' || actionType === 'RefusePipelineValidate') {
      actionBtn = (
        <div className="flex gap-1 mt-1">
          <Button size="sm" variant="outline" onClick={async () => {
            await api<ApiResponse<unknown>>(`/cicd/pipeline/PassValidate?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${job.id}`, { method: 'POST' })
            toast.success('通过成功')
            fetchRun()
          }}>通过</Button>
          <Button size="sm" variant="destructive" onClick={async () => {
            await api<ApiResponse<unknown>>(`/cicd/pipeline/RefuseValidate?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${job.id}`, { method: 'POST' })
            toast.success('拒绝成功')
            fetchRun()
          }}>拒绝</Button>
        </div>
      )
    } else if (actionType === 'RetryPipelineJobRun') {
      actionBtn = <Button size="sm" variant="destructive" className="mt-1" onClick={async () => { await api(`/cicd/pipeline/Retry?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${job.id}`, { method: 'POST' }); fetchRun() }}>重试</Button>
    } else if (actionType === 'StopPipelineJobRun') {
      actionBtn = <Button size="sm" variant="destructive" className="mt-1" onClick={async () => { await api(`/cicd/pipeline/StopJob?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${job.id}`, { method: 'POST' }); fetchRun() }}>取消</Button>
    } else if (actionType === 'SkipPipelineJobRun') {
      actionBtn = <Button size="sm" variant="destructive" className="mt-1" onClick={async () => { await api(`/cicd/pipeline/SkipJob?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${job.id}`, { method: 'POST' }); fetchRun() }}>跳过</Button>
    } else if (job.status === 'FAIL') {
      actionBtn = <Button size="sm" variant="destructive" className="mt-1" onClick={async () => { await api(`/cicd/pipeline/Retry?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${job.id}`, { method: 'POST' }); toast.success('重试成功'); fetchRun() }}>重试</Button>
    }

    if (stageStatus === 'SWITCH_MANUAL') {
      actionBtn = <Button size="sm" variant="outline" className="mt-1" onClick={async () => { await api(`/cicd/pipeline/PassValidate?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${job.id}`, { method: 'POST' }); fetchRun() }}>等待手动触发</Button>
    }

    return (
      <div key={job.id} className={`rounded-md border-l-4 p-3 min-w-[160px] bg-card ${borderColor}`}>
        <div className="text-sm font-medium mb-1">{job.name}</div>
        <div className="text-xs">{statusText(job.status)}</div>
        {dur && dur !== '0s' && <div className="text-xs text-muted-foreground mt-1">{dur}</div>}
        {actionBtn}
        <Button size="sm" variant="ghost" className="mt-1 h-6 text-xs" render={<Link to={`/cicd/pipelines/log?cicdId=${cicdId}&pipelineRunId=${pipelineRunId}&jobId=${job.id}`} />}>
          日志
        </Button>
      </div>
    )
  }

  const renderStages = (pipelineRun: PipelineRun) => {
    if (!pipelineRun.stages?.length) return <div className="text-muted-foreground py-4">暂无阶段数据</div>

    const sources = pipelineRun.sources?.length || 0
    const stagesLen = pipelineRun.stages.length
    const jobs0Len = pipelineRun.stages[0]?.stageInfo?.jobs?.length || 0

    if (sources === 1 && stagesLen >= 2 && jobs0Len === 1) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {pipelineRun.stages.map((stage, si) => {
            const job = stage.stageInfo.jobs[0]
            return (
              <div key={job.id} className="flex items-center gap-2">
                {renderJob(job, stage.stageInfo.status)}
                {si < stagesLen - 1 && <ArrowRight size={16} className="text-muted-foreground shrink-0" />}
              </div>
            )
          })}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {pipelineRun.stages.map((stage, si) => (
          <div key={si} className="flex items-center gap-2 flex-wrap">
            {stage.stageInfo.jobs.map((job, ji) => (
              <div key={job.id} className="flex items-center gap-2">
                {renderJob(job, stage.stageInfo.status)}
                {ji < stage.stageInfo.jobs.length - 1 && <ArrowRight size={16} className="text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {run && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
              <span>创建时间: {formatTime(run.createTime)}</span>
              <span>流水线ID: {run.pipelineId}</span>
              <span>触发模式: {triggerModeLabel[run.triggerMode] || run.triggerMode}</span>
              <span>运行ID: {run.pipelineRunId}</span>
              <span>状态: {statusBadge(run.status)}</span>
            </div>
            {run.sources?.length > 0 && (
              <div className="text-sm text-muted-foreground mb-3">
                Git: {run.sources[0].data.repo} &nbsp; 分支: {run.sources[0].data.branch}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : run ? (
            renderStages(run)
          ) : (
            <div className="text-center py-8 text-muted-foreground">暂无数据</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function statusBadge(status: string) {
  if (status === 'SUCCESS') return <Badge variant="default">成功</Badge>
  if (status === 'RUNNING') return <Badge variant="secondary">运行中</Badge>
  if (status === 'WAITING') return <Badge variant="secondary">等待中</Badge>
  if (status === 'FAIL') return <Badge variant="destructive">失败</Badge>
  return <Badge variant="outline">{status}</Badge>
}
