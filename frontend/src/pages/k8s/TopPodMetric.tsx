import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { Search, ArrowUpDown, Download, Cpu, MemoryStick, Activity } from 'lucide-react'
import { toast } from 'sonner'
import type { Pod } from '@/types'

interface PodMetricItem extends Pod {
  cpu: number
  mem: number
}

export default function TopPodMetric() {
  const [items, setItems] = useState<PodMetricItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [sortBy, setSortBy] = useState<'cpu' | 'mem'>('cpu')
  const [installTarget, setInstallTarget] = useState(false)
  const [installing, setInstalling] = useState(false)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api<{ code: number; data: PodMetricItem[] }>('/mrboard/metrics/v1/PodList?clusterId=' + clusterId)
      setItems(res.data || [])
    } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [clusterId])

  const filtered = items
    .filter(i => !searchName || i.podName.toLowerCase().includes(searchName.toLowerCase()))
    .sort((a, b) => sortBy === 'cpu' ? (b.cpu || 0) - (a.cpu || 0) : (b.mem || 0) - (a.mem || 0))

  const handleInstallMetrics = async () => {
    setInstalling(true)
    try {
      const res = await api<{ code: number; msg: string }>('/mrboard/metrics/v1/InstallMetrics?clusterId=' + clusterId, { method: 'POST' })
      if (res.code === 0) {
        toast.success(res.msg || '安装成功')
        setTimeout(fetchData, 5000)
      } else {
        toast.error(res.msg || '安装失败')
      }
    } catch (err) {
      toast.error('安装失败: ' + (err as Error).message)
    } finally { setInstalling(false); setInstallTarget(false) }
  }

  const columns: Column<PodMetricItem>[] = [
    {
      key: 'podName', header: 'Pod名称', className: 'font-medium', render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Activity size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{p.podName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] font-mono">{p.nameSpace}</Badge>
              <Badge variant={p.podPhase === 'Running' ? 'default' : 'secondary'} className="text-[10px]">{p.podPhase}</Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'cpu', header: 'CPU', className: 'w-28', render: (p) => (
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-blue-500 shrink-0" />
          <span className="font-mono text-sm tabular-nums">{p.cpu != null ? p.cpu.toFixed(3) + ' cores' : '-'}</span>
        </div>
      ),
    },
    {
      key: 'mem', header: '内存', className: 'w-28', render: (p) => (
        <div className="flex items-center gap-1.5">
          <MemoryStick size={12} className="text-purple-500 shrink-0" />
          <span className="font-mono text-sm tabular-nums">{p.mem != null ? p.mem.toFixed(0) + ' Mi' : '-'}</span>
        </div>
      ),
    },
    { key: 'nodeName', header: '节点', className: 'text-xs text-muted-foreground', render: (p) => p.nodeName || '-' },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Pod Top 指标" description="实时查看 Pod CPU 和内存使用情况">
        <Button variant="outline" size="sm" onClick={() => setInstallTarget(true)}>
          <Download size={14} className="mr-1.5" />安装 Metrics
        </Button>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <Search size={14} className="mr-1.5" />刷新
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="py-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索 Pod 名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="pl-9 h-9" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setSortBy(sortBy === 'cpu' ? 'mem' : 'cpu')} className="gap-1.5">
              <ArrowUpDown size={14} />
              {sortBy === 'cpu' ? '按 CPU 排序' : '按内存排序'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="暂无指标数据（请确认 metrics-server 已安装）"
        variant="cards"
      />

      <ConfirmDialog
        open={installTarget}
        onOpenChange={setInstallTarget}
        title="一键安装 metrics-server"
        description="将在当前集群的 kube-system 命名空间安装 metrics-server 组件，用于采集 Pod CPU/内存指标。安装后约 30 秒生效。"
        confirmText={installing ? '安装中...' : '确认安装'}
        onConfirm={handleInstallMetrics}
      />
    </div>
  )
}
