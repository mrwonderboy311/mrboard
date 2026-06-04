import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Unlock, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'

interface LockItem {
  lockKey: string
  lockTime: string
}

export default function LockList() {
  const [items, setItems] = useState<LockItem[]>([])
  const [loading, setLoading] = useState(true)

  const columns: Column<LockItem>[] = useMemo(() => [
    { key: 'lockKey', header: '锁定对象', render: (item) => <span className="font-medium">{item.lockKey}</span> },
    {
      key: 'lockTime', header: '锁定时长', render: (item) => (
        item.lockTime === '0'
          ? <Badge variant="destructive">永久</Badge>
          : item.lockTime
      ),
    },
    {
      key: 'actions', header: '操作', render: (item) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleUnlock(item)}>
            <Unlock size={14} className="mr-1" />解锁
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleLongTermLock(item)}>
            <Ban size={14} className="mr-1" />永久封禁
          </Button>
        </div>
      ),
    },
  ], [])

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
      <PageHeader title="登录解锁" description="登录失败太多的用户或IP被锁定后会在这里显示。" />
      <DataTable columns={columns} data={items} loading={loading} emptyMessage="暂无锁定" />
    </div>
  )
}
