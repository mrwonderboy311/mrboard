import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit } from 'lucide-react'
import { AlertRule, SEVERITY_CONFIG } from '@/types/alert'

interface Props {
  clusterId: string
  onAdd: () => void
  onEdit: (rule: AlertRule) => void
}

export function AlertRuleList({ clusterId, onAdd, onEdit }: Props) {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(false)

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (clusterId) params.set('clusterId', clusterId)
      params.set('limit', '100')
      const res = await api<{ code: number; data: AlertRule[] }>(
        '/mrboard/alert/v1/rules?' + params.toString()
      )
      setRules(res.data || [])
    } catch { /* optional */ }
    finally { setLoading(false) }
  }, [clusterId])

  useEffect(() => { fetchRules() }, [fetchRules])

  const toggleRule = async (id: number) => {
    try {
      await api(`/mrboard/alert/v1/rules/${id}/toggle`, { method: 'POST' })
      fetchRules()
    } catch { /* optional */ }
  }

  const deleteRule = async (id: number) => {
    if (!confirm('确定删除此规则？')) return
    try {
      await api(`/mrboard/alert/v1/rules/${id}`, { method: 'DELETE' })
      fetchRules()
    } catch { /* optional */ }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-muted-foreground">{rules.length} 条规则</span>
        <Button size="sm" onClick={onAdd} className="h-7 text-xs">
          <Plus size={12} className="mr-1" />新建规则
        </Button>
      </div>
      {loading ? (
        <div className="text-center text-muted-foreground py-8">加载中...</div>
      ) : rules.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">暂无告警规则</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2">名称</th>
                <th className="text-left px-3 py-2">表达式</th>
                <th className="text-left px-3 py-2">来源</th>
                <th className="text-left px-3 py-2">级别</th>
                <th className="text-left px-3 py-2">持续</th>
                <th className="text-center px-3 py-2">启用</th>
                <th className="text-right px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(rule => {
                const cfg = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.info
                return (
                  <tr key={rule.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{rule.name}</td>
                    <td className="px-3 py-2 font-mono max-w-[200px] truncate">{rule.expr}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">{rule.source}</Badge>
                    </td>
                    <td className={`px-3 py-2 font-bold ${cfg.color}`}>{cfg.label}</td>
                    <td className="px-3 py-2">{rule.duration}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => toggleRule(rule.id)} className={`w-8 h-4 rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-muted'}`}>
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(rule)} className="h-6 w-6 p-0">
                        <Edit size={12} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)} className="h-6 w-6 p-0 text-destructive">
                        <Trash2 size={12} />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
