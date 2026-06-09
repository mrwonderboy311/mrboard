import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { UserPlus, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'

interface User {
  Id: number
  Username: string
  Nickname: string
  Email: string
  Status: string
  Remark: string
}

export default function RoleToUserList() {
  const { id } = useParams<{ id: string }>()
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [roleUsers, setRoleUsers] = useState<User[]>([])
  const [loadingAll, setLoadingAll] = useState(true)
  const [loadingRole, setLoadingRole] = useState(true)
  const [selectedAll, setSelectedAll] = useState<number[]>([])
  const [selectedRole, setSelectedRole] = useState<number[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const fetchAllUsers = async () => {
    setLoadingAll(true)
    try {
      const resp = await api<{ data: User[] }>('/rbac/user/List')
      setAllUsers(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoadingAll(false)
    }
  }

  const fetchRoleUsers = async () => {
    setLoadingRole(true)
    try {
      const resp = await api<{ data: User[] }>(`/rbac/role/RoleToUserList?Id=${id}`)
      setRoleUsers(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoadingRole(false)
    }
  }

  useEffect(() => {
    fetchAllUsers()
    fetchRoleUsers()
  }, [id])

  const toggleAll = (uid: number) => {
    setSelectedAll(prev => prev.includes(uid) ? prev.filter(i => i !== uid) : [...prev, uid])
  }

  const toggleRole = (uid: number) => {
    setSelectedRole(prev => prev.includes(uid) ? prev.filter(i => i !== uid) : [...prev, uid])
  }

  const handleAddToRole = async () => {
    if (selectedAll.length === 0) {
      toast.error('请先选择用户')
      return
    }
    try {
      await api('/rbac/role/AddRoleToUser', {
        method: 'POST',
        body: JSON.stringify({ Id: id, ids: selectedAll.join(',') }),
      })
      toast.success('添加成功')
      setSelectedAll([])
      fetchRoleUsers()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleRemoveFromRole = () => {
    if (selectedRole.length === 0) {
      toast.error('请先选择用户')
      return
    }
    setConfirmOpen(true)
  }

  const doRemoveFromRole = async () => {
    try {
      await api('/rbac/role/DelRoleToUser', {
        method: 'POST',
        body: JSON.stringify({ Id: id, ids: selectedRole.join(',') }),
      })
      toast.success('删除成功')
      setSelectedRole([])
      fetchRoleUsers()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const userTable = (
    users: User[],
    selected: number[],
    toggle: (id: number) => void,
    loading: boolean,
  ) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <input
              type="checkbox"
              checked={users.length > 0 && selected.length === users.length}
              onChange={e => {
                if (e.target.checked) {
                  // select all handled per-row
                }
              }}
            />
          </TableHead>
          <TableHead className="w-16">ID</TableHead>
          <TableHead>用户名</TableHead>
          <TableHead>名字</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>备注</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={6} className="text-center py-6">加载中...</TableCell></TableRow>
        ) : users.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">暂无数据</TableCell></TableRow>
        ) : users.map(u => (
          <TableRow key={u.Id} className={selected.includes(u.Id) ? 'bg-muted/50' : ''}>
            <TableCell>
              <input
                type="checkbox"
                checked={selected.includes(u.Id)}
                onChange={() => toggle(u.Id)}
              />
            </TableCell>
            <TableCell>{u.Id}</TableCell>
            <TableCell className="font-medium">{u.Username}</TableCell>
            <TableCell>{u.Nickname}</TableCell>
            <TableCell>
              <Badge variant={u.Status === '1' ? 'default' : 'secondary'}>
                {u.Status === '1' ? '启用' : '禁用'}
              </Badge>
            </TableCell>
            <TableCell>{u.Remark}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div className="space-y-6">
      <PageHeader title="角色授权" description={`角色ID: ${id}`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">全部用户</h2>
              <Button size="sm" onClick={handleAddToRole} disabled={selectedAll.length === 0}>
                <UserPlus size={14} className="mr-1" />添加到角色
              </Button>
            </div>
            {userTable(allUsers, selectedAll, toggleAll, loadingAll)}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">角色内用户</h2>
              <Button variant="destructive" size="sm" onClick={handleRemoveFromRole} disabled={selectedRole.length === 0}>
                <UserMinus size={14} className="mr-1" />从角色中删除
              </Button>
            </div>
            {userTable(roleUsers, selectedRole, toggleRole, loadingRole)}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(v) => { if (!v) setConfirmOpen(false) }}
        title="确认操作"
        description="确定从角色中删除选中用户？"
        variant="destructive"
        onConfirm={doRemoveFromRole}
      />
    </div>
  )
}
