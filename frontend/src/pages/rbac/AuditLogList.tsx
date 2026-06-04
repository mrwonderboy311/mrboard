import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search } from 'lucide-react'
import { toast } from 'sonner'

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
      <h1 className="text-2xl font-bold">日志审计</h1>

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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>帐号</TableHead>
                <TableHead>用户IP</TableHead>
                <TableHead className="w-20">状态</TableHead>
                <TableHead>动作</TableHead>
                <TableHead>消息</TableHead>
                <TableHead>登录时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{log.id}</TableCell>
                  <TableCell className="font-medium">{log.login_user}</TableCell>
                  <TableCell>{log.user_ip}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' || log.status === '0' ? 'default' : 'destructive'}>
                      {log.status === 'success' || log.status === '0' ? '成功' : '失败'}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>{log.message}</TableCell>
                  <TableCell>{log.createtime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
