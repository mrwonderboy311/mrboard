import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import YamlViewer from '@/components/shared/YamlViewer'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

export default function CrdYaml() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const clusterId = params.get('clusterId') || localStorage.getItem('clusterId') || ''
  const crdName = params.get('crdName') || ''
  const baseQuery = `clusterId=${clusterId}&crdName=${crdName}`
  const [yaml, setYaml] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchYaml = async () => {
      try {
        const data = await api<any>('/mrboard/cdr/v1/Yaml?' + baseQuery)
        setYaml(typeof data === 'string' ? data : data.yaml || JSON.stringify(data, null, 2))
      } catch (err) { toast.error((err as Error).message) } finally { setLoading(false) }
    }
    fetchYaml()
  }, [baseQuery])

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">加载中...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft size={14} className="mr-1" />返回</Button>
        <h1 className="text-2xl font-bold">YAML - {crdName}</h1>
      </div>
      <YamlViewer yaml={yaml} readOnly />
    </div>
  )
}
