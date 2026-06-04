import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types'

interface ClusterOption {
  cluster_id: string
  cluster_name: string
}

interface NamespaceOption {
  nameSpace: string
}

interface CloneRecord {
  clusterid: string
  namespace: string
  restype: string
  objname: string
  target_clusterid: string
  target_namespace: string
  target_objname: string
  status: string
  result: string
  user: string
  createtime: string
}

const RES_TYPES = [
  { value: 'deployment', label: 'deployment' },
  { value: 'service', label: 'service' },
  { value: 'configmap', label: 'configmap' },
  { value: 'secret', label: 'secret' },
  { value: 'cronjob', label: 'cronjob' },
  { value: 'statefulset', label: 'statefulset' },
]

export default function CloneResource() {
  const [clusters, setClusters] = useState<ClusterOption[]>([])
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [targetNamespaces, setTargetNamespaces] = useState<string[]>([])
  const [records, setRecords] = useState<CloneRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    resType: '',
    clusterid: '',
    namespace: '',
    target_clusterid: '',
    target_namespace: '',
    objname: '',
    target_objname: '',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    api<ApiResponse<ClusterOption[]>>('/mrboard/cluster/v1/List')
      .then(resp => setClusters(resp.data || []))
      .catch(err => toast.error((err as Error).message))
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const resp = await api<ApiResponse<CloneRecord[]>>('/mrboard/clone/v1/List')
      setRecords(resp.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchNamespaces = async (cid: string, target: boolean) => {
    if (!cid) return
    try {
      const resp = await api<ApiResponse<NamespaceOption[]>>(`/mrboard/ns/v1/List?clusterId=${cid}`)
      const nss = (resp.data || []).map(n => n.nameSpace)
      if (target) {
        setTargetNamespaces(nss)
      } else {
        setNamespaces(nss)
      }
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleClusterChange = (val: string) => {
    update('clusterid', val)
    update('namespace', '')
    fetchNamespaces(val, false)
  }

  const handleTargetClusterChange = (val: string) => {
    update('target_clusterid', val)
    update('target_namespace', '')
    fetchNamespaces(val, true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.resType) { toast.error('请选择资源类型'); return }
    if (!form.clusterid) { toast.error('请选择当前集群'); return }
    if (!form.namespace) { toast.error('请选择命名空间'); return }
    if (!form.objname.trim()) { toast.error('请输入对象名称'); return }

    const cleanObj = form.objname.replace(/，|\r|\n/g, ',').replace(/\s/g, '')
    const cleanTarget = form.target_objname.replace(/，|\r|\n/g, ',').replace(/\s/g, '')

    if (!confirm('确定提交？')) return

    setSubmitting(true)
    try {
      const urlMap: Record<string, string> = {
        deployment: '/mrboard/deploy/v1/Clone',
        service: '/mrboard/svc/v1/Clone',
        configmap: '/mrboard/cm/v1/Clone',
        secret: '/mrboard/secret/v1/Clone',
        cronjob: '/mrboard/cronjob/v1/Clone',
        statefulset: '/mrboard/sts/v1/Clone',
      }
      const url = urlMap[form.resType]
      if (!url) { toast.error('不支持的类型'); return }

      await api(url, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          objname: cleanObj,
          target_objname: cleanTarget,
        }),
      })
      toast.success('执行完成')
      fetchRecords()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">复制资源到其他集群</h1>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>资源克隆注意事项：</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>目标集群、目标空间、目标名称不能都为空</li>
          <li>多个克隆时逗号或换行隔开；目标名称留空则保留源名称</li>
          <li>源集群和目标集群的k8s版本不能相差太大</li>
          <li>目标空间不存在则会自动创建</li>
          <li>目标名称已存在则将源配置更新到目标上</li>
        </ul>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-sm font-medium text-red-500">资源类型</label>
                <select
                  value={form.resType}
                  onChange={e => update('resType', e.target.value)}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-40"
                >
                  <option value="">选择克隆类型</option>
                  {RES_TYPES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-sm font-medium text-green-600">当前集群</label>
                <select
                  value={form.clusterid}
                  onChange={e => handleClusterChange(e.target.value)}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-40"
                >
                  <option value="">请选择集群</option>
                  {clusters.map(c => (
                    <option key={c.cluster_id} value={c.cluster_id}>{c.cluster_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-green-600">命名空间</label>
                <select
                  value={form.namespace}
                  onChange={e => update('namespace', e.target.value)}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-40"
                >
                  <option value="">选择命名空间</option>
                  {namespaces.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div className="px-2 text-xl text-muted-foreground">{'->'}</div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-blue-500">目标集群</label>
                <select
                  value={form.target_clusterid}
                  onChange={e => handleTargetClusterChange(e.target.value)}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-40"
                >
                  <option value="">选择目标集群</option>
                  {clusters.map(c => (
                    <option key={c.cluster_id} value={c.cluster_id}>{c.cluster_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-blue-500">目标空间</label>
                <select
                  value={form.target_namespace}
                  onChange={e => update('target_namespace', e.target.value)}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-40"
                >
                  <option value="">选择命名空间</option>
                  {targetNamespaces.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="space-y-1 flex-1 min-w-64">
                <label className="text-sm font-medium text-green-600">对象名称</label>
                <textarea
                  value={form.objname}
                  onChange={e => update('objname', e.target.value)}
                  placeholder="多个克隆时逗号隔开或换行"
                  className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-64">
                <label className="text-sm font-medium text-blue-500">目标名称</label>
                <textarea
                  value={form.target_objname}
                  onChange={e => update('target_objname', e.target.value)}
                  placeholder="数量及顺序需和源名称一一对应，留空则保留源名称"
                  className="w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-y"
                />
              </div>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? '执行中...' : '确认克隆'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>集群</TableHead>
                <TableHead>命名空间</TableHead>
                <TableHead>资源类型</TableHead>
                <TableHead>资源名称</TableHead>
                <TableHead>目标集群</TableHead>
                <TableHead>目标空间</TableHead>
                <TableHead>目标名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>执行结果</TableHead>
                <TableHead>执行人</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">暂无记录</TableCell></TableRow>
              ) : records.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.clusterid}</TableCell>
                  <TableCell>{r.namespace}</TableCell>
                  <TableCell><Badge variant="secondary">{r.restype}</Badge></TableCell>
                  <TableCell className="font-medium">{r.objname}</TableCell>
                  <TableCell>{r.target_clusterid}</TableCell>
                  <TableCell>{r.target_namespace}</TableCell>
                  <TableCell>{r.target_objname}</TableCell>
                  <TableCell>
                    <span className={r.status === 'true' ? 'text-green-600' : 'text-red-500'}>
                      {r.status === 'true' ? '成功' : '失败'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{r.result}</TableCell>
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
