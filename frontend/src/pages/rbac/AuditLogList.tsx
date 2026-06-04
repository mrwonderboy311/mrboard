import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
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
    { key: 'id', header: 'ID', className: 'w-16', render: (l) => l.id },
    { key: 'login_user', header: '帐号', render: (l) => <span className="font-medium">{l.login_user}</span> },
    { key: 'user_ip', header: '用户IP', render: (l) => l.user_ip },
    {
      key: 'status', header: '状态', className: 'w-20', render: (l) => (
        <StatusBadge status={l.status === 'success' || l.status === '0' ? 'Active' : 'Failed'} />
      ),
    },
    { key: 'action', header: '动作', render: (l) => l.action },
    { key: 'message', header: '消息', render: (l) => l.message },
    { key: 'createtime', header: '登录时间', render: (l) => l.createtime },
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
    <div className="space-y-4">
      <PageHeader title="审计日志" />

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
            <Button onClick={handleSearch}>
              <Search size={14} className="mr-1" />搜索
            </Button>
          </div>

          <DataTable columns={columns} data={logs} loading={loading} emptyMessage="暂无数据" />
        </CardContent>
      </Card>
    </div>
  )
}
