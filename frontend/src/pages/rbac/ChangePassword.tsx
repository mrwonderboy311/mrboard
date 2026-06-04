import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ChangePassword() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    oldpassword: '',
    newpassword: '',
    repeatpassword: '',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.oldpassword || !form.newpassword || !form.repeatpassword) {
      toast.error('请填写所有密码字段')
      return
    }
    if (form.newpassword !== form.repeatpassword) {
      toast.error('两次新密码不一致')
      return
    }
    setLoading(true)
    try {
      await api('/public/changepwd', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('修改成功')
      setForm({ oldpassword: '', newpassword: '', repeatpassword: '' })
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold">修改密码</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">旧的密码</label>
              <Input
                type="password"
                value={form.oldpassword}
                onChange={e => update('oldpassword', e.target.value)}
                placeholder="请输入旧的密码"
              />
              <p className="text-xs text-muted-foreground">填写自己账号的旧的密码。</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">新的密码</label>
              <Input
                type="password"
                value={form.newpassword}
                onChange={e => update('newpassword', e.target.value)}
                placeholder="请输入新的密码"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">确认新密码</label>
              <Input
                type="password"
                value={form.repeatpassword}
                onChange={e => update('repeatpassword', e.target.value)}
                placeholder="请再次输入新的密码"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '提交中...' : '确认保存'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
