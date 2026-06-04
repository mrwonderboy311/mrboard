# Trace/Log Observability Redesign

> Ops-friendly链路追踪 + 日志关联改造设计文档

## Problem Statement

当前链路追踪模块存在以下运维痛点：
1. 服务拓扑图视觉粗糙，交互性差（Canvas 手绘，节点只显示首字母）
2. 不支持 spanID 精确搜索，无法从告警/日志中拿到的 spanID 快速定位
3. Trace→日志关联不准确，按服务名+时间范围模糊匹配，无法精确关联
4. 缺少统一的排查路径：拓扑→trace→日志之间无法顺畅钻取

## Design Decisions

- **React Flow 替换 Canvas**：服务拓扑图从手绘 Canvas 迁移到 React Flow，获得更好的交互体验（缩放、拖拽、布局算法）
- **Grafana 风格节点**：圆角矩形 + 嵌入指标（延迟、错误率、rpm）
- **双模式搜索**：链路搜索 + SpanID 定位模式并存
- **嵌入式日志面板**：TraceDetail 内直接显示关联日志，不用跳转页面
- **智能时间窗口**：根据 span duration 自动调整日志查询时间范围

## Architecture

### Component Changes

```
ServiceGraph.tsx       → 重写（Canvas → React Flow + 自定义节点）
TraceViewer.tsx        → 增强（双模式搜索 + 耗时过滤）
TraceDetail.tsx        → 增强（嵌入式日志面板）
LogViewer.tsx          → 已完成（traceID 可点击链接）
新增:
  ServiceNode.tsx      → React Flow 自定义节点组件
  ServiceOverviewPanel.tsx → 拓扑图点击侧面板
```

### Backend Changes

```
新增:
  GET /mrboard/trace/v1/ServiceOverview  → 服务聚合指标 + 最近 traces
  GET /mrboard/trace/v1/TraceBySpanID    → 按 spanID 定位 trace

改动:
  GET /mrboard/trace/v1/Dependencies     → 增加 rpm/延迟/错误率指标返回
```

### New Dependency

- `reactflow` (~50KB gzipped)

## Component Details

### 1. ServiceGraph (React Flow Rewrite)

**Node Design (Grafana Style)**:
```
┌─────────────────────────┐
│  ● payment-service      │  ← 服务名 + 状态圆点（绿/黄/红）
│  120ms avg | 2.1% err   │  ← 嵌入指标
│  ▓▓▓▓▓▓▓░░  1.2k rpm   │  ← 迷你流量条
└─────────────────────────┘
```

- Rounded rectangle, white background + shadow
- Status color: green (normal), yellow (P99 > 500ms or err > 1%), red (err > 5% or down)
- Node width auto-adapts to content

**Edge Design**:
- Curved lines with arrows
- Line thickness = traffic volume (thicker = more rpm)
- Line color: gray (normal), red (high error rate)
- RPM label on edge

**Interaction**:
- Click node → open right side panel (ServiceOverviewPanel)
- Hover node → highlight connected edges
- Zoom/pan (React Flow built-in)
- Bottom legend preserved, clickable to filter

### 2. ServiceOverviewPanel (New)

Right slide-out panel (400px wide) on node click:

**Top — Service Overview**:
- Service name + status
- Call volume (rpm)
- Average latency
- P99 latency
- Error rate + error count
- Last active time

**Middle — Recent Traces** (last 10):
- TraceID, operation name, duration, status
- Click row → navigate to TraceDetail

**Bottom — Quick Actions**:
- [查看日志] → LogViewer with service pre-filled
- [搜索 Traces] → TraceViewer with service pre-filled

### 3. TraceViewer Search Enhancement

**Dual-mode search bar**:

Mode 1 — 链路搜索:
- Service name (existing)
- Operation name (new dropdown, from Tempo Tags API)
- Tags (existing)
- Limit (existing)
- Time range selector (new)
- Duration filter: min/max ms (new, Tempo native support)

Mode 2 — SpanID 定位:
- Full 32-char hex spanID input
- [定位] button → call backend → get traceID → navigate to TraceDetail

### 4. TraceDetail Embedded Log Panel

**Span detail panel → Logs tab redesign**:

Instead of a separate page, show logs inline:
- Filter bar: level dropdown + search input
- Log list: timestamp + level badge + message
- Level-colored left borders (error=red, warn=yellow, info=blue)
- [查看全部日志 →] link to LogViewer

**Smart time window**:
- Short span (< 1s) → ±2s window
- Medium span (1s-10s) → 2x span duration
- Long span (> 10s) → ±5s

**Log source priority**:
1. If Loki logs have `traceID` label → query by traceID (exact)
2. Fallback → query by service_name + time window + namespace (fuzzy)

### 5. Backend: ServiceOverview API

`GET /mrboard/trace/v1/ServiceOverview?clusterId=1&serviceName=payment-service`

Response:
```json
{
  "code": 0,
  "data": {
    "serviceName": "payment-service",
    "rpm": 1234,
    "avgLatencyMs": 120,
    "p99LatencyMs": 450,
    "errorRate": 0.021,
    "errorCount": 256,
    "lastActive": 1685000000000000000,
    "recentTraces": [
      {
        "traceID": "abc123...",
        "rootOperation": "POST /pay",
        "duration": 230000000,
        "status": "ok"
      }
    ]
  }
}
```

Implementation: Tempo search API (by service, limit 10) + PromQL aggregation (traces_service_graph_request_total, etc.)

### 6. Backend: TraceBySpanID API

`GET /mrboard/trace/v1/TraceBySpanID?clusterId=1&spanID=abc123def456...`

Response:
```json
{
  "code": 0,
  "data": {
    "traceID": "full-trace-id..."
  }
}
```

Implementation: Tempo search with tags filter `span.id=<spanID>`. If Tempo doesn't support this tag, fallback to searching recent traces and matching spans client-side.

### 7. Backend: Dependencies API Enhancement

Extend existing `/mrboard/trace/v1/Dependencies` response to include per-edge metrics:

```json
{
  "parent": "gateway",
  "child": "payment-service",
  "callCount": 12340,
  "avgLatencyMs": 120,
  "errorRate": 0.021,
  "rpm": 205
}
```

Implementation: Query Prometheus `traces_service_graph_request_total`, `traces_service_graph_request_duration_seconds_bucket`, `traces_service_graph_request_failed_total` with appropriate aggregation.

## Troubleshooting Workflow

```
Topology Graph → Click Service → Side Panel → Click Trace → TraceDetail → Embedded Logs
    ↑                                                                        ↓
    └──────────────────── Click traceID link ←───────────────────────────────┘
```

Three entry points, all connected:
- **From topology**: Side panel → trace → logs
- **From traceID/spanID**: Search → TraceDetail → logs
- **From logs**: LogViewer traceID link → TraceDetail → topology

## Testing

1. Service graph renders correctly with React Flow, nodes show metrics
2. Click node opens side panel with correct data
3. SpanID search returns correct trace
4. Embedded log panel shows relevant logs for selected span
5. traceID links work bidirectionally (logs ↔ trace)
6. Build passes (`npm run build`)
