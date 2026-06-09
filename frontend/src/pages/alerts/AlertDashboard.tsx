import { useState } from 'react'
import { ActiveAlerts } from './AlertDashboard/ActiveAlerts'
import { AlertRuleList } from './AlertDashboard/AlertRuleList'
import { AlertRuleForm } from './AlertDashboard/AlertRuleForm'
import { AlertChannelList } from './AlertDashboard/AlertChannelList'
import { AlertChannelForm } from './AlertDashboard/AlertChannelForm'
import { AlertHistory } from './AlertDashboard/AlertHistory'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import type { AlertRule, AlertChannel } from '@/types/alert'

export default function AlertDashboard() {
  const clusterId = localStorage.getItem('clusterId') || ''
  const [tab, setTab] = useState('active')
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [editingChannel, setEditingChannel] = useState<AlertChannel | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = () => setRefreshKey(k => k + 1)

  return (
    <div className="p-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="告警管理" eyebrow="Alerts" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <TabsTrigger value="active" className="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">活跃告警</TabsTrigger>
          <TabsTrigger value="rules" className="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">告警规则</TabsTrigger>
          <TabsTrigger value="channels" className="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">通知渠道</TabsTrigger>
          <TabsTrigger value="history" className="transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">告警历史</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ActiveAlerts clusterId={clusterId} />
        </TabsContent>

        <TabsContent value="rules">
          {showRuleForm ? (
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
          )}
        </TabsContent>

        <TabsContent value="channels">
          {showChannelForm ? (
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
          )}
        </TabsContent>

        <TabsContent value="history">
          <AlertHistory key={refreshKey} clusterId={clusterId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
