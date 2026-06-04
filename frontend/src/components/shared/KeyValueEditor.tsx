import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

interface KeyValueEditorProps {
  value: Record<string, string>
  onChange: (val: Record<string, string>) => void
  readOnly?: boolean
  keyPlaceholder?: string
  valuePlaceholder?: string
}

export default function KeyValueEditor({
  value, onChange, readOnly = false, keyPlaceholder = '键', valuePlaceholder = '值',
}: KeyValueEditorProps) {
  const entries = Object.entries(value)

  const update = (idx: number, k: string, v: string) => {
    const next = [...entries]
    next[idx] = [k, v]
    onChange(Object.fromEntries(next))
  }

  const add = () => onChange({ ...value, '': '' })
  const remove = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx)
    onChange(Object.fromEntries(next))
  }

  return (
    <div className="space-y-2">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={k}
            onChange={e => update(i, e.target.value, v)}
            placeholder={keyPlaceholder}
            readOnly={readOnly}
            className="flex-1"
          />
          <Input
            value={v}
            onChange={e => update(i, k, e.target.value)}
            placeholder={valuePlaceholder}
            readOnly={readOnly}
            className="flex-1"
          />
          {!readOnly && (
            <Button variant="ghost" size="icon" onClick={() => remove(i)}>
              <Trash2 size={14} className="text-red-500" />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={add}>
          <Plus size={14} className="mr-1" />添加
        </Button>
      )}
    </div>
  )
}
