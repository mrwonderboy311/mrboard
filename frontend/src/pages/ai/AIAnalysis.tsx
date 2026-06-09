import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Brain, Plus, Play, RefreshCw, Search, Activity, Globe, Server, Zap, Wrench, Loader2 } from 'lucide-react'
import type { AnalysisHistory, AnalysisReport, ApiResponse } from '@/types'
import AlertList from './AlertList'
import AnalysisReportView from './AnalysisReport'
import ChatPanel from './ChatPanel'

interface SelectedAlert {
  name: string
  severity: string
  namespace: string
  labels: Record<string, string>
}

// Generate real queries based on alert name and context
function buildQueries(alert: SelectedAlert) {
  const ns = alert.namespace || 'default'
  const name = alert.name.toLowerCase()
  const queries: Array<{ query: string; label: string; icon: typeof Search; color: string }> = []

  if (name.includes('oom') || name.includes('memory')) {
    queries.push({ query: `{namespace="${ns}", container!=""} |= "OOMKilled" or |= "memory"`, label: 'Loki 日志', icon: Search, color: 'text-amber-500' })
  } else if (name.includes('crash') || name.includes('restart')) {
    queries.push({ query: `{namespace="${ns}", container!=""} |= "Error" or |= "panic" or |= "fatal"`, label: 'Loki 日志', icon: Search, color: 'text-amber-500' })
  } else {
    queries.push({ query: `{namespace="${ns}", container!=""} |= "error"`, label: 'Loki 日志', icon: Search, color: 'text-amber-500' })
  }

  if (name.includes('oom') || name.includes('memory')) {
    queries.push({ query: `container_memory_working_set_bytes{namespace="${ns}"}`, label: 'Prometheus', icon: Activity, color: 'text-blue-500' })
  } else if (name.includes('cpu') || name.includes('throttl')) {
    queries.push({ query: `rate(container_cpu_usage_seconds_total{namespace="${ns}"}[5m])`, label: 'Prometheus', icon: Activity, color: 'text-blue-500' })
  } else {
    queries.push({ query: `rate(http_requests_total{namespace="${ns}"}[5m])`, label: 'Prometheus', icon: Activity, color: 'text-blue-500' })
  }

  queries.push({ query: `service="${ns}"`, label: 'Tempo 链路', icon: Globe, color: 'text-purple-500' })
  queries.push({ query: `kubectl get pods -n ${ns}`, label: 'K8S Pod', icon: Server, color: 'text-green-500' })

  return queries
}

