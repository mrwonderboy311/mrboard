import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export default function AppNameAdd() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ appname: '', remarks: '' })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const appname = form.appname.replace(/\s+/g, '')
    if (!appname) {
      toast.error('应用名称不能为空')
      return
    }
    setLoading(true)
    try {
      await api('/mrboard/appname/v1/Add', {
        method: 'POST',
        body: JSON.stringify({ appname, remarks: form.remarks }),
      })
      toast.success('添加成功')
      navigate('/app/list')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold">添加应用</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium required">应用名称</label>
              <Input
                value={form.appname}
                onChange={e => update('appname', e.target.value)}
                placeholder="英文名称, 例如: test-app"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">备注</label>
              <Input
                value={form.remarks}
                onChange={e => update('remarks', e.target.value)}
                placeholder="不超过50字符"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '提交中...' : '确认保存'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/app/list')}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
