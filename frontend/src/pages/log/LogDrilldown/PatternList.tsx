import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { LogPattern } from '@/types/log'

interface PatternListProps {
  patterns: LogPattern[]
  onPatternClick?: (pattern: string) => void
}

export function PatternList({ patterns, onPatternClick }: PatternListProps) {
  const [expanded, setExpanded] = useState(true)
  if (!patterns || patterns.length === 0) return null

  return (
    <div className="border-b">
      <button className="flex items-center gap-1.5 w-full px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Patterns
        <span className="ml-auto text-muted-foreground/60 normal-case tracking-normal">{patterns.length}</span>
      </button>
      {expanded && (
        <div className="max-h-[200px] overflow-y-auto">
          {patterns.map((p, i) => <PatternRow key={i} pattern={p} onClick={() => onPatternClick?.(p.pattern)} />)}
        </div>
      )}
    </div>
  )
}

function PatternRow({ pattern, onClick }: { pattern: LogPattern; onClick: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-start gap-3 px-4 py-1.5 text-xs hover:bg-muted/30 cursor-pointer group" onClick={onClick}>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-foreground/80 truncate">{pattern.pattern}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{pattern.count.toLocaleString()} 次 · {pattern.percentage.toFixed(1)}%</div>
      </div>
      <div className="w-[60px] shrink-0">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pattern.percentage, 100)}%` }} />
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(pattern.sample); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
        {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} className="text-muted-foreground" />}
      </button>
    </div>
  )
}
