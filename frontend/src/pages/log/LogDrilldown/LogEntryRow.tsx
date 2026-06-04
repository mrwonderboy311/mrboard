import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import type { LogEntry } from '@/types/log'

const LEVEL_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  error:   { color: 'text-destructive', bg: 'bg-destructive/10', label: 'ERROR' },
  warn:    { color: 'text-chart-3', bg: 'bg-chart-3/10', label: 'WARN' },
  warning: { color: 'text-chart-3', bg: 'bg-chart-3/10', label: 'WARN' },
  info:    { color: 'text-chart-2', bg: 'bg-chart-2/10', label: 'INFO' },
  debug:   { color: 'text-muted-foreground', bg: 'bg-muted/50', label: 'DEBUG' },
}

function getLevelStyle(level: string) {
  return LEVEL_STYLES[level?.toLowerCase()] || LEVEL_STYLES.info
}

function formatTimestamp(ts: string) {
  if (!ts) return '-'
  const d = new Date(Number(ts) / 1_000_000)
  return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

interface LogEntryRowProps {
  entry: LogEntry
  expanded: boolean
  onToggle: () => void
}

export function LogEntryRow({ entry, expanded, onToggle }: LogEntryRowProps) {
  const [copied, setCopied] = useState(false)
  const lvl = (entry.level || 'info').toLowerCase()
  const style = getLevelStyle(lvl)
  const hasLabels = entry.labels && Object.keys(entry.labels).length > 0

  return (
    <div className={`group border-b border-border/40 hover:bg-muted/30 transition-colors ${style.bg}`}>
      <div className="flex items-start gap-0 cursor-pointer px-3 py-[2px]" onClick={onToggle}>
        <span className="w-4 shrink-0 pt-0.5 text-muted-foreground/40">
          {hasLabels ? (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />) : null}
        </span>
        <span className="text-muted-foreground whitespace-nowrap shrink-0 w-[95px] text-[11px]">{formatTimestamp(entry.timestamp)}</span>
        <span className={`shrink-0 w-[42px] text-center text-[10px] font-bold uppercase ${style.color}`}>{style.label}</span>
        {(entry.service_name || entry.pod) && (
          <span className="shrink-0 text-[11px] text-primary/70 max-w-[140px] truncate mr-2" title={entry.pod || entry.service_name}>{entry.service_name || entry.pod}</span>
        )}
        <span className={`flex-1 min-w-0 break-all text-foreground/80 ${expanded ? 'whitespace-pre-wrap' : 'truncate'}`}>{entry.message}</span>
        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(entry.message); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} className="text-muted-foreground" />}
        </button>
      </div>
      {expanded && hasLabels && (
        <div className="pl-10 pr-3 pb-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
            {Object.entries(entry.labels).map(([k, v]) => (
              <span key={k}><span className="text-muted-foreground">{k}</span>=<span className="text-foreground">{String(v)}</span></span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