// Real-time progress from SSE tool call events
function LoadingProgress({ alertName, events }: { alertName: string; events: string[] }) {
  const defaultSteps = ['搜索历史记忆', '查询日志/指标', '查看 K8S 状态', '生成分析报告']
  const steps = events.length > 0 ? events : defaultSteps

  return (
    <Card>
      <CardContent className="pt-6 pb-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain size={24} className="text-primary animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
          <div>
            <div className="text-sm font-medium">AI 正在分析 "{alertName}"...</div>
            <div className="text-xs text-muted-foreground mt-1">
              {events.length > 0 ? `已执行 ${events.length} 个工具调用` : '正在准备分析...'}
            </div>
          </div>
        </div>
        <div className="space-y-2 pl-1">
          {steps.map((step, i) => {
            const isLatest = i === steps.length - 1
            const isDone = i < steps.length - 1
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 text-xs transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  isLatest ? 'text-primary font-medium' : 'text-foreground/60'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${
                  isLatest ? 'bg-primary animate-pulse scale-110' : 'bg-primary/60'
                }`} />
                {step}
                {isLatest && (
                  <RefreshCw size={10} className="animate-spin text-primary ml-1" />
                )}
                {isDone && (
                  <span className="text-[10px] text-green-500 ml-1">✓</span>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AIAnalysis() {
  const [clusterId] = useState(localStorage.getItem('clusterId') || '')
  const [histories, setHistories] = useState<AnalysisHistory[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<SelectedAlert | null>(null)
  const [autoAnalyze, setAutoAnalyze] = useState(false)
  const [autoFix, setAutoFix] = useState(false)
  const [progressEvents, setProgressEvents] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const cancelAnalysis = () => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await api<ApiResponse<AnalysisHistory[]>>(`/mrboard/ai/v1/history?clusterId=${clusterId}`)
      setHistories(res.data || [])
    } catch {}
  }

  useEffect(() => {
    if (clusterId) fetchHistory()
  }, [clusterId])

  // Find existing analysis for an alert
  const findAnalysis = (alertName: string, namespace: string): AnalysisHistory | undefined => {
    return histories.find(h =>
      h.alert_name === alertName &&
      (h.namespace === namespace || !namespace)
    )
  }

  // Convert AnalysisHistory to AnalysisReport
  // root_cause contains the full raw LLM response (not truncated), so use it as raw_response
  const historyToReport = (h: AnalysisHistory): AnalysisReport => ({
    summary: h.summary,
    severity: h.severity as AnalysisReport['severity'],
    root_cause: h.root_cause,
    evidence: (() => { try { return JSON.parse(h.evidence_json || '[]') } catch { return [] } })(),
    suggestions: (() => { try { return JSON.parse(h.suggestions_json || '[]') } catch { return [] } })(),
    related_incidents: [],
    raw_response: h.root_cause || h.summary, // root_cause has full raw text
    tokens_used: h.tokens_used,
    rounds: h.rounds,
  })

  // Click alert → check if analysis exists, show it directly
  const handleSelectAlert = (alertName: string, severity: string, namespace: string, labels: Record<string, string>) => {
    cancelAnalysis()
    setSelectedAlert({ name: alertName, severity, namespace, labels })
    setLoading(false)
    setProgressEvents([])

    // Check if we already have an analysis for this alert
    const existing = findAnalysis(alertName, namespace)
    if (existing) {
      setReport(historyToReport(existing))
      setSelectedId(existing.id)
    } else {
      setReport(null)
      setSelectedId(null)
    }
  }

  // Analyze with SSE progress
  const handleStartAnalysis = async () => {
    if (!selectedAlert) return
    cancelAnalysis()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setReport(null)
    setProgressEvents([])

    try {
      // Use SSE for real-time progress
      const params = new URLSearchParams({ clusterId })
      const resp = await fetch('/mrboard/ai/v1/analyze?' + params.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_name: selectedAlert.name,
          severity: selectedAlert.severity,
          namespace: selectedAlert.namespace,
          labels: selectedAlert.labels,
        }),
        signal: controller.signal,
      })

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      // Read SSE stream
      const reader = resp.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.step) {
                  setProgressEvents(prev => [...prev, data.step])
                }
              } catch {}
            }
          }
        }
      }

      // Reload history and find the result
      await fetchHistory()
      const existing = findAnalysis(selectedAlert.name, selectedAlert.namespace)
      if (existing) {
        setReport(historyToReport(existing))
        setSelectedId(existing.id)
        toast.success('分析完成')
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error((err as Error).message)
      }
    } finally {
      abortRef.current = null
      setLoading(false)
    }
  }

  // Re-analyze (force new analysis)
  const handleReanalyze = () => {
    setReport(null)
    setSelectedId(null)
    handleStartAnalysis()
  }

  // Load from history
  const loadDetail = async (id: number) => {
    cancelAnalysis()
    setSelectedId(id)
    setSelectedAlert(null)
    setLoading(false)
    setProgressEvents([])
    const h = histories.find(h => h.id === id)
    if (h) {
      setReport(historyToReport(h))
    }
  }

  const severityColor = (s: string) => {
    if (s === 'critical') return 'bg-red-100 text-red-700 border-red-200'
    if (s === 'warning') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain size={20} className="text-primary" />
          </div>
          <div>
            <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-primary/5 text-primary border border-primary/10 mb-3">
              AI Analysis
            </span>
            <h1 className="text-2xl font-bold tracking-tight">AI 智能分析</h1>
            <p className="text-sm text-muted-foreground">基于日志、指标、链路的智能告警分析</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoAnalyze ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoAnalyze(!autoAnalyze)}
            className="gap-1.5"
          >
            <Zap size={14} />
            {autoAnalyze ? '自动分析已开启' : '自动分析'}
          </Button>
          <Button
            variant={autoFix ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoFix(!autoFix)}
            className="gap-1.5"
            disabled
          >
            <Wrench size={14} />
            {autoFix ? '自动修复已开启' : '自动修复'}
          </Button>
          <Button onClick={() => { setSelectedAlert(null); setReport(null) }} size="sm" className="gap-1.5">
            <Plus size={14} />新建分析
          </Button>
        </div>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        {/* Left: alert list */}
        <div className="w-[300px] shrink-0 space-y-3 overflow-auto">
          <AlertList
            clusterId={clusterId}
            histories={histories}
            selectedId={selectedId}
            onSelect={loadDetail}
            onSelectAlert={handleSelectAlert}
            loading={loading}
          />
        </div>

        {/* Right: detail / report / prompt */}
        <div className="flex-1 min-w-0 space-y-4 overflow-auto">
          {/* State 1: Selected alert with existing analysis */}
          {selectedAlert && report && !loading && (
            <>
              {/* Alert info bar */}
              <Card>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={severityColor(selectedAlert.severity)}>
                      {selectedAlert.severity}
                    </Badge>
                    <span className="text-sm font-medium">{selectedAlert.name}</span>
                    {selectedAlert.namespace && (
                      <span className="text-xs text-muted-foreground font-mono">{selectedAlert.namespace}</span>
                    )}
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" onClick={handleReanalyze} className="gap-1.5 h-7">
                      <RefreshCw size={12} />重新分析
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <AnalysisReportView report={report} />
              <ChatPanel clusterId={clusterId} analysisId={selectedId} onReply={setReport} />
            </>
          )}

          {/* State 2: Selected alert without analysis — show detail + analyze button */}
          {selectedAlert && !report && !loading && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={severityColor(selectedAlert.severity)}>
                      {selectedAlert.severity}
                    </Badge>
                    <h2 className="text-base font-bold">{selectedAlert.name}</h2>
                  </div>
                  {selectedAlert.namespace && (
                    <div className="text-sm text-muted-foreground">
                      命名空间: <span className="font-mono">{selectedAlert.namespace}</span>
                    </div>
                  )}
                  {Object.keys(selectedAlert.labels).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(selectedAlert.labels).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-[10px] font-mono">
                          {k}={v}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="text-sm font-medium">AI 将自动执行以下查询</div>
                  <div className="space-y-2">
                    {buildQueries(selectedAlert).map((q, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <q.icon size={14} className={q.color + ' shrink-0'} />
                        <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded flex-1 truncate" title={q.query}>
                          {q.query}
                        </code>
                        <span className="text-[10px] text-muted-foreground shrink-0">{q.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button onClick={handleStartAnalysis} size="lg" className="gap-2 px-8" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {loading ? '分析中...' : '开始 AI 分析'}
                </Button>
              </div>
            </div>
          )}

          {/* State 3: Loading — real-time tool call progress */}
          {loading && (
            <LoadingProgress alertName={selectedAlert?.name || ''} events={progressEvents} />
          )}

          {/* State 4: History item selected (no alert context) */}
          {!selectedAlert && report && !loading && (
            <>
              <AnalysisReportView report={report} />
              <ChatPanel clusterId={clusterId} analysisId={selectedId} onReply={setReport} />
            </>
          )}

          {/* State 5: Empty */}
          {!selectedAlert && !report && !loading && (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center space-y-2">
                  <Brain size={48} className="text-muted-foreground/20 mx-auto" />
                  <p className="text-muted-foreground text-sm">选择左侧告警开始分析</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
