import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface ResourceRow {
  name: string
  cpu?: number
  memory?: number
  networkIn?: number
  networkOut?: number
  requestRate?: number
  errorRate?: number
}

interface ResourceTableProps {
  title: string
  resources: ResourceRow[]
  onResourceClick: (name: string) => void
  loading?: boolean
  clusterId?: string
  timeRange?: { start: number; end: number }
}

function formatCPU(cores: number): string {
  if (cores < 1) return `${Math.round(cores * 1000)}m`
  return `${cores.toFixed(2)} cores`
}

function formatMemory(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`
}

function formatNetwork(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(1)} B/s`
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KiB/s`
  return `${(bps / (1024 * 1024)).toFixed(1)} MiB/s`
}

export function ResourceTable({ title, resources, onResourceClick, loading, clusterId, timeRange }: ResourceTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
        <CardContent><div className="flex items-center justify-center h-[100px] text-muted-foreground">加载中...</div></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead className="text-right">CPU</TableHead>
              <TableHead className="text-right">内存</TableHead>
              <TableHead className="text-right">网络入</TableHead>
              <TableHead className="text-right">网络出</TableHead>
              {resources.some(r => r.requestRate !== undefined) && (
                <>
                  <TableHead className="text-right">请求速率</TableHead>
                  <TableHead className="text-right">错误率</TableHead>
                </>
              )}
              {clusterId && <TableHead className="text-right">操作</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">暂无数据</TableCell></TableRow>
            ) : (
              resources.map(r => (
                <TableRow key={r.name}>
                  <TableCell>
                    <button className="text-blue-600 hover:underline" onClick={() => onResourceClick(r.name)}>
                      {r.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">{r.cpu !== undefined ? formatCPU(r.cpu) : '-'}</TableCell>
                  <TableCell className="text-right">{r.memory !== undefined ? formatMemory(r.memory) : '-'}</TableCell>
                  <TableCell className="text-right">{r.networkIn !== undefined ? formatNetwork(r.networkIn) : '-'}</TableCell>
                  <TableCell className="text-right">{r.networkOut !== undefined ? formatNetwork(r.networkOut) : '-'}</TableCell>
                  {resources.some(r => r.requestRate !== undefined) && (
                    <>
                      <TableCell className="text-right">{r.requestRate !== undefined ? `${r.requestRate.toFixed(1)} req/s` : '-'}</TableCell>
                      <TableCell className={`text-right ${r.errorRate !== undefined && r.errorRate > 5 ? 'text-red-500 font-bold' : ''}`}>
                        {r.errorRate !== undefined ? `${r.errorRate.toFixed(1)}%` : '-'}
                      </TableCell>
                    </>
                  )}
                  {clusterId && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          const params = new URLSearchParams({ clusterId, service: r.name })
                          if (timeRange) {
                            params.set('start', String(timeRange.start))
                            params.set('end', String(timeRange.end))
                          }
                          window.open('/log/trace?' + params.toString(), '_blank')
                        }}
                      >
                        <ExternalLink size={12} className="mr-1" />链路
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
