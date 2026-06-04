import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AlertChannel } from '@/types/alert'

interface Props {
  channel?: AlertChannel | null
  onSaved: () => void
  onCancel: () => void
}

export function AlertChannelForm({ channel, onSaved, onCancel }: Props) {
  const [name, setName] = useState(channel?.name || '')
  const [url, setUrl] = useState(channel?.url || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name || !url) return
    setSaving(true)
    try {
      const body = new URLSearchParams({ name, type: 'webhook', url })
      if (channel) {
        await api(`/mrboard/alert/v1/channels/${channel.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        })
      } else {
        await api('/mrboard/alert/v1/channels', {
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
      <h3 className="text-sm font-semibold">{channel ? '编辑通知渠道' : '新建通知渠道'}</h3>
      <div>
        <label className="text-xs text-muted-foreground">渠道名称 *</label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="钉钉机器人" className="h-8 text-xs" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Webhook URL *</label>
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." className="h-8 text-xs" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="h-7 text-xs">取消</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !name || !url} className="h-7 text-xs">
          {saving ? '保存中...' : channel ? '更新' : '创建'}
        </Button>
      </div>
    </div>
  )
}
