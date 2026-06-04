import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { DetectedFieldValue } from '@/types/log'

interface FacetGroupProps {
  title: string
  values: DetectedFieldValue[]
  selected: string[]
  excludeSelected?: string[]
  onToggle: (value: string, exclude: boolean) => void
  defaultExpanded?: boolean
}

export function FacetGroup({ title, values, selected, excludeSelected = [], onToggle, defaultExpanded = true }: FacetGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showAll, setShowAll] = useState(false)
  const displayValues = showAll ? values : values.slice(0, 10)

  return (
    <div className="border-b border-border/50">
      <button
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
        <span className="ml-auto text-muted-foreground/60 normal-case tracking-normal">{values.length}</span>
      </button>
      {expanded && (
        <div className="pb-1">
          {displayValues.map(v => {
            const isSelected = selected.includes(v.value)
            const isExcluded = excludeSelected.includes(v.value)
            return (
              <button
                key={v.value}
                onClick={(e) => onToggle(v.value, e.shiftKey)}
                className={`flex items-center gap-2 w-full px-3 py-1 text-xs transition-colors ${
                  isExcluded ? 'bg-destructive/10 text-destructive line-through'
                    : isSelected ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-foreground hover:bg-muted/50'
                }`}
              >
                <span className={`w-3 h-3 rounded border shrink-0 flex items-center justify-center ${
                  isExcluded ? 'bg-destructive border-destructive'
                    : isSelected ? 'bg-primary border-primary'
                    : 'border-muted-foreground/30'
                }`}>
                  {isSelected && <span className="text-[8px] text-primary-foreground">✓</span>}
                  {isExcluded && <span className="text-[8px] text-destructive-foreground">✕</span>}
                </span>
                <span className="truncate flex-1 text-left">{v.value}</span>
                {v.count > 1 && <span className="text-muted-foreground/60 text-[10px]">{v.count > 999 ? `${(v.count/1000).toFixed(1)}k` : v.count}</span>}
              </button>
            )
          })}
          {values.length > 10 && !showAll && (
            <button onClick={() => setShowAll(true)} className="w-full px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50">
              Show more ({values.length - 10} more)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
