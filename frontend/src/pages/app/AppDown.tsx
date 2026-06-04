import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'

interface AppDownRecord {
  id: string
  appname: string
  clusterId: string
  nameSpace: string
  resType: string
  resName: string
  status: string
  message: string
  user: string
  createtime: string
}

export default function AppDown() {
  const [records, setRecords] = useState<AppDownRecord[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const resp = await api<ApiResponse<AppDownRecord[]>>('/mrboard/appname/v1/List')
      setRecords(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecords() }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">应用下线记录</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>应用名称</TableHead>
                <TableHead>集群</TableHead>
                <TableHead>命名空间</TableHead>
                <TableHead>资源类型</TableHead>
                <TableHead>资源名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>信息</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无下线记录</TableCell></TableRow>
              ) : records.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.appname}</TableCell>
                  <TableCell>{r.clusterId}</TableCell>
                  <TableCell>{r.nameSpace}</TableCell>
                  <TableCell><Badge variant="secondary">{r.resType}</Badge></TableCell>
                  <TableCell>{r.resName}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'success' ? 'default' : 'destructive'}>
                      {r.status === 'success' ? '成功' : '失败'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{r.message}</TableCell>
                  <TableCell>{r.user}</TableCell>
                  <TableCell>{r.createtime}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
