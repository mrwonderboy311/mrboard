import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Role {
  Id: number
  Name: string
}

interface UserRole {
  Role: number
}

export default function AdminEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoles, setSelectedRoles] = useState<number[]>([])
  const [form, setForm] = useState({
    Id: '', Username: '', Nickname: '', Telphone: '', Email: '',
    Company: '', Department: '', Password: '', Repassword: '',
    Status: '1', Remark: '',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userResp, rolesResp] = await Promise.all([
          api<{ data: Record<string, string> }>(`/rbac/user/Update?Id=${id}`),
          api<{ data: Role[] }>('/rbac/role/List'),
        ])
        const d = userResp.data
        setForm({
          Id: d.Id || '', Username: d.Username || '', Nickname: d.Nickname || '',
          Telphone: d.Telphone || '', Email: d.Email || '', Company: d.Company || '',
          Department: d.Department || '', Password: '', Repassword: '',
          Status: d.Status || '1', Remark: d.Remark || '',
        })
        setRoles(rolesResp.data || [])

        try {
          const userRoles = await api<UserRole[]>(`/rbac/role/GetridByuid?Id=${id}`)
          setSelectedRoles(userRoles.map(r => r.Role))
        } catch {
          // no existing roles
        }
      } catch (err) {
        toast.error((err as Error).message)
      }
    }
    loadData()
  }, [id])

  const toggleRole = (roleId: number) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.Username || !form.Telphone) {
      toast.error('请填写必填字段')
      return
    }
    if (form.Password && form.Password !== form.Repassword) {
      toast.error('两次密码不一致')
      return
    }
    setLoading(true)
    try {
      await api('/rbac/user/Update', {
        method: 'POST',
        body: JSON.stringify({ ...form, Roleid: selectedRoles.join(',') }),
      })
      toast.success('修改成功')
      navigate('/rbac/admin/list')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">编辑管理员</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ID</label>
                <Input value={form.Id} disabled />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名 *</label>
                <Input value={form.Username} onChange={e => update('Username', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">中文名</label>
                <Input value={form.Nickname} onChange={e => update('Nickname', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">手机 *</label>
                <Input value={form.Telphone} onChange={e => update('Telphone', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">邮箱</label>
                <Input value={form.Email} onChange={e => update('Email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">组织机构</label>
                <Input value={form.Company} onChange={e => update('Company', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">部门</label>
                <Input value={form.Department} onChange={e => update('Department', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">密码</label>
                <Input type="password" value={form.Password} onChange={e => update('Password', e.target.value)} placeholder="留空则不修改" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">确认密码</label>
                <Input type="password" value={form.Repassword} onChange={e => update('Repassword', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">角色</label>
              <div className="flex flex-wrap gap-3">
                {roles.map(r => (
                  <label key={r.Id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedRoles.includes(r.Id)}
                      onChange={() => toggleRole(r.Id)}
                    />
                    {r.Name}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">状态</label>
                <Select value={form.Status} onValueChange={v => update('Status', v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">启用</SelectItem>
                    <SelectItem value="0">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">备注</label>
                <Input value={form.Remark} onChange={e => update('Remark', e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '提交中...' : '确认更改'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/rbac/admin/list')}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
