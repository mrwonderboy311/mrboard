import { useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Send, Brain } from 'lucide-react'
import type { AnalysisReport, ApiResponse } from '@/types'

interface Props {
  clusterId: string
  analysisId: number | null
  onReply: (report: AnalysisReport) => void
}

export default function ChatPanel({ clusterId, analysisId, onReply }: Props) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return
    setLoading(true)
    try {
      const res = await api<ApiResponse<AnalysisReport>>('/mrboard/ai/v1/chat?' + new URLSearchParams({ clusterId }), {
        method: 'POST',
        body: JSON.stringify({ analysis_id: analysisId, message: message.trim() }),
      })
      onReply(res.data)
      setMessage('')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-muted-foreground shrink-0" />
          <Input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} placeholder="继续提问，如：帮我查下这个 Pod 最近的日志" className="h-9" disabled={loading} />
          <Button size="sm" onClick={handleSend} disabled={loading || !message.trim()} className="h-9 px-3 shrink-0">{loading ? '分析中...' : <Send size={14} />}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
