import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit, Send } from 'lucide-react'
import { AlertChannel } from '@/types/alert'
import { toast } from 'sonner'

interface Props {
  onAdd: () => void
  onEdit: (ch: AlertChannel) => void
}

export function AlertChannelList({ onAdd, onEdit }: Props) {
  const [channels, setChannels] = useState<AlertChannel[]>([])

  const fetchChannels = useCallback(async () => {
    try {
      const res = await api<{ code: number; data: AlertChannel[] }>('/mrboard/alert/v1/channels')
      setChannels(res.data || [])
    } catch { /* optional */ }
  }, [])

  useEffect(() => { fetchChannels() }, [fetchChannels])

  const testChannel = async (id: number) => {
    try {
      await api(`/mrboard/alert/v1/channels/${id}/test`, { method: 'POST' })
      toast.success('测试发送成功')
    } catch (err) {
      toast.error('测试发送失败: ' + (err as Error).message)
    }
  }

  const deleteChannel = async (id: number) => {
    if (!confirm('确定删除此渠道？')) return
    try {
      await api(`/mrboard/alert/v1/channels/${id}`, { method: 'DELETE' })
      fetchChannels()
    } catch { /* optional */ }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-muted-foreground">{channels.length} 个渠道</span>
        <Button size="sm" onClick={onAdd} className="h-7 text-xs">
          <Plus size={12} className="mr-1" />新建渠道
        </Button>
      </div>
      {channels.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">暂无通知渠道</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2">名称</th>
                <th className="text-left px-3 py-2">类型</th>
                <th className="text-left px-3 py-2">URL</th>
                <th className="text-center px-3 py-2">状态</th>
                <th className="text-right px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {channels.map(ch => (
                <tr key={ch.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{ch.name}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{ch.type}</Badge></td>
                  <td className="px-3 py-2 font-mono max-w-[200px] truncate">{ch.url}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge variant={ch.enabled ? 'default' : 'secondary'} className="text-[10px]">
                      {ch.enabled ? '启用' : '禁用'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => testChannel(ch.id)} className="h-6 w-6 p-0" title="测试">
                      <Send size={12} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(ch)} className="h-6 w-6 p-0">
                      <Edit size={12} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteChannel(ch.id)} className="h-6 w-6 p-0 text-destructive">
                      <Trash2 size={12} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
