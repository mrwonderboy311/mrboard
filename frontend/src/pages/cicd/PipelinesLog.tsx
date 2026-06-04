import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import type { PipelineLog } from '@/types'

export default function PipelinesLog() {
  const [searchParams] = useSearchParams()
  const cicdId = searchParams.get('cicdId') || ''
  const pipelineRunId = searchParams.get('pipelineRunId') || ''
  const jobId = searchParams.get('jobId') || ''

  const [logContent, setLogContent] = useState('')
  const [loading, setLoading] = useState(true)
  const logRef = useRef<HTMLPreElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const buildUrl = () => {
    const params = new URLSearchParams()
    if (cicdId) params.set('cicdId', cicdId)
    if (pipelineRunId) params.set('pipelineRunId', pipelineRunId)
    if (jobId) params.set('jobId', jobId)
    return `/cicd/pipeline/GetJobLog?${params.toString()}`
  }

  const fetchLog = async () => {
    try {
      const resp = await api<{ log: PipelineLog }>(buildUrl())
      if (resp.log?.content) {
        setLogContent(resp.log.content)
        setTimeout(() => {
          if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight
          }
        }, 100)
        if (resp.log.more === false) {
          if (timerRef.current) clearInterval(timerRef.current)
        }
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!cicdId) return
    setLoading(true)
    fetchLog().finally(() => setLoading(false))

    timerRef.current = setInterval(fetchLog, 2000)

    const timeout = setTimeout(() => {
      if (timerRef.current) clearInterval(timerRef.current)
    }, 3600000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      clearTimeout(timeout)
    }
  }, [cicdId, pipelineRunId, jobId])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">流水线日志</h1>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : (
            <div className="h-[78vh] overflow-auto bg-zinc-950 rounded-md">
              <pre
                ref={logRef}
                className="p-4 text-sm text-green-400 font-mono whitespace-pre-wrap break-all"
                dangerouslySetInnerHTML={{ __html: logContent || '暂无日志' }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
