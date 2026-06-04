import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { FilterState } from '@/types/log'

interface FilterTagBarProps {
  filters: FilterState
  onRemove: (type: 'label' | 'xLabel' | 'field' | 'xField', name: string, value?: string) => void
  onClearAll: () => void
}

export function FilterTagBar({ filters, onRemove, onClearAll }: FilterTagBarProps) {
  const tags: Array<{ type: 'label' | 'xLabel' | 'field' | 'xField'; name: string; value: string; exclude: boolean }> = []
  for (const [name, values] of Object.entries(filters.labels)) {
    for (const value of values) tags.push({ type: 'label', name, value, exclude: false })
  }
  for (const [name, values] of Object.entries(filters.excludeLabels)) {
    for (const value of values) tags.push({ type: 'xLabel', name, value, exclude: true })
  }
  for (const [name, values] of Object.entries(filters.fields)) {
    for (const value of values) tags.push({ type: 'field', name, value, exclude: false })
  }
  for (const [name, values] of Object.entries(filters.excludeFields)) {
    for (const value of values) tags.push({ type: 'xField', name, value, exclude: true })
  }
  if (filters.search) {
    tags.push({ type: 'field', name: 'search', value: filters.search, exclude: false })
  }
  if (tags.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tags.map((tag, i) => (
        <Badge key={`${tag.type}-${tag.name}-${tag.value}-${i}`} variant={tag.exclude ? 'destructive' : 'secondary'} className="text-[11px] px-1.5 py-0 gap-1">
          <span className="text-muted-foreground">{tag.name}:</span>
          <span className={tag.exclude ? 'line-through' : ''}>{tag.value}</span>
          <X size={10} className="cursor-pointer hover:text-foreground" onClick={() => {
            if (tag.name === 'search') onRemove('field', 'search')
            else onRemove(tag.type, tag.name, tag.value)
          }} />
        </Badge>
      ))}
      {tags.length > 1 && <button onClick={onClearAll} className="text-[11px] text-muted-foreground hover:text-foreground ml-1">清除全部</button>}
    </div>
  )
}
