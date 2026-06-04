import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { ApiResponse, CicdItem, CicdPipelineConfig, AliyunAK, JenkinsConfig } from '@/types'

interface ClusterOption { cluster_id: string; cluster_name: string }
interface NamespaceOption { nameSpace: string }
interface OrgOption { id: string; name: string }

export default function PipelinesEdit() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cicdId = searchParams.get('cicdId') || ''

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [cicdType, setCicdType] = useState<number>(1)
  const [clusters, setClusters] = useState<ClusterOption[]>([])
  const [namespaces, setNamespaces] = useState<NamespaceOption[]>([])
  const [aliyunAKs, setAliyunAKs] = useState<AliyunAK[]>([])
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([])
  const [jenkinsList, setJenkinsList] = useState<JenkinsConfig[]>([])

  const [form, setForm] = useState({
    id: 0,
    cicd_name: '',
    appname: '',
    cluster_id: '',
    namespace: '',
    aliyun_id: '',
    organization_id: '',
    jks_id: '',
    pipeline_id: '',
  })

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    if (!cicdId) return

    const load = async () => {
      try {
        const [cicdResp, pipelineResp, clusterResp, aliyunResp, jksResp] = await Promise.all([
          api<ApiResponse<CicdItem>>(`/cicd/v1/GetCicdInfo?cicdId=${cicdId}`),
          api<ApiResponse<CicdPipelineConfig>>(`/cicd/v1/GetPipelines?cicdId=${cicdId}`),
          api<ApiResponse<ClusterOption[]>>('/mrboard/cluster/v1/List'),
          api<ApiResponse<AliyunAK[]>>('/cicd/v1/GetAliyunIdList'),
          api<ApiResponse<JenkinsConfig[]>>('/cicd/v1/GetJksList'),
        ])

        const cicd = cicdResp.data
        const pipeline = pipelineResp.data
        setClusters(clusterResp.data || [])
        setAliyunAKs(aliyunResp.data || [])
        setJenkinsList(jksResp.data || [])

        if (cicd) {
          setCicdType(cicd.cicd_type || 1)
          setForm({
            id: cicd.id,
            cicd_name: cicd.cicd_name || '',
            appname: cicd.appname || '',
            cluster_id: cicd.cluster_id || '',
            namespace: cicd.namespace || '',
            aliyun_id: pipeline?.aliyun_id || '',
            organization_id: pipeline?.organization_id || '',
            jks_id: pipeline?.jks_id || '',
            pipeline_id: pipeline?.pipeline_id || '',
          })

          if (cicd.namespace) {
            setNamespaces([{ nameSpace: cicd.namespace }])
          }

          if (pipeline?.aliyun_id) {
            api<ApiResponse<AliyunAK[]>>(`/cicd/v1/GetAliyunIdList?aliyun_id=${pipeline.aliyun_id}`)
              .then(r => {
                const ak = r.data?.[0]
                if (ak?.organization_id) {
                  try {
                    const orgs = JSON.parse(ak.organization_id) as OrgOption[]
                    setOrgOptions(orgs)
                  } catch { /* ignore */ }
                }
              }).catch(() => {})
          }
        }
      } catch (err) {
        toast.error((err as Error).message)
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [cicdId])

  const handleClusterChange = (clusterId: string) => {
    update('cluster_id', clusterId)
    update('namespace', '')
    api<ApiResponse<NamespaceOption[]>>(`/mrboard/ns/v1/List?clusterId=${clusterId}`)
      .then(r => setNamespaces(r.data || []))
      .catch(() => setNamespaces([]))
  }

  const handleAliyunChange = (aliyunId: string) => {
    update('aliyun_id', aliyunId)
    update('organization_id', '')
    api<ApiResponse<AliyunAK[]>>(`/cicd/v1/GetAliyunIdList?aliyun_id=${aliyunId}`)
      .then(r => {
        const ak = r.data?.[0]
        if (ak?.organization_id) {
          try {
            const orgs = JSON.parse(ak.organization_id) as OrgOption[]
            setOrgOptions(orgs)
          } catch { setOrgOptions([]) }
        }
      })
      .catch(() => setOrgOptions([]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cicd_name.trim()) { toast.error('名称不能为空'); return }
    if (!form.pipeline_id.trim()) { toast.error('流水线ID不能为空'); return }

    setLoading(true)
    try {
      const body = {
        ...form,
        cicd_name: form.cicd_name.trim(),
        appname: form.appname.trim(),
        pipeline_id: form.pipeline_id.trim(),
        cicd_type: cicdType,
      }
      await api<ApiResponse<unknown>>(`/cicd/v1/Update?cicdId=${cicdId}`, { method: 'POST', body: JSON.stringify(body) })
      toast.success('修改成功')
      navigate('/cicd/list')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="py-8 text-center text-muted-foreground">加载中...</div>

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">编辑流水线</h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">流水线类型</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="cicdType" checked={cicdType === 1} onChange={() => setCicdType(1)} />
                  <span>阿里云流水线</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="cicdType" checked={cicdType === 2} onChange={() => setCicdType(2)} />
                  <span>Jenkins</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">名称 <span className="text-red-500">*</span></label>
                <Input value={form.cicd_name} onChange={e => update('cicd_name', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">应用名</label>
                <Input value={form.appname} onChange={e => update('appname', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">当前集群 <span className="text-red-500">*</span></label>
                <Select value={form.cluster_id} onValueChange={(v) => handleClusterChange(v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择集群" /></SelectTrigger>
                  <SelectContent>
                    {clusters.map(c => <SelectItem key={c.cluster_id} value={c.cluster_id}>{c.cluster_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">命名空间 <span className="text-red-500">*</span></label>
                <Select value={form.namespace} onValueChange={(v) => update('namespace', v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择命名空间" /></SelectTrigger>
                  <SelectContent>
                    {namespaces.map(n => <SelectItem key={n.nameSpace} value={n.nameSpace}>{n.nameSpace}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {cicdType === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">阿里云帐号 <span className="text-red-500">*</span></label>
                  <Select value={form.aliyun_id} onValueChange={(v) => handleAliyunChange(v ?? '')}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="请选择" /></SelectTrigger>
                    <SelectContent>
                      {aliyunAKs.map(a => <SelectItem key={a.aliyun_id} value={a.aliyun_id}>{a.aliyun_id}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">组织ID <span className="text-red-500">*</span></label>
                  <Select value={form.organization_id} onValueChange={(v) => update('organization_id', v ?? '')}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="请先选择阿里云AK" /></SelectTrigger>
                    <SelectContent>
                      {orgOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {cicdType === 2 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Jenkins <span className="text-red-500">*</span></label>
                <Select value={form.jks_id} onValueChange={(v) => update('jks_id', v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="请选择" /></SelectTrigger>
                  <SelectContent>
                    {jenkinsList.map(j => <SelectItem key={j.jks_id} value={j.jks_id}>{j.jks_id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">流水线ID <span className="text-red-500">*</span></label>
              <Input value={form.pipeline_id} onChange={e => update('pipeline_id', e.target.value)} required />
              <p className="text-xs text-muted-foreground">
                阿里云流水线ID: https://flow.aliyun.com/pipelines/2679891/current 中的 2679891<br />
                Jenkins流水线ID: job的名称
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存更改'}</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/cicd/list')}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
