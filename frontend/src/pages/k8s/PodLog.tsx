import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, RefreshCw, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PodLog() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const nameSpace = params.get('nameSpace') || ''
  const podName = params.get('podName') || ''
  const baseQuery = `clusterId=${clusterId}&nameSpace=${nameSpace}&podName=${podName}`

  const [logs, setLogs] = useState('')
  const [loading, setLoading] = useState(false)
  const [container, setContainer] = useState('')
  const [tailLines, setTailLines] = useState('500')
  const [containers, setContainers] = useState<string[]>([])
  const logRef = useRef<HTMLPreElement>(null)

  const fetchContainers = async () => {
    try {
      const data = await api<any>('/mrboard/pod/v1/ContainerList?' + baseQuery)
      const list = Array.isArray(data) ? data : data.data || []
      setContainers(list.map((c: any) => typeof c === 'string' ? c : c.name))
      if (list.length > 0 && !container) {
        setContainer(typeof list[0] === 'string' ? list[0] : list[0].name)
      }
    } catch { /* optional */ }
  }

  const fetchLogs = async () => {
    setLoading(true)
    try {
      let url = '/mrboard/pod/v1/Log?' + baseQuery + '&tailLines=' + tailLines
      if (container) url += '&container=' + container
      const data = await api<any>(url)
      setLogs(typeof data === 'string' ? data : data.log || data.data || JSON.stringify(data))
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!podName || !nameSpace) { toast.error('缺少必要参数'); return }
    fetchContainers()
  }, [podName, nameSpace])

  useEffect(() => {
    if (container) fetchLogs()
  }, [container])

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${podName}.log`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft size={14} className="mr-1" />返回</Button>
        <div>
          <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-primary/5 text-primary border border-primary/10 mb-1">K8s</span>
          <h1 className="text-2xl font-bold">日志 - {podName}</h1>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        {containers.length > 1 && (
          <Select value={container} onValueChange={v => { if (v) setContainer(v) }}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {containers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Input value={tailLines} onChange={e => setTailLines(e.target.value)} className="w-24" placeholder="行数" />
        <Button onClick={fetchLogs} disabled={loading}>{loading ? <><Loader2 size={14} className="animate-spin mr-1" />处理中...</> : <><RefreshCw size={14} className="mr-1" />刷新</>}</Button>
        <Button variant="outline" onClick={handleDownload} disabled={!logs}><Download size={14} className="mr-1" />下载</Button>
      </div>
      <div className="bg-slate-950 rounded-lg p-4 max-h-[700px] overflow-auto">
        <pre ref={logRef} className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">{logs || '暂无日志'}</pre>
      </div>
    </div>
  )
}
