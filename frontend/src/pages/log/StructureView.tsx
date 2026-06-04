import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown, Globe } from 'lucide-react'

interface TraceSpan {
  spanID: string
  traceID: string
  parentSpanID: string
  operationName: string
  serviceName: string
  startTime: number
  duration: number
  status: string
  tags: Record<string, string>
}

interface TraceDetail {
  traceID: string
  spans: TraceSpan[]
  services: string[]
  rootService: string
  rootOperation: string
  duration: number
}

interface TreeNode {
  serviceName: string
  operationName: string
  spanCount: number
  avgDuration: number
  errorCount: number
  children: TreeNode[]
}

function buildMergeTree(traces: TraceDetail[]): TreeNode[] {
  const nodeMap = new Map<string, { spans: TraceSpan[]; children: Set<string>; parent: string | null }>()

  for (const trace of traces) {
    const spanMap = new Map<string, TraceSpan>()
    for (const span of trace.spans) {
      spanMap.set(span.spanID, span)
    }

    for (const span of trace.spans) {
      const key = `${span.serviceName}:${span.operationName}`
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { spans: [], children: new Set(), parent: null })
      }
      nodeMap.get(key)!.spans.push(span)

      if (span.parentSpanID && span.parentSpanID !== '0000000000000000') {
        const parentSpan = spanMap.get(span.parentSpanID)
        if (parentSpan && parentSpan.serviceName !== span.serviceName) {
          const parentKey = `${parentSpan.serviceName}:${parentSpan.operationName}`
          nodeMap.get(key)!.parent = parentKey
          if (!nodeMap.has(parentKey)) {
            nodeMap.set(parentKey, { spans: [], children: new Set(), parent: null })
          }
          nodeMap.get(parentKey)!.children.add(key)
        }
      }
    }
  }

  const built = new Set<string>()
  function buildNode(key: string): TreeNode | null {
    if (built.has(key)) return null
    built.add(key)

    const entry = nodeMap.get(key)
    if (!entry) return null

    const [serviceName, operationName] = key.split(':')
    const spans = entry.spans

    const children: TreeNode[] = []
    for (const childKey of entry.children) {
      const child = buildNode(childKey)
      if (child) children.push(child)
    }

    return {
      serviceName,
      operationName,
      spanCount: spans.length,
      avgDuration: spans.reduce((sum, s) => sum + s.duration, 0) / spans.length / 1e6,
      errorCount: spans.filter(s => s.status === 'error').length,
      children: children.sort((a, b) => b.spanCount - a.spanCount),
    }
  }

  const roots: TreeNode[] = []
  for (const [key, entry] of nodeMap) {
    if (!entry.parent || !nodeMap.has(entry.parent)) {
      const node = buildNode(key)
      if (node) roots.push(node)
    }
  }

  return roots.sort((a, b) => b.spanCount - a.spanCount)
}

function TreeNodeComponent({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 3)
  const hasChildren = node.children.length > 0
  const errorRate = node.spanCount > 0 ? node.errorCount / node.spanCount : 0

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded cursor-pointer text-xs"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
        ) : (
          <span className="w-3" />
        )}

        <Globe size={12} className="text-blue-500 shrink-0" />

        <span className="font-mono font-medium">{node.serviceName}</span>
        <span className="text-muted-foreground">→</span>
        <span className="truncate">{node.operationName}</span>

        <div className="flex-1" />

        <Badge variant="secondary" className="text-[10px]">{node.spanCount} spans</Badge>
        <span className="font-mono text-muted-foreground">{node.avgDuration.toFixed(1)}ms</span>

        {errorRate > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            {(errorRate * 100).toFixed(0)}% err
          </Badge>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <TreeNodeComponent key={`${child.serviceName}:${child.operationName}:${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface StructureViewProps {
  traces: TraceDetail[]
  loading: boolean
}

export function StructureView({ traces, loading }: StructureViewProps) {
  const tree = useMemo(() => buildMergeTree(traces), [traces])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted/30 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (tree.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4 text-center text-muted-foreground text-sm">
          暂无 trace 数据，请先搜索 trace
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-sm font-medium mb-3">服务调用树（{traces.length} 条 trace 合并）</div>
        <div className="max-h-[500px] overflow-y-auto">
          {tree.map((node, i) => (
            <TreeNodeComponent key={`${node.serviceName}:${node.operationName}:${i}`} node={node} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
