import { Filter } from 'lucide-react'
import { FacetGroup } from './FacetGroup'
import { LabelWithValues, DetectedField, DetectedFieldValue } from '@/types/log'

interface FacetPanelProps {
  labels: LabelWithValues[]
  fields: DetectedField[]
  levels: Record<string, number>
  selectedLabels: Record<string, string[]>
  excludeLabels: Record<string, string[]>
  selectedFields: Record<string, string[]>
  excludeFields: Record<string, string[]>
  selectedLevels: string[]
  onToggleLabel: (name: string, value: string, exclude: boolean) => void
  onToggleField: (name: string, value: string, exclude: boolean) => void
  onToggleLevel: (level: string) => void
}

export function FacetPanel({
  labels, fields, levels,
  selectedLabels, excludeLabels, selectedFields, excludeFields, selectedLevels,
  onToggleLabel, onToggleField, onToggleLevel,
}: FacetPanelProps) {
  const levelValues: DetectedFieldValue[] = Object.entries(levels)
    .map(([level, count]) => ({ value: level, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="w-[240px] shrink-0 border-r bg-card flex flex-col overflow-hidden">
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter size={14} className="text-muted-foreground" />
          筛选
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <FacetGroup title="Levels" values={levelValues} selected={selectedLevels} onToggle={(v) => onToggleLevel(v)} />
        {labels.map(label => (
          <FacetGroup key={label.name} title={label.name} values={label.values}
            selected={selectedLabels[label.name] || []} excludeSelected={excludeLabels[label.name] || []}
            onToggle={(v, exclude) => onToggleLabel(label.name, v, exclude)} />
        ))}
        {fields.length > 0 && (
          <>
            <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b">Detected Fields</div>
            {fields.map(field => (
              <FacetGroup key={field.name} title={field.name} values={field.values}
                selected={selectedFields[field.name] || []} excludeSelected={excludeFields[field.name] || []}
                onToggle={(v, exclude) => onToggleField(field.name, v, exclude)} defaultExpanded={false} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
