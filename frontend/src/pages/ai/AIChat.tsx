import { useState, useRef, useEffect } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send, Trash, Plus, Brain, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'bot'
  content: string
}

const MODELS = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'claude-3', label: 'Claude 3' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'qwen-max', label: '通义千问Max' },
  { value: 'qwen-plus', label: '通义千问Plus' },
]

const WELCOME: Message = {
  role: 'bot',
  content: `你好！我是AI助手，有什么可以帮助你的吗？

我可以帮助你：
- 解答Kubernetes相关问题
- 解释YAML配置文件
- 提供运维建议
- 回答技术问题`,
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [model, setModel] = useState('gpt-3.5-turbo')
  const [sending, setSending] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text) {
      toast.error('请输入消息内容')
      return
    }

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const resp = await api<{ reply: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, model }),
      })
      setMessages(prev => [...prev, { role: 'bot', content: resp.reply || '无响应' }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: '请求失败，请稍后重试。' }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      sendMessage()
    }
  }

  const handleNewSession = () => {
    setMessages([WELCOME])
    toast.success('已创建新会话')
  }

  const handleClear = () => {
    setInput('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-[fadeInUp_0.3s_ease-out]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-primary/5 text-primary border border-primary/10 mb-3">
            AI Assistant
          </span>
          <h1 className="text-2xl font-bold">AI助手</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={model} onValueChange={(v) => v && setModel(v)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleNewSession}>
            <Plus size={14} className="mr-1" />新建会话
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatRef}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'bot' && (
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Brain size={16} />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start gap-2">
              <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Brain size={16} />
                </AvatarFallback>
              </Avatar>
              <div className="px-4 py-2 rounded-2xl bg-muted text-muted-foreground rounded-bl-sm">
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1.4s_ease-in-out_infinite] [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1.4s_ease-in-out_infinite] [animation-delay:160ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1.4s_ease-in-out_infinite] [animation-delay:320ms]" />
                  </span>
                  AI正在思考中...
                </span>
              </div>
            </div>
          )}
        </CardContent>

        <div className="border-t p-3 flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (按Ctrl+Enter发送)"
            className="flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none h-20"
          />
          <div className="flex flex-col gap-1">
            <Button onClick={sendMessage} disabled={sending} className="gap-1.5">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? '发送中' : '发送'}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              <Trash size={14} className="mr-1" />清空
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
