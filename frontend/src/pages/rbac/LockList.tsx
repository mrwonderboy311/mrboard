import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Unlock, Ban } from 'lucide-react'
import { toast } from 'sonner'

interface LockItem {
  lockKey: string
  lockTime: string
}

export default function LockList() {
  const [items, setItems] = useState<LockItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = async () => {
    setLoading(true)
    try {
      const data = await api<LockItem[]>('/rbac/user/lockAct?act=list')
      const list = Array.isArray(data) ? data : (data as any)?.data || []
      setItems(list)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const handleUnlock = async (item: LockItem) => {
    if (!confirm(`确定解锁 ${item.lockKey}？`)) return
    try {
      await api(`/rbac/user/lockAct?act=unLock&key=${item.lockKey}`)
      toast.success('解锁成功')
      fetchItems()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleLongTermLock = async (item: LockItem) => {
    if (!confirm(`确定永久封锁 ${item.lockKey}？`)) return
    try {
      await api(`/rbac/user/lockAct?act=longTermLock&key=${item.lockKey}`)
      toast.success('封锁成功')
      fetchItems()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">锁定的IP或用户</h1>
        <p className="text-sm text-muted-foreground mt-1">登录失败太多的用户或IP被锁定后会在这里显示。</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>锁定对象</TableHead>
                <TableHead>锁定时长</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">暂无锁定</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.lockKey}>
                  <TableCell className="font-medium">{item.lockKey}</TableCell>
                  <TableCell>
                    {item.lockTime === '0' ? (
                      <Badge variant="destructive">永久</Badge>
                    ) : (
                      item.lockTime
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleUnlock(item)}>
                        <Unlock size={14} className="mr-1" />解锁
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleLongTermLock(item)}>
                        <Ban size={14} className="mr-1" />永久封禁
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
