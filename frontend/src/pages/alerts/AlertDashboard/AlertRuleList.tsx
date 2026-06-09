import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Edit, RefreshCw, CheckCircle, Database, Info } from 'lucide-react'
import type { AlertRule } from '@/types/alert'
import { SEVERITY_CONFIG } from '@/types/alert'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface Props {
  clusterId: string
  onAdd: () => void
  onEdit: (rule: AlertRule) => void
}

export function AlertRuleList({ clusterId, onAdd, onEdit }: Props) {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (clusterId) params.set('clusterId', clusterId)
      params.set('limit', '200')
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

  const deleteRule = async () => {
    if (deleteTarget === null) return
    try {
      await api(`/mrboard/alert/v1/rules/${deleteTarget}`, { method: 'DELETE' })
      fetchRules()
    } catch { /* optional */ }
  }

  const mrboardRules = rules.filter(r => r.source === 'mrboard')
  const importedRules = rules.filter(r => r.source !== 'mrboard')

  return (
    <div className="space-y-4">
      {/* Sync status banner */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-primary" />
                <span className="text-sm font-medium">Prometheus 同步状态</span>
              </div>
              <Badge variant={mrboardRules.length > 0 ? 'default' : 'secondary'} className="text-[10px]">
                {mrboardRules.length > 0 ? `已同步 ${mrboardRules.length} 条` : '未同步'}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                导入规则 {importedRules.length} 条
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchRules} className="h-7 text-xs gap-1">
                <RefreshCw size={12} />刷新
              </Button>
            </div>
          </div>
          {mrboardRules.length === 0 && (
            <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
              <Info size={14} className="shrink-0 mt-0.5" />
              <div>
                <p>通过 MRBoard 创建的规则会自动同步到 Prometheus（PrometheusRule CRD）。</p>
                <p className="mt-0.5">从 Prometheus 导入的规则不会回写，仅用于查看。</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule list header */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{rules.length} 条规则</span>
        <Button size="sm" onClick={onAdd} className="h-7 text-xs gap-1">
          <Plus size={12} />新建规则
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">加载中...</div>
      ) : rules.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">暂无告警规则</div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => {
            const cfg = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.info
            const isMRBoard = rule.source === 'mrboard'
            return (
              <div key={rule.id} className="group rounded-xl border border-border/60 bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 px-4 py-3">
                <div className="flex items-center gap-4">
                  {/* Left: rule info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{rule.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                      {isMRBoard ? (
                        <Badge variant="default" className="text-[10px] gap-0.5">
                          <CheckCircle size={10} />已同步
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">导入</Badge>
                      )}
                      {!rule.enabled && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">已禁用</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-xs font-mono text-muted-foreground truncate max-w-md">{rule.expr}</code>
                      <span className="text-[10px] text-muted-foreground">持续: {rule.duration}</span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button onClick={() => toggleRule(rule.id)}
                      className={`w-9 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-muted'}`}
                      title={rule.enabled ? '禁用' : '启用'}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="编辑"
                      onClick={() => onEdit(rule)}>
                      <Edit size={15} />
                    </Button>
                    <div className="w-px h-4 bg-border mx-0.5" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="删除"
                      onClick={() => setDeleteTarget(rule.id)}>
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="确认删除"
        description="删除 MRBoard 规则将同时从 Prometheus 移除。确认删除？"
        variant="destructive"
        onConfirm={deleteRule}
      />
    </div>
  )
}
