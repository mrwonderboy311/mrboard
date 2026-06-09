import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function PodTerminal() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const podName = params.get('podName') || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&podName=${podName}`

  const [container, setContainer] = useState('')
  const [containers, setContainers] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const termRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [output, setOutput] = useState('')
  const [input, setInput] = useState('')

  const fetchContainers = async () => {
    try {
      const data = await api<any>('/mrboard/pod/v1/ContainerList?' + baseQuery)
      const list = Array.isArray(data) ? data : data.data || []
      setContainers(list.map((c: any) => typeof c === 'string' ? c : c.name))
      if (list.length > 0) setContainer(typeof list[0] === 'string' ? list[0] : list[0].name)
    } catch { /* optional */ }
  }

  useEffect(() => {
    if (!podName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchContainers()
    return () => { wsRef.current?.close() }
  }, [podName, nameSpace])

  const connect = () => {
    if (!container) { toast.error('请选择容器'); return }
    const wsUrl = `ws://${window.location.host}/ws/pod/terminal?clusterId=${clusterId}&nameSpace=${nameSpace}&podName=${podName}&container=${container}`
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => { setConnected(true); setOutput('') }
    ws.onmessage = (e) => {
      setOutput(prev => prev + e.data)
      if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight
    }
    ws.onerror = () => { toast.error('连接失败'); setConnected(false) }
    ws.onclose = () => { setConnected(false) }
    wsRef.current = ws
  }

  const disconnect = () => { wsRef.current?.close(); setConnected(false) }

  const sendCommand = () => {
    if (!wsRef.current || !connected) return
    wsRef.current.send(input + '\n')
    setInput('')
  }

  useEffect(() => {
    return () => { wsRef.current?.close() }
  }, [])

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft size={14} className="mr-1" />返回</Button>
        <div>
          <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-primary/5 text-primary border border-primary/10 mb-1">K8s</span>
          <h1 className="text-2xl font-bold">终端 - {podName}</h1>
        </div>
      </div>
      <div className="flex gap-3 items-center">
        {containers.length > 1 && (
          <Select value={container} onValueChange={v => { if (v) setContainer(v) }} disabled={connected}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {containers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {connected ? (
          <Button variant="destructive" onClick={disconnect}>断开连接</Button>
        ) : (
          <Button onClick={connect}>连接终端</Button>
        )}
      </div>
      <div ref={termRef} className="bg-slate-950 rounded-lg p-4 h-[500px] overflow-auto font-mono text-xs text-green-400 whitespace-pre-wrap break-all">
        {output || (connected ? '等待输出...' : '点击"连接终端"开始')}
      </div>
      {connected && (
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCommand() } }}
            className="flex-1 h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono resize-none"
            placeholder="输入命令，按 Enter 发送..."
          />
          <Button onClick={sendCommand}>发送</Button>
        </div>
      )}
    </div>
  )
}
