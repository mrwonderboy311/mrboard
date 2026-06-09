import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Unlock, Ban, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface LockItem {
  lockKey: string
  lockTime: string
}

export default function LockList() {
  const [items, setItems] = useState<LockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [unlockTarget, setUnlockTarget] = useState<LockItem | null>(null)
  const [blockTarget, setBlockTarget] = useState<LockItem | null>(null)

  const columns: Column<LockItem>[] = useMemo(() => [
    {
      key: 'lockKey', header: '锁定对象', className: 'font-medium', render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Lock size={14} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{item.lockKey}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'lockTime', header: '锁定时长', render: (item) => (
        item.lockTime === '0'
          ? <Badge variant="destructive">永久</Badge>
          : item.lockTime
      ),
    },
    {
      key: 'actions', header: '', render: (item) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="解锁"
            onClick={(e) => { e.stopPropagation(); setUnlockTarget(item) }}>
            <Unlock size={15} />
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="永久封禁"
            onClick={(e) => { e.stopPropagation(); setBlockTarget(item) }}>
            <Ban size={15} />
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

  const handleUnlock = async () => {
    if (!unlockTarget) return
    try {
      await api(`/rbac/user/lockAct?act=unLock&key=${unlockTarget.lockKey}`)
      toast.success('解锁成功')
      fetchItems()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleLongTermLock = async () => {
    if (!blockTarget) return
    try {
      await api(`/rbac/user/lockAct?act=longTermLock&key=${blockTarget.lockKey}`)
      toast.success('封锁成功')
      fetchItems()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4 animate-[fadeInUp_0.3s_ease-out]">
      <PageHeader title="登录解锁" description="登录失败太多的用户或IP被锁定后会在这里显示。" eyebrow="RBAC" />
      <DataTable columns={columns} data={items} loading={loading} emptyMessage="暂无锁定" variant="cards" />
      <ConfirmDialog
        open={!!unlockTarget}
        onOpenChange={(v) => { if (!v) setUnlockTarget(null) }}
        title="确认操作"
        description={`确定解锁 ${unlockTarget?.lockKey}？`}
        onConfirm={handleUnlock}
      />
      <ConfirmDialog
        open={!!blockTarget}
        onOpenChange={(v) => { if (!v) setBlockTarget(null) }}
        title="确认操作"
        description={`确定永久封锁 ${blockTarget?.lockKey}？`}
        variant="destructive"
        onConfirm={handleLongTermLock}
      />
    </div>
  )
}
