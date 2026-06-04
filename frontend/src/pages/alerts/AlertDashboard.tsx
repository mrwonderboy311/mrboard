import { useState } from 'react'
import { ActiveAlerts } from './AlertDashboard/ActiveAlerts'
import { AlertRuleList } from './AlertDashboard/AlertRuleList'
import { AlertRuleForm } from './AlertDashboard/AlertRuleForm'
import { AlertChannelList } from './AlertDashboard/AlertChannelList'
import { AlertChannelForm } from './AlertDashboard/AlertChannelForm'
import { AlertHistory } from './AlertDashboard/AlertHistory'
import type { AlertRule, AlertChannel } from '@/types/alert'

export default function AlertDashboard() {
  const clusterId = localStorage.getItem('clusterId') || ''
  const [tab, setTab] = useState<'active' | 'rules' | 'channels' | 'history'>('active')
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [editingChannel, setEditingChannel] = useState<AlertChannel | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey(k => k + 1)

  const tabs = [
    { key: 'active' as const, label: '活跃告警' },
    { key: 'rules' as const, label: '告警规则' },
    { key: 'channels' as const, label: '通知渠道' },
    { key: 'history' as const, label: '告警历史' },
  ]

  return (
    <div className="p-4">
      <div className="flex gap-1 border-b mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'active' && <ActiveAlerts clusterId={clusterId} />}

      {tab === 'rules' && (
        showRuleForm ? (
          <AlertRuleForm
            clusterId={clusterId}
            rule={editingRule}
            onSaved={() => { setShowRuleForm(false); setEditingRule(null); refresh() }}
            onCancel={() => { setShowRuleForm(false); setEditingRule(null) }}
          />
        ) : (
          <AlertRuleList key={refreshKey} clusterId={clusterId}
            onAdd={() => setShowRuleForm(true)}
            onEdit={(rule) => { setEditingRule(rule); setShowRuleForm(true) }}
          />
        )
      )}

      {tab === 'channels' && (
        showChannelForm ? (
          <AlertChannelForm
            channel={editingChannel}
            onSaved={() => { setShowChannelForm(false); setEditingChannel(null); refresh() }}
            onCancel={() => { setShowChannelForm(false); setEditingChannel(null) }}
          />
        ) : (
          <AlertChannelList key={refreshKey}
            onAdd={() => setShowChannelForm(true)}
            onEdit={(ch) => { setEditingChannel(ch); setShowChannelForm(true) }}
          />
        )
      )}

      {tab === 'history' && <AlertHistory key={refreshKey} clusterId={clusterId} />}
    </div>
  )
}
