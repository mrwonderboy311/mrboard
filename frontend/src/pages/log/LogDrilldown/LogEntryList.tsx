import { useState } from 'react'
import { LogEntry } from '@/types/log'
import { LogEntryRow } from './LogEntryRow'

interface LogEntryListProps {
  logs: LogEntry[]
  loading: boolean
  total: number
}

export function LogEntryList({ logs, loading, total }: LogEntryListProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <span className="animate-spin mr-2">⏳</span>加载中...
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
        <span>暂无日志</span>
        <span className="text-xs">尝试调整时间范围或过滤条件</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto font-mono text-[12px] leading-[1.6]">
      <div className="shrink-0 flex items-center gap-3 px-4 py-1 border-b text-[11px] text-muted-foreground bg-muted/30">
        <span>{total.toLocaleString()} 条日志{logs.length > 500 ? ` (显示前 500 条)` : ''}</span>
      </div>
      {logs.slice(0, 500).map((log, idx) => (
        <LogEntryRow key={idx} entry={log} expanded={expandedRows.has(idx)} onToggle={() => toggleRow(idx)} />
      ))}
    </div>
  )
}
