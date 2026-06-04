import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'

export default function JenkinsLog() {
  const [searchParams] = useSearchParams()
  const cicdId = searchParams.get('cicdId') || ''
  const buildId = searchParams.get('buildId') || ''

  const [logContent, setLogContent] = useState('')
  const [loading, setLoading] = useState(true)
  const logRef = useRef<HTMLPreElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLog = async () => {
    try {
      const url = `/cicd/jks/v1/BuildLog?cicdId=${cicdId}${buildId ? `&buildId=${buildId}` : ''}`
      const resp = await api<string>(url)
      if (resp) {
        setLogContent(typeof resp === 'string' ? resp : JSON.stringify(resp))
        setTimeout(() => {
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
        }, 100)
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
  }, [cicdId, buildId])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Jenkins构建日志</h1>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : (
            <div className="h-[78vh] overflow-auto bg-zinc-950 rounded-md">
              <pre
                ref={logRef}
                className="p-4 text-sm text-green-400 font-mono whitespace-pre-wrap break-all"
              >
                {logContent || '暂无日志'}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
