import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Copy, Check, Save } from 'lucide-react'

interface YamlViewerProps {
  yaml: string
  readOnly?: boolean
  onUpdateUrl?: string
  onUpdated?: () => void
}

export default function YamlViewer({ yaml, readOnly = false, onUpdateUrl, onUpdated }: YamlViewerProps) {
  const [editMode, setEditMode] = useState(false)
  const [content, setContent] = useState(yaml)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(editMode ? content : yaml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async () => {
    if (!onUpdateUrl) return
    setSaving(true)
    try {
      await api(onUpdateUrl, {
        method: 'POST',
        body: content,
        headers: { 'Content-Type': 'text/plain' },
      })
      toast.success('更新成功')
      setEditMode(false)
      onUpdated?.()
    } catch (err) { toast.error((err as Error).message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
          {copied ? '已复制' : '复制'}
        </Button>
        {!readOnly && onUpdateUrl && (
          editMode ? (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save size={14} className="mr-1" />{saving ? '保存中...' : '保存'}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => { setContent(yaml); setEditMode(true) }}>
              编辑
            </Button>
          )
        )}
      </div>
      <textarea
        className="w-full font-mono text-xs leading-relaxed bg-zinc-950 text-emerald-400 border-zinc-800 p-4 rounded-lg border min-h-[400px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
        value={editMode ? content : yaml}
        onChange={e => setContent(e.target.value)}
        readOnly={!editMode}
        spellCheck={false}
      />
    </div>
  )
}
