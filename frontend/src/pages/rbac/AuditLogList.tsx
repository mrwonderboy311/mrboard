import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, ScrollText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface AuditLog {
  id: number
  login_user: string
  user_ip: string
  status: string
  action: string
  message: string
  createtime: string
}

export default function AuditLogList() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchUser, setSearchUser] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const columns: Column<AuditLog>[] = useMemo(() => [
    {
      key: 'login_user', header: '帐号', className: 'font-medium', render: (l) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ScrollText size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{l.login_user}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-mono truncate">{l.user_ip}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'status', header: '状态', render: (l) => (
        <StatusBadge status={l.status === 'success' || l.status === '0' ? 'Active' : 'Failed'} />
      ),
    },
    { key: 'action', header: '动作', className: 'text-xs', render: (l) => l.action },
    { key: 'message', header: '消息', className: 'text-xs max-w-xs truncate', render: (l) => l.message },
    { key: 'createtime', header: '登录时间', className: 'text-xs text-muted-foreground', render: (l) => l.createtime },
  ], [])

  const fetchLogs = async (params?: Record<string, string>) => {
    setLoading(true)
    try {
      const resp = await api<{ data: AuditLog[] }>('/rbac/audit/List', {
        method: params ? 'POST' : 'GET',
        ...(params ? { body: JSON.stringify(params) } : {}),
      })
      setLogs(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  const handleSearch = () => {
    const params: Record<string, string> = {}
    if (searchUser.trim()) params.login_user = searchUser.trim()
    if (startTime) params.starttime = startTime
    if (endTime) params.endtime = endTime
    fetchLogs(params)
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="审计日志" eyebrow="RBAC" />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3 mb-4 flex-wrap">
            <div className="space-y-1">
              <label className="text-sm font-medium">帐号</label>
              <Input
                value={searchUser}
                onChange={e => setSearchUser(e.target.value)}
                placeholder="帐号"
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">开始时间</label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-52"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">结束时间</label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-52"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <><Loader2 size={14} className="animate-spin mr-1" />处理中...</> : <><Search size={14} className="mr-1" />搜索</>}
            </Button>
          </div>

          <DataTable columns={columns} data={logs} loading={loading} emptyMessage="暂无数据" variant="cards" />
        </CardContent>
      </Card>
    </div>
  )
}
