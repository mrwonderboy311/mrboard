import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertRule } from '@/types/alert'

interface Props {
  clusterId: string
  rule?: AlertRule | null
  onSaved: () => void
  onCancel: () => void
}

export function AlertRuleForm({ clusterId, rule, onSaved, onCancel }: Props) {
  const [name, setName] = useState(rule?.name || '')
  const [expr, setExpr] = useState(rule?.expr || '')
  const [source, setSource] = useState(rule?.source || 'prometheus')
  const [duration, setDuration] = useState(rule?.duration || '5m')
  const [severity, setSeverity] = useState(rule?.severity || 'warning')
  const [summary, setSummary] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name || !expr) return
    setSaving(true)
    try {
      const annotations = JSON.stringify({ summary })
      const body = new URLSearchParams({ name, expr, source, duration, severity, annotations })
      if (!rule) body.set('clusterId', clusterId)

      if (rule) {
        await api(`/mrboard/alert/v1/rules/${rule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
      } else {
        await api('/mrboard/alert/v1/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
      }
      onSaved()
    } catch { /* optional */ }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3 border rounded-lg p-4">
      <h3 className="text-sm font-semibold">{rule ? '编辑告警规则' : '新建告警规则'}</h3>
      <div>
        <label className="text-xs text-muted-foreground">规则名称 *</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="HighCPUUsage" className="h-8 text-xs" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">来源</label>
          <Select value={source} onValueChange={v => setSource(v as 'prometheus' | 'loki')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prometheus" className="text-xs">Prometheus</SelectItem>
              <SelectItem value="loki" className="text-xs">Loki</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">严重级别</label>
          <Select value={severity} onValueChange={v => setSeverity(v as 'critical' | 'warning' | 'info')}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="critical" className="text-xs">Critical</SelectItem>
              <SelectItem value="warning" className="text-xs">Warning</SelectItem>
              <SelectItem value="info" className="text-xs">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">持续时间</label>
          <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="5m" className="h-8 text-xs" />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">表达式 *</label>
        <textarea value={expr} onChange={e => setExpr(e.target.value)}
          placeholder={source === 'prometheus' ? 'sum(rate(http_requests_total{code=~"5.."}[5m])) > 100' : '{namespace="default"} |= "ERROR"'}
          className="w-full font-mono text-xs min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">摘要</label>
        <Input value={summary} onChange={e => setSummary(e.target.value)} placeholder="告警描述" className="h-8 text-xs" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs">取消</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !name || !expr} className="h-7 text-xs">
          {saving ? '保存中...' : rule ? '更新' : '创建'}
        </Button>
      </div>
    </div>
  )
}
