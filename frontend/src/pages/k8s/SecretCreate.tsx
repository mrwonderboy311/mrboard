import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface KeyValue { key: string; value: string }

export default function SecretCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const clusterId = localStorage.getItem('clusterId') || ''
  const [nameSpace, setNameSpace] = useState('')
  const [secretName, setSecretName] = useState('')
  const [secretType, setSecretType] = useState('Opaque')
  const [entries, setEntries] = useState<KeyValue[]>([{ key: '', value: '' }])

  const addEntry = () => setEntries(prev => [...prev, { key: '', value: '' }])
  const removeEntry = (idx: number) => setEntries(prev => prev.filter((_, i) => i !== idx))
  const updateEntry = (idx: number, field: 'key' | 'value', val: string) => {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data: Record<string, string> = {}
    for (const entry of entries) {
      if (entry.key.trim()) data[entry.key.trim()] = entry.value
    }
    setLoading(true)
    try {
      await api('/mrboard/secret/v1/Create', {
        method: 'POST',
        body: JSON.stringify({ clusterId, nameSpace, secretName, type: secretType, data }),
      })
      toast.success('创建成功')
      navigate('/k8s/secret')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">创建 Secret</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">命名空间</label>
              <Input value={nameSpace} onChange={e => setNameSpace(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secret 名称</label>
              <Input value={secretName} onChange={e => setSecretName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">类型</label>
              <Select value={secretType} onValueChange={v => { if (v) setSecretType(v) }}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Opaque">Opaque</SelectItem>
                  <SelectItem value="kubernetes.io/tls">kubernetes.io/tls</SelectItem>
                  <SelectItem value="kubernetes.io/dockerconfigjson">kubernetes.io/dockerconfigjson</SelectItem>
                  <SelectItem value="kubernetes.io/basic-auth">kubernetes.io/basic-auth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">键值对</label>
              {entries.map((entry, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    placeholder="key"
                    value={entry.key}
                    onChange={e => updateEntry(idx, 'key', e.target.value)}
                  />
                  <Input
                    placeholder="value"
                    value={entry.value}
                    onChange={e => updateEntry(idx, 'value', e.target.value)}
                  />
                  {entries.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeEntry(idx)}>删除</Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addEntry}>添加一行</Button>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '提交中...' : '提交'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>返回</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
