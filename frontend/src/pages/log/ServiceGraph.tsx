import { useEffect, useState, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import ServiceNode from './ServiceNode'
import ServiceOverviewPanel from './ServiceOverviewPanel'

interface Dependency {
  parent: string
  child: string
  callCount: number
  rpm: number
  avgLatencyMs: number
  errorRate: number
}

type ServiceNodeData = {
  label: string
  status: 'healthy' | 'degraded' | 'error'
  avgLatencyMs: number
  errorRate: number
  rpm: number
  callCount: number
  [key: string]: unknown
}

const nodeTypes = { service: ServiceNode }

function computeStatus(errorRate: number): 'healthy' | 'degraded' | 'error' {
  if (errorRate > 5) return 'error'
  if (errorRate >= 1) return 'degraded'
  return 'healthy'
}

function formatCallCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

function buildLayout(deps: Dependency[]): {
  nodes: Node<ServiceNodeData>[]
  edges: Edge[]
} {
  const serviceNames = new Set<string>()
  for (const d of deps) {
    serviceNames.add(d.parent)
    serviceNames.add(d.child)
  }

  // Aggregate metrics per service
  const metrics = new Map<
    string,
    { totalCalls: number; totalRpm: number; totalLatency: number; totalErrors: number; count: number }
  >()
  for (const d of deps) {
    for (const name of [d.parent, d.child]) {
      if (!metrics.has(name)) {
        metrics.set(name, { totalCalls: 0, totalRpm: 0, totalLatency: 0, totalErrors: 0, count: 0 })
      }
    }
    const pm = metrics.get(d.parent)!
    pm.totalCalls += d.callCount
    pm.totalRpm += d.rpm
    pm.totalLatency += d.avgLatencyMs
    pm.totalErrors += d.errorRate
    pm.count++
  }

  // Find root services (appear as parent but never as child)
  const children = new Set(deps.map(d => d.child))
  const roots = [...serviceNames].filter(s => !children.has(s))
  // Compute depth for each non-root service
  const depthMap = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const d of deps) {
    if (!adj.has(d.parent)) adj.set(d.parent, [])
    adj.get(d.parent)!.push(d.child)
  }
  const queue: [string, number][] = roots.map(r => [r, 0])
  while (queue.length > 0) {
    const [name, depth] = queue.shift()!
    if (depthMap.has(name)) continue
    depthMap.set(name, depth)
    for (const child of adj.get(name) || []) {
      if (!depthMap.has(child)) {
        queue.push([child, depth + 1])
      }
    }
  }
  // Assign depth 1 to any orphan services
  for (const s of serviceNames) {
    if (!depthMap.has(s)) depthMap.set(s, 1)
  }

  // Group services by depth
  const depthGroups = new Map<number, string[]>()
  for (const [name, depth] of depthMap) {
    if (!depthGroups.has(depth)) depthGroups.set(depth, [])
    depthGroups.get(depth)!.push(name)
  }

  const xGap = 260
  const yGap = 120

  const flowNodes: Node<ServiceNodeData>[] = []
  for (const [depth, names] of depthGroups) {
    const x = 80 + depth * xGap
    const totalHeight = (names.length - 1) * yGap
    const startY = Math.max(60, 200 - totalHeight / 2)
    names.forEach((name, i) => {
      const m = metrics.get(name)
      const avgLatency = m ? m.totalLatency / m.count : 0
      const avgErrorRate = m ? m.totalErrors / m.count : 0
      const totalRpm = m ? m.totalRpm : 0
      const totalCalls = m ? m.totalCalls : 0

      flowNodes.push({
        id: name,
        type: 'service',
        position: { x, y: startY + i * yGap },
        data: {
          label: name,
          status: computeStatus(avgErrorRate),
          avgLatencyMs: Math.round(avgLatency * 100) / 100,
          errorRate: Math.round(avgErrorRate * 100) / 100,
          rpm: Math.round(totalRpm * 100) / 100,
          callCount: totalCalls,
        },
      })
    })
  }

  const maxCalls = Math.max(...deps.map(d => d.callCount), 1)

  const flowEdges: Edge[] = deps.map((d, i) => {
    const ratio = d.callCount / maxCalls
    const isError = d.errorRate > 5
    return {
      id: `e-${d.parent}-${d.child}-${i}`,
      source: d.parent,
      target: d.child,
      type: 'smoothstep',
      label: formatCallCount(d.callCount),
      labelStyle: { fontSize: 10, fill: '#64748b' },
      labelBgStyle: { fill: '#fff', fillOpacity: 0.85 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      style: {
        strokeWidth: 1 + ratio * 4,
        stroke: isError ? '#ef4444' : '#94a3b8',
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isError ? '#ef4444' : '#94a3b8',
      },
      animated: isError,
    }
  })

  return { nodes: flowNodes, edges: flowEdges }
}

export default function ServiceGraph() {
  const [clusterId, setClusterId] = useState(localStorage.getItem('clusterId') || '')
  const [deps, setDeps] = useState<Dependency[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node<ServiceNodeData>[])
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[])

  // Wait for clusterId
  useEffect(() => {
    if (clusterId) return
    const timer = setInterval(() => {
      const id = localStorage.getItem('clusterId')
      if (id) { setClusterId(id); clearInterval(timer) }
    }, 500)
    return () => clearInterval(timer)
  }, [clusterId])

  const fetchDeps = useCallback(() => {
    if (!clusterId) return
    setLoading(true)
    setError('')
    const now = Date.now() * 1000000
    const start = String(now - 3600 * 1000000000)
    const end = String(now)
    api<{ code: number; data: Dependency[] }>(
      '/mrboard/trace/v1/Dependencies?clusterId=' + clusterId + '&start=' + start + '&end=' + end,
    )
      .then(res => {
        const data = res.data || []
        setDeps(data)
        if (data.length === 0) setError('暂无服务依赖数据，请确认 Tempo metrics-generator 已启用')
      })
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [clusterId])

  useEffect(() => { fetchDeps() }, [clusterId, fetchDeps])

  useEffect(() => {
    if (deps.length === 0) return
    const { nodes: layoutNodes, edges: layoutEdges } = buildLayout(deps)
    setNodes(layoutNodes)
    setEdges(layoutEdges)
  }, [deps, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<ServiceNodeData>) => {
      setSelectedService(prev => (prev === node.id ? null : node.id))
    },
    [],
  )

  const onPaneClick = useCallback(() => {
    setSelectedService(null)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          加载中...
        </CardContent>
      </Card>
    )
  }

  if (deps.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <span>{error || '暂无服务依赖数据'}</span>
          <Button variant="outline" size="sm" onClick={fetchDeps}>刷新</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative w-full" style={{ height: 560 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {selectedService && (
        <div className="absolute top-0 right-0 h-full w-80 z-10">
          <ServiceOverviewPanel
            serviceName={selectedService}
            clusterId={clusterId}
            onClose={() => setSelectedService(null)}
          />
        </div>
      )}
    </div>
  )
}
