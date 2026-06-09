import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown, FileText, Activity, Globe, Server, CheckCircle, Lightbulb, Search, Terminal, Shield, BookOpen } from 'lucide-react'
import type { AnalysisReport } from '@/types'

interface Props { report: AnalysisReport }

interface Suggestion {
  action: string
  risk: 'low' | 'medium' | 'high'
  command: string
}

// Parse raw_response JSON to extract structured data
function parseRawResponse(raw: string): Record<string, unknown> | null {
  if (!raw || raw.length < 10) return null

  const text = raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"')

  // Strategy 1: Try parsing the whole thing as JSON
  try { return JSON.parse(text) } catch {}

  // Strategy 2: Strip markdown code blocks and parse
  try {
    let cleaned = text
    const mdMatch = cleaned.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?\s*```/)
    if (mdMatch) cleaned = mdMatch[1]
    const start = cleaned.indexOf('{')
    if (start >= 0) {
      let depth = 0
      let end = -1
      for (let i = start; i < cleaned.length; i++) {
        if (cleaned[i] === '{') depth++
        if (cleaned[i] === '}') depth--
        if (depth === 0) { end = i; break }
      }
      if (end > start) return JSON.parse(cleaned.slice(start, end + 1))
    }
  } catch {}

  // Strategy 3: Try to find any JSON object in the text
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
  } catch {}

  return null
}

// Get a string value from multiple possible paths (English + Chinese keys)
function getString(obj: Record<string, unknown>, ...paths: string[]): string {
  for (const path of paths) {
    const val = obj[path]
    if (typeof val === 'string' && val) return val
    if (typeof val === 'number') return String(val)
  }
  return ''
}

// Get nested object
function getNested(obj: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const val = obj[key]
  return val && typeof val === 'object' && !Array.isArray(val) ? val as Record<string, unknown> : undefined
}

// Extract fields from parsed JSON (handles both English and Chinese LLM output)
function extractFields(parsed: Record<string, unknown> | null, report: AnalysisReport) {
  if (!parsed) {
    // Try to clean the raw text for display
    const rawText = (report.root_cause || report.summary || '').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"')
    // Strip markdown code blocks
    let cleanText = rawText.replace(/```(?:json|JSON)?[\s\S]*?```/g, '').trim()
    if (cleanText.includes('```')) cleanText = cleanText.slice(0, cleanText.indexOf('```')).trim()
    // Try extracting summary from JSON
    const nameMatch = rawText.match(/(?:告警名称|alert_name|name)"?\s*[":=]+\s*"?([^",}\n]+)/)
    const summary = nameMatch?.[1]?.trim() || report.summary || '分析完成'
    return {
      summary,
      severity: report.severity || 'info',
      rootCause: cleanText.length > 10 ? cleanText : '',
      actions: [] as string[],
      suggestions: report.suggestions || [],
      confidence: '',
      rawSections: [] as { label: string; icon: string; content: unknown }[],
    }
  }

  // Unwrap alert_analysis wrapper if present
  const aa = getNested(parsed, 'alert_analysis')
  const p = aa || parsed

  // Also check Chinese wrapper
  const overview = getNested(p, '告警概述') || getNested(p, 'alert_info') || {}
  const rootAnalysis = getNested(p, '根因分析') || getNested(p, 'root_cause_analysis') || getNested(p, 'analysis') || {}

  // Summary — extract from parsed JSON first, fall back to cleaned raw text
  const summary = getString(overview, '告警名称', 'alert_name', 'name')
    || getString(p, 'analysis_summary', 'summary', 'conclusion', '总结')
    || report.summary?.replace(/```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/g, '').trim().slice(0, 80)
    || '分析完成'

  // Severity
  const severity = report.severity
    || getString(overview, '严重级别', 'severity')
    || getString(p, 'severity')
    || 'info'

  // Root cause — extract from parsed JSON first, fall back to raw text
  let rootCause = getString(rootAnalysis, '直接原因', 'primary_cause', 'rootCause', 'root_cause')
  if (!rootCause) {
    const reasons = (rootAnalysis['可能原因'] || rootAnalysis['possible_reasons'] || rootAnalysis['possibleRootCauses'] || rootAnalysis['possibleCauses'] || []) as string[]
    if (Array.isArray(reasons) && reasons.length > 0) rootCause = reasons.join('\n')
  }
  if (!rootCause) {
    rootCause = getString(p, 'root_cause', 'rootCause', '总结', 'conclusion')
  }
  // Only fall back to raw text if nothing extracted
  if (!rootCause) {
    const raw = report.root_cause || ''
    // Clean markdown from raw text
    const cleaned = raw.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"')
      .replace(/```(?:json|JSON)?[\s\S]*?```/g, '').trim()
    rootCause = cleaned.length > 10 ? cleaned : ''
  }

  // Actions taken
  const actions = (p['actions_taken'] || []) as string[]

  // Suggestions - handle both English and Chinese formats
  let suggestions: Suggestion[] = report.suggestions || []
  if (suggestions.length === 0) {
    // Chinese format: 解决建议 with 步骤/操作/命令/目的
    const cnSuggestions = p['解决建议'] as Array<Record<string, unknown>> | undefined
    if (cnSuggestions && Array.isArray(cnSuggestions)) {
      suggestions = cnSuggestions.map(s => ({
        action: (s['操作'] || s['步骤'] || s['action'] || s['description'] || String(s)) as string,
        risk: (s['risk'] || 'medium') as 'low' | 'medium' | 'high',
        command: (s['命令'] || s['command'] || s['command_example'] || '') as string,
      }))
    }
    // English format
    if (suggestions.length === 0) {
      const raw = (p['suggestions'] || p['recommendations'] || p['resolution_recommendations'] || []) as Array<Record<string, string>>
      if (Array.isArray(raw)) {
        suggestions = raw.map(s => ({
          action: s.action || s.description || s.step || String(s),
          risk: (s.risk || 'medium') as 'low' | 'medium' | 'high',
          command: s.command || s.command_example || '',
        }))
      }
    }
    // Nested recommended/immediate actions
    if (suggestions.length === 0) {
      const nested = getNested(p, 'recommendedActions') || getNested(p, 'recommended_actions') || getNested(p, 'alert_analysis')
      if (nested) {
        const steps = (nested['immediateSteps'] || nested['immediate_actions'] || nested['immediateActions'] || nested['short_term_fixes'] || nested['resolutionOptions'] || nested['recommendations'] || []) as Array<Record<string, string>>
        if (Array.isArray(steps)) {
          suggestions = steps.map(s => ({
            action: s.action || s.description || s.step || String(s),
            risk: (s.risk || 'medium') as 'low' | 'medium' | 'high',
            command: s.command || s.command_example || '',
          }))
        }
      }
    }
  }

  // Confidence
  const confidence = getString(p, 'confidence')

  // Collect remaining sections for rich display
  const rawSections: { label: string; icon: string; content: unknown }[] = []
  const usedKeys = new Set(['alert_analysis', 'alert_info', 'root_cause_analysis', 'analysis', 'actions_taken',
    'suggestions', 'recommendations', 'resolution_recommendations', 'recommendedActions', 'recommended_actions',
    'confidence', 'summary', 'severity', 'root_cause', 'rootCause', 'conclusion',
    '告警概述', '根因分析', '解决建议', '预防措施', '总结',
  ])

  for (const [key, val] of Object.entries(p)) {
    if (usedKeys.has(key) || val === null || val === undefined || val === '') continue
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) continue
    if (Array.isArray(val) && val.length === 0) continue

    const icon = key.includes('预防') || key.includes('prevention') || key.includes('preventive') ? 'shield'
      : key.includes('观察') || key.includes('关键') || key.includes('observation') ? 'search'
      : key.includes('集群') || key.includes('概述') || key.includes('cluster') || key.includes('overview') ? 'server'
      : 'file'
    rawSections.push({ label: key, icon, content: val })
  }

  return { summary, severity, rootCause, actions, suggestions, confidence, rawSections }
}

