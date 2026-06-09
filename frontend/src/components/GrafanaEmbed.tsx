import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Cluster, ApiResponse } from '@/types'

interface GrafanaEmbedProps {
  /** Grafana path, e.g. "/explore" or "/d/<uid>/<slug>" */
  path: string
  /** Additional URL params */
  params?: Record<string, string>
  /** Cluster ID to resolve grafana_url */
  clusterId?: string
  /** Full Grafana URL override (skips cluster resolution) */
  url?: string
  /** iframe title */
  title?: string
  /** Extra CSS class */
  className?: string
}

export default function GrafanaEmbed({ path, params = {}, clusterId, url, title = 'Grafana', className }: GrafanaEmbedProps) {
  const [grafanaUrl, setGrafanaUrl] = useState(url || '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (url) return
    const cid = clusterId || localStorage.getItem('clusterId') || ''
    if (!cid) { setError('未选择集群'); return }

    api<ApiResponse<Cluster[]>>('/mrboard/cluster/v1/List')
      .then(resp => {
        const cluster = (resp.data || []).find(c => c.cluster_id === cid)
        const gUrl = (cluster as any)?.grafana_url || ''
        if (!gUrl) {
          setError('该集群未配置 Grafana 地址，请在集群编辑页面添加')
        } else {
          setGrafanaUrl(gUrl.replace(/\/+$/, ''))
        }
      })
      .catch(() => setError('获取集群信息失败'))
  }, [clusterId, url])

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className || 'h-[600px]'}`}>
        <div className="text-center space-y-2">
          <div className="text-4xl opacity-20">📊</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </div>
    )
  }

  if (!grafanaUrl) {
    return (
      <div className={`flex items-center justify-center ${className || 'h-[600px]'}`}>
        <div className="text-muted-foreground text-sm animate-pulse">加载 Grafana...</div>
      </div>
    )
  }

  const qs = new URLSearchParams(params).toString()
  const fullUrl = `${grafanaUrl}${path}${qs ? '?' + qs : ''}`

  return (
    <iframe
      key={fullUrl}
      src={fullUrl}
      title={title}
      className={`w-full border-0 rounded-lg ${className || 'h-[calc(100vh-180px)]'}`}
      allow="clipboard-read; clipboard-write"
    />
  )
}
