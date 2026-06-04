import { useState, useRef, useCallback, useEffect } from 'react'
import type { LogEntry } from '@/types/log'
import { LogEntryRow } from './LogEntryRow'

interface LogEntryListProps {
  logs: LogEntry[]
  loading: boolean
  total: number
}

const ROW_HEIGHT = 28 // px per collapsed row
const OVERSCAN = 10   // extra rows above/below viewport

export function LogEntryList({ logs, loading, total }: LogEntryListProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)

  const toggleRow = useCallback((idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  // Measure container height
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

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

  const displayLogs = logs.slice(0, 500)
  const totalHeight = displayLogs.length * ROW_HEIGHT
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + OVERSCAN * 2
  const endIdx = Math.min(displayLogs.length, startIdx + visibleCount)
  const visibleLogs = displayLogs.slice(startIdx, endIdx)

  return (
    <div className="flex-1 flex flex-col font-mono text-[12px] leading-[1.6]">
      <div className="shrink-0 flex items-center gap-3 px-4 py-1 border-b text-[11px] text-muted-foreground bg-muted/30">
        <span>{total.toLocaleString()} 条日志{logs.length > 500 ? ` (显示前 500 条)` : ''}</span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          {visibleLogs.map((log, i) => {
            const idx = startIdx + i
            return (
              <div
                key={idx}
                style={{ position: 'absolute', top: `${idx * ROW_HEIGHT}px`, left: 0, right: 0 }}
              >
                <LogEntryRow
                  entry={log}
                  expanded={expandedRows.has(idx)}
                  onToggle={() => toggleRow(idx)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