// Render any value as beautiful markdown-like content
function RenderValue({ val, depth = 0 }: { val: unknown; depth?: number }) {
  if (val === null || val === undefined || val === '') return null

  if (typeof val === 'string') {
    // Handle multiline strings
    if (val.includes('\n')) {
      return (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {val.split('\n').map((line, i) => {
            // Numbered items
            if (/^\d+[\.\)]\s/.test(line)) {
              return <div key={i} className="flex gap-2 mt-1.5"><span className="text-primary font-medium shrink-0">{line.match(/^\d+[\.\)]/)?.[0]}</span><span>{line.replace(/^\d+[\.\)]\s*/, '')}</span></div>
            }
            return <div key={i}>{line}</div>
          })}
        </div>
      )
    }
    return <span className="text-sm">{val}</span>
  }

  if (typeof val === 'number' || typeof val === 'boolean') {
    return <span className="text-sm font-mono">{String(val)}</span>
  }

  if (Array.isArray(val)) {
    return (
      <div className="space-y-1.5">
        {val.map((item, i) => {
          const text = typeof item === 'string' ? item
            : typeof item === 'object' && item !== null
              ? (item['操作'] || item['步骤'] || item['action'] || item['description'] || JSON.stringify(item)) as string
              : String(item)
          const cmd = typeof item === 'object' && item !== null ? (item['命令'] || item['command'] || '') as string : ''
          const purpose = typeof item === 'object' && item !== null ? (item['目的'] || item['purpose'] || '') as string : ''
          const stepNum = typeof item === 'object' && item !== null ? item['步骤'] : undefined

          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-primary shrink-0 mt-0.5">
                {typeof stepNum === 'number' ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[10px] font-bold">{stepNum}</span>
                ) : (
                  <span className="block w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm">{text}</div>
                {cmd && <code className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-1 block bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded">{cmd}</code>}
                {purpose && <div className="text-xs text-muted-foreground mt-0.5">{purpose}</div>}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '')
    if (entries.length === 0) return null

    // Key-value info table
    if (entries.every(([, v]) => typeof v !== 'object')) {
      return (
        <div className="grid gap-1.5">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-2 text-sm">
              <span className="text-muted-foreground shrink-0 min-w-[5rem]">{k}</span>
              <span className="font-medium">{String(v)}</span>
            </div>
          ))}
        </div>
      )
    }

    // Nested object
    return (
      <div className="space-y-3">
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{k}</div>
            <div className="pl-3 border-l-2 border-border/50">
              <RenderValue val={v} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <span className="text-sm">{String(val)}</span>
}

// Render a section icon
function SectionIcon({ type }: { type: string }) {
  const cls = "h-4 w-4"
  switch (type) {
    case 'shield': return <Shield className={cls} />
    case 'search': return <Search className={cls} />
    case 'server': return <Server className={cls} />
    case 'terminal': return <Terminal className={cls} />
    default: return <FileText className={cls} />
  }
}

export default function AnalysisReportView({ report }: Props) {
  // Try parsing raw_response first, then root_cause, then summary
  const parsed = useMemo(() => {
    return parseRawResponse(report.raw_response || '')
      || parseRawResponse(report.root_cause || '')
      || parseRawResponse(report.summary || '')
  }, [report.raw_response, report.root_cause, report.summary])
  const fields = useMemo(() => extractFields(parsed, report), [parsed, report])

  const severityColor = (s: string) => {
    if (s === 'critical') return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
    if (s === 'warning') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
    return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
  }

  const riskColor = (r: string) => {
    if (r === 'high') return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30'
    if (r === 'medium') return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30'
    return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30'
  }

  const hasStructuredData = fields.summary || fields.rootCause || fields.suggestions.length > 0

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={severityColor(fields.severity)}>
              {fields.severity}
            </Badge>
            <h2 className="text-base font-bold">{fields.summary || '分析完成'}</h2>
            {fields.confidence && (
              <Badge variant="secondary" className="text-[10px] ml-auto">
                置信度: {fields.confidence}
              </Badge>
            )}
          </div>
          {fields.rootCause && (
            <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {fields.rootCause}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Token: {report.tokens_used}</span>
            <span>轮次: {report.rounds}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions Taken */}
      {fields.actions.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Search size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium">执行的操作</span>
            </div>
            <div className="space-y-2">
              {fields.actions.map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <CheckCircle size={12} className="text-green-500 mt-0.5 shrink-0" />
                  <span className="text-foreground/80">{action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {fields.suggestions.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={14} className="text-amber-500" />
              <span className="text-sm font-medium">建议操作</span>
            </div>
            <div className="space-y-2.5">
              {fields.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/30">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{s.action}</div>
                    {s.command && (
                      <code className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-1.5 block bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1.5 rounded-md">{s.command}</code>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className={`text-[10px] ${riskColor(s.risk)}`}>
                        {s.risk === 'high' ? '高风险' : s.risk === 'medium' ? '中风险' : '低风险'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional structured sections */}
      {fields.rawSections.map((section, i) => (
        <Card key={i}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3 text-muted-foreground">
              <SectionIcon type={section.icon} />
              <span className="text-sm font-medium">{section.label}</span>
            </div>
            <div className="pl-1">
              <RenderValue val={section.content} />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Evidence */}
      {report.evidence && report.evidence.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium">证据</span>
            </div>
            <div className="space-y-2">
              {report.evidence.map((e, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30">
                  <div className="text-muted-foreground mt-0.5 shrink-0">
                    {e.type === 'log' ? <FileText size={14} /> : e.type === 'metric' ? <Activity size={14} /> : e.type === 'trace' ? <Globe size={14} /> : <Server size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-muted-foreground mb-1">{e.source}</div>
                    <div className="text-xs font-mono whitespace-pre-wrap break-all max-h-[150px] overflow-auto">{e.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw text fallback — only show if no structured data at all */}
      {!hasStructuredData && fields.rawSections.length === 0 && (report.raw_response || report.root_cause) && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium">分析结果</span>
            </div>
            <div className="text-sm whitespace-pre-wrap bg-muted/30 p-4 rounded-lg max-h-[500px] overflow-auto leading-relaxed">
              {(report.raw_response || report.root_cause || '')
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/```(?:json|JSON)?\s*\n?([\s\S]*?)\n?\s*```/, '$1')
                .trim()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs text-muted-foreground">这个分析有帮助吗？</span>
        <Button variant="outline" size="sm" className="h-7 gap-1"><ThumbsUp size={12} />有用</Button>
        <Button variant="outline" size="sm" className="h-7 gap-1"><ThumbsDown size={12} />不准确</Button>
      </div>
    </div>
  )
}
