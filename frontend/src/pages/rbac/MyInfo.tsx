import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface UserInfo {
  Id: string
  Username: string
  Nickname: string
  Telphone: string
  Email: string
  Company: string
  Department: string
  Remark: string
}

export default function MyInfo() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<UserInfo>({
    Id: '', Username: '', Nickname: '', Telphone: '',
    Email: '', Company: '', Department: '', Remark: '',
  })

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const resp = await api<{ data: UserInfo }>('/public/myinfo')
        const d = resp.data
        setForm({
          Id: d.Id || '', Username: d.Username || '', Nickname: d.Nickname || '',
          Telphone: d.Telphone || '', Email: d.Email || '', Company: d.Company || '',
          Department: d.Department || '', Remark: d.Remark || '',
        })
      } catch (err) {
        toast.error((err as Error).message)
      }
    }
    fetchInfo()
  }, [])

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.Nickname || !form.Telphone) {
      toast.error('姓名和手机不能为空')
      return
    }
    setLoading(true)
    try {
      await api('/public/UpdateMyInfo', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('修改成功')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">基本资料</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ID</label>
              <Input value={form.Id} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">用户名</label>
              <Input value={form.Username} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">姓名 *</label>
              <Input value={form.Nickname} onChange={e => update('Nickname', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">手机 *</label>
              <Input value={form.Telphone} onChange={e => update('Telphone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">邮箱</label>
              <Input type="email" value={form.Email} onChange={e => update('Email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">公司</label>
              <Input value={form.Company} onChange={e => update('Company', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">部门</label>
              <Input value={form.Department} onChange={e => update('Department', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注信息</label>
              <textarea
                className="flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.Remark}
                onChange={e => update('Remark', e.target.value)}
                placeholder="请输入备注信息"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '保存中...' : '确认保存'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
