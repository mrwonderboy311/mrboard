import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface ServiceNodeData {
  label: string
  status: 'healthy' | 'degraded' | 'error'
  avgLatencyMs: number
  errorRate: number
  rpm: number
  callCount: number
}

function getStatusColor(data: ServiceNodeData): string {
  if (data.errorRate > 0.05) return 'bg-red-500'
  if (data.errorRate >= 0.01 || data.avgLatencyMs > 500) return 'bg-yellow-500'
  return 'bg-green-500'
}

function getStatusBorder(data: ServiceNodeData): string {
  if (data.errorRate > 0.05) return 'border-red-200'
  if (data.errorRate >= 0.01 || data.avgLatencyMs > 500) return 'border-yellow-200'
  return 'border-green-200'
}

function formatRpm(rpm: number): string {
  if (rpm >= 1000) return (rpm / 1000).toFixed(1) + 'k rpm'
  return Math.round(rpm) + ' rpm'
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's avg'
  return Math.round(ms) + 'ms avg'
}

function TrafficBar({ rpm }: { rpm: number }) {
  const maxRpm = 5000
  const pct = Math.min(100, (rpm / maxRpm) * 100)
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="whitespace-nowrap">{formatRpm(rpm)}</span>
    </div>
  )
}

function ServiceNode({ data }: NodeProps) {
  const nodeData = data as unknown as ServiceNodeData
  const statusDot = getStatusColor(nodeData)
  const borderColor = getStatusBorder(nodeData)

  return (
    <div
      className={`min-w-[200px] rounded-lg border bg-white shadow-md px-3 py-2.5 ${borderColor}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2" />

      {/* Row 1: status dot + service name */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`inline-block w-2 h-2 rounded-full ${statusDot} shrink-0`} />
        <span className="text-sm font-semibold text-slate-800 truncate">
          {nodeData.label}
        </span>
      </div>

      {/* Row 2: latency + error rate */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
        <span>{formatLatency(nodeData.avgLatencyMs)}</span>
        <span className="text-slate-300">|</span>
        <span className={nodeData.errorRate > 0.05 ? 'text-red-600 font-medium' : ''}>
          {(nodeData.errorRate * 100).toFixed(1)}% err
        </span>
      </div>

      {/* Row 3: traffic bar */}
      <TrafficBar rpm={nodeData.rpm} />
    </div>
  )
}

export default memo(ServiceNode)
