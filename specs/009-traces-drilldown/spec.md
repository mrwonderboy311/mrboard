# Traces Drilldown — 设计规格

**Branch**: `feat/traces-drilldown` | **Date**: 2026-06-04 | **Spec**: 009

## 问题

Prometheus `traces_service_graph_*` 指标为空（Tempo metrics-generator 未开启），导致：
1. 拓扑图（ServiceGraph）无数据
2. ServiceOverviewPanel 的 RPM/延迟/错误率全部为 0
3. 缺少 Grafana Traces Drilldown 风格的 RED 概览和下钻能力

## 解决方案

利用 Tempo 的 **TraceQL Metrics API**（`/api/metrics/query_range` 和 `/api/metrics/query`）在服务端聚合 trace 数据，无需依赖 Prometheus metrics-generator。

参考：[Grafana Traces Drilldown](https://github.com/grafana/traces-drilldown) 的 RED 面板 + Tab 式下钻架构。

## 架构

```
Frontend (React)
  ├── TraceViewer.tsx (重构 — 主页面)
  │   ├── REDPanel.tsx (新增 — Rate/Error/Duration 三合一)
  │   ├── BreakdownView.tsx (新增 — 按属性分解)
  │   ├── StructureView.tsx (新增 — 调用树)
  │   ├── TraceList (增强 — 可按 RED 筛选)
  │   └── ServiceGraph (保留 — 数据源改为新 API)
  └── hooks/useTraceMetrics.ts (新增 — RED 数据获取)
        │
        ▼
Backend (Go/Beego)
  ├── tempo_trace.go (修改 — 新增端点)
  │   ├── MetricsQueryRange → 代理 Tempo /api/metrics/query_range
  │   ├── REDMetrics → 聚合 RED 指标
  │   └── Dependencies → 改造：从 TraceQL Metrics 派生
  └── tempo_trace_model.go (修改 — 新增查询逻辑)
        │
        ▼
Tempo (TraceQL Metrics API)
  ├── /api/metrics/query_range — 时序聚合查询
  └── /api/metrics/query — 即时聚合查询
```

## 后端 API 设计

### 1. MetricsQueryRange — TraceQL Metrics 代理

代理 Tempo 的 `/api/metrics/query_range` 端点。

**请求：**
```
GET /mrboard/trace/v1/MetricsQueryRange
  ?clusterId=xxx
  &query={resource.service.name="myservice"} | rate() by (resource.service.name)
  &start=1717500000
  &end=1717503600
  &step=60
```

**响应：** 直接透传 Tempo 的 JSON 响应（Prometheus 兼容格式）。

```json
{
  "code": 0,
  "data": {
    "status": "success",
    "data": {
      "resultType": "matrix",
      "result": [
        {
          "metric": {"resource.service.name": "myservice"},
          "values": [[1717500000, "12.5"], [1717500060, "13.1"]]
        }
      ]
    }
  }
}
```

### 2. REDMetrics — 聚合 RED 指标

为指定服务（或所有服务）返回 Rate/Error/Duration 时序数据。

**请求：**
```
GET /mrboard/trace/v1/REDMetrics
  ?clusterId=xxx
  &service=myservice     (可选，不传则返回所有服务)
  &start=1717500000
  &end=1717503600
  &step=60
```

**后端逻辑：** 并发发起 3 个 TraceQL Metrics 查询：

| 指标 | TraceQL 查询 | 说明 |
|------|-------------|------|
| Rate | `{} \| count_over_time() by (resource.service.name)` | 每时间桶 span 计数 |
| Error | `{status = error} \| count_over_time() by (resource.service.name)` | 错误 span 计数 |
| Duration P99 | `{} \| quantile_over_time(duration, 0.99) by (resource.service.name)` | P99 延迟(秒) |

如果指定了 `service`，在查询中添加 `{resource.service.name="xxx"}` 过滤。

**响应：**
```json
{
  "code": 0,
  "data": {
    "services": [
      {
        "serviceName": "myservice",
        "rate": [[1717500000, "12.5"], [1717500060, "13.1"]],
        "errorRate": [[1717500000, "0.5"], [1717500060, "0.3"]],
        "durationP99": [[1717500000, "0.045"], [1717500060, "0.042"]]
      },
      {
        "serviceName": "other-service",
        "rate": [[1717500000, "8.2"], ...],
        "errorRate": [[1717500000, "0.0"], ...],
        "durationP99": [[1717500000, "0.012"], ...]
      }
    ]
  }
}
```

### 3. Dependencies — 改造拓扑数据源

现有 `GetDependencies` 查询 Prometheus（为空）。改造为从 TraceQL Metrics 派生。

**请求：** 不变。
```
GET /mrboard/trace/v1/Dependencies
  ?clusterId=xxx
  &start=1717500000
  &end=1717503600
```

**后端逻辑：**

尝试 TraceQL Metrics 查询获取跨服务调用关系：
```
Query 1 (调用计数): {} | count_over_time() by (resource.service.name, parent.service.name)
Query 2 (错误数):   {status = error} | count_over_time() by (resource.service.name, parent.service.name)
Query 3 (延迟):     {} | quantile_over_time(duration, 0.5) by (resource.service.name, parent.service.name)
```

如果 `parent.service.name` 不可用（取决于 Tempo 版本），fallback 到采样策略：
1. 调用 `SearchTraces` 获取最近 200 条 trace
2. 对每条 trace 调用 `GetTraceDetail` 获取 span 详情
3. 从 span 的 parentSpanID + serviceName 关系推导跨服务调用边
4. 聚合为 `TempoDependency` 数组

**响应：** 不变。
```json
{
  "code": 0,
  "data": [
    {
      "parent": "gateway",
      "child": "myservice",
      "callCount": 1500,
      "rpm": 25,
      "avgLatencyMs": 45.2,
      "errorRate": 0.02
    }
  ]
}
```

## 前端设计

### 页面布局

```
┌─────────────────────────────────────────────────────────┐
│  [集群选择] [时间范围 5m|15m|1h|6h|24h] [自动刷新]       │
├─────────────────────────────────────────────────────────┤
│  RED 概览面板（3 个 mini sparkline 横向排列）              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ Span Rate    │ │ Error Rate   │ │ Duration P99 │    │
│  │  ~~~~/\~~    │ │  ___/\___    │ │  ~~~~~~~~    │    │
│  │  12.5/s      │ │  0.5/s       │ │  45ms        │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
├─────────────────────────────────────────────────────────┤
│  [Breakdown] [Structure] [Traces] [Topology]            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tab 内容区域                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Tab 功能说明

#### Breakdown Tab（属性分解）
- 按 service 分组，每个服务一个 RED mini 面板卡片
- 支持切换分组维度：service / operation / status
- 点击某个服务卡片 → 切换到 Traces tab 并自动筛选该服务
- 参考 Grafana `AttributesBreakdownScene`

#### Structure Tab（调用树）
- 查询匹配当前筛选条件的 trace
- 将多条 trace 合并为一棵调用树（merge traces）
- 每个节点显示：服务名、操作名、平均延迟、span 数量
- 参考 Grafana `StructureTabScene`

#### Traces Tab（增强版 Trace List）
- 现有 TraceList 增强：
  - 添加状态筛选：All / Errors Only / Slow (>1s)
  - 添加排序：按时间 / 按延迟 / 按 span 数
  - 表格列增加：Status badge（OK/ERROR）、Duration 色阶
- 参考 Grafana `SpansScene`

#### Topology Tab（拓扑图）
- 保留现有 ServiceGraph + ServiceNode + ServiceOverviewPanel
- 数据源从 Prometheus 改为新的 Dependencies API
- ServiceOverviewPanel 的指标数据从 REDMetrics API 获取

### 新增文件

| 文件 | 说明 |
|------|------|
| `frontend/src/pages/log/REDPanel.tsx` | Rate/Error/Duration 三合一 sparkline 面板 |
| `frontend/src/pages/log/BreakdownView.tsx` | 按属性分解视图 |
| `frontend/src/pages/log/StructureView.tsx` | 调用树结构视图 |
| `frontend/src/hooks/useTraceMetrics.ts` | RED 数据获取 hook |

### 修改文件

| 文件 | 说明 |
|------|------|
| `frontend/src/pages/log/TraceViewer.tsx` | 重构：添加 RED 面板 + Tab 导航 |
| `frontend/src/pages/log/ServiceOverviewPanel.tsx` | 数据源改为 REDMetrics API |
| `frontend/src/lib/api.ts` | 添加 trace metrics API 调用函数 |
| `controllers/tempo_trace.go` | 添加 MetricsQueryRange、REDMetrics 端点 |
| `models/tempo_trace_model.go` | 添加 TraceQL Metrics 查询逻辑、改造 Dependencies |
| `routers/router.go` | 注册新路由 |

## 交互流程

1. **页面加载** → 调用 `REDMetrics` 获取所有服务的 Rate/Error/Duration → 渲染 RED 概览面板
2. **点击 RED 面板中某个指标** → 切换到对应筛选的 Traces tab（如点击 Error Rate → 筛选错误 trace）
3. **点击 Breakdown tab** → 调用 `REDMetrics` 按服务分组 → 渲染 per-service RED 卡片网格
4. **点击某个服务卡片** → 切换到 Traces tab，自动筛选该服务
5. **点击 Structure tab** → 调用 `Search` + `Trace` 获取 trace 数据 → 合并为调用树
6. **点击 Topology tab** → 调用 `Dependencies` 获取拓扑数据 → 渲染 ServiceGraph
7. **点击拓扑节点** → 打开 ServiceOverviewPanel，数据从 REDMetrics 获取

## 实现分阶段

### Phase 1: 后端 TraceQL Metrics 基础
- 新增 `MetricsQueryRange` 代理端点
- 新增 `REDMetrics` 聚合端点
- 改造 `Dependencies` 端点
- 验证：API 能返回真实数据

### Phase 2: 前端 RED 概览面板
- 新增 `REDPanel` 组件
- 新增 `useTraceMetrics` hook
- 重构 `TraceViewer` 添加 RED 面板
- 验证：页面加载后显示真实 RED 数据

### Phase 3: Drilldown Tabs
- 新增 `BreakdownView`（按服务分解）
- 增强 TraceList（状态筛选、排序）
- 验证：点击服务可下钻到 trace 列表

### Phase 4: Structure + Topology 改造
- 新增 `StructureView`（调用树）
- 改造 ServiceGraph 使用新 Dependencies API
- 改造 ServiceOverviewPanel 使用 REDMetrics API
- 验证：拓扑图显示真实数据，ServiceOverviewPanel 有指标

## 依赖

- Tempo 2.4+（支持 TraceQL Metrics API `/api/metrics/query_range`）
- 无新增前端依赖（复用现有 recharts + shadcn/ui）

## 参考

- [Grafana Traces Drilldown 源码](https://github.com/grafana/traces-drilldown)
- [Tempo TraceQL Metrics 文档](https://grafana.com/docs/tempo/latest/traceql/metrics-queries/)
- [Tempo API 文档](https://grafana.com/docs/tempo/latest/api_docs/)
