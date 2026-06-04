# Prometheus Drilldown Metrics 设计文档

**日期**: 2026-06-02
**状态**: 已确认

## 背景

当前 xkube 的监控页面 (`/monitor/dashboard`) 只展示 xkube 自身的内部指标（HTTP 请求、会话数等），无法查看 K8s 集群的资源指标（CPU、内存、网络）或应用服务指标（请求量、延迟、错误率）。

用户需要类似 Grafana Drilldown Metrics 的功能：按集群 → 节点 → 命名空间 → 工作负载 → Pod 逐层下钻，自动绘制时序折线图。

## 技术选型

- **前端**: React + recharts（时序折线图）+ shadcn/ui 组件
- **后端**: Go controller 代理 Prometheus API 查询
- **数据库**: `xkb_cluster` 表新增 `prometheus_url` 字段
- **时间范围**: 快捷选择（1h/6h/24h/3d）+ 自定义时间范围

## 架构

```
浏览器 → /mrboard/prometheus/v1/query_range → Go 后端 → Prometheus API
```

后端代理避免前端直连 Prometheus（跨域、安全），并提供指标名到 PromQL 的映射。

## 数据库变更

`xkb_cluster` 表新增字段：

```sql
ALTER TABLE xkb_cluster ADD COLUMN prometheus_url VARCHAR(500) DEFAULT '';
```

集群编辑页面新增一个 `prometheus_url` 输入框。

## 后端 API

### 新增 Controller

`controllers/prometheus_query.go`

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/mrboard/prometheus/v1/query` | GET | 即时查询（当前值） |
| `/mrboard/prometheus/v1/query_range` | GET | 范围查询（时序数据） |
| `/mrboard/prometheus/v1/label_values` | GET | 查询 label 值（用于筛选器） |

### 参数

**query_range**:
- `clusterId` — 集群 ID（从配置获取 prometheus_url）
- `query` — PromQL 表达式
- `start` — 开始时间戳（Unix 秒）
- `end` — 结束时间戳（Unix 秒）
- `step` — 步长（秒）

**label_values**:
- `clusterId` — 集群 ID
- `label` — 标签名（如 `namespace`, `pod`）
- `match[]` — 可选的 series selector 过滤

### PromQL 模板

前端传 `metric=cpu` + 筛选参数，后端拼接 PromQL：

| 指标名 | PromQL |
|--------|--------|
| CPU 使用率 | `sum(rate(container_cpu_usage_seconds_total{namespace="$ns",pod=~"$pod"}[5m])) by (pod)` |
| 内存用量 | `sum(container_memory_working_set_bytes{namespace="$ns",pod=~"$pod"}) by (pod)` |
| 网络接收 | `sum(rate(container_network_receive_bytes_total{namespace="$ns",pod=~"$pod"}[5m])) by (pod)` |
| 网络发送 | `sum(rate(container_network_transmit_bytes_total{namespace="$ns",pod=~"$pod"}[5m])) by (pod)` |
| 请求速率 | `sum(rate(http_requests_total{namespace="$ns",service="$svc"}[5m])) by (code)` |
| 请求延迟 P99 | `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{namespace="$ns",service="$svc"}[5m])) by (le))` |

## 前端页面

### 路由

`/monitor/metrics` — 新增页面，与现有 `/monitor/dashboard` 并列。

### 页面结构

```
┌─────────────────────────────────────────────────┐
│ 集群: [local-cluster ▼]  NS: [全部 ▼]           │
│ 服务: [全部 ▼]  时间: [1h] [6h] [24h] [3d]      │
│ 面包屑: 集群概览 > 节点 > 命名空间 > ...         │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─ CPU 使用 ─────────┐ ┌─ 内存用量 ─────────┐  │
│ │   📈 时序折线图     │ │   📈 时序折线图     │  │
│ └─────────────────────┘ └─────────────────────┘  │
│                                                 │
│ ┌─ 网络接收 ─────────┐ ┌─ 网络发送 ─────────┐  │
│ │   📈 时序折线图     │ │   📈 时序折线图     │  │
│ └─────────────────────┘ └─────────────────────┘  │
│                                                 │
│ ┌─ 请求速率 ─────────┐ ┌─ P99 延迟 ────────┐   │
│ │   📈 时序折线图     │ │   📈 时序折线图     │  │
│ └─────────────────────┘ └─────────────────────┘  │
│                                                 │
│ ┌─ 资源列表（可点击下钻）──────────────────────┐ │
│ │ 名称        CPU    内存    网络    操作      │ │
│ │ pod-1       0.5    256Mi   1.2Mi   [详情]   │ │
│ │ pod-2       0.3    128Mi   0.8Mi   [详情]   │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 交互流程

1. 进入页面 → 默认显示集群概览（所有节点的聚合指标）
2. 选择命名空间 → 图表刷新为该 NS 下的指标
3. 点击某个节点/工作负载 → 下钻到该层级，面包屑更新
4. 点击面包屑可返回上一层
5. 时间范围切换 → 所有图表同步刷新
6. 自动刷新：默认 30 秒，可关闭

### Drilldown 层级

| 层级 | 筛选维度 | 显示指标 |
|------|----------|----------|
| 集群概览 | 无 | 各节点 CPU/内存/网络聚合 |
| 节点 | node | 该节点上所有 Pod 的 CPU/内存/网络 |
| 命名空间 | namespace | 该 NS 下所有工作负载的聚合指标 |
| 工作负载 | namespace + deployment/statefulset | 该工作负载下所有 Pod 的指标 |
| Pod | namespace + pod | 单个 Pod 的详细 CPU/内存/网络/文件系统 |

### 资源列表表格

每层显示当前层级的资源列表：
- 列：名称、当前 CPU、当前内存、当前网络、操作（下钻/查看日志/查看链路）
- 点击名称或"详情"按钮进入下一层
- 支持排序

### 单位自动格式化

| 类型 | 格式 |
|------|------|
| CPU | `0.5 cores` / `500m` |
| 内存 | `256 MiB` / `1.2 GiB` |
| 网络 | `1.5 MiB/s` / `23 KiB/s` |
| 延迟 | `125ms` / `1.2s` |
| 百分比 | `45.2%` |

## 新增文件

| 文件 | 说明 |
|------|------|
| `controllers/prometheus_query.go` | Prometheus 查询代理 controller |
| `models/prometheus_model.go` | Prometheus 查询模型（PromQL 模板、代理逻辑） |
| `frontend/src/pages/monitor/PrometheusMetrics.tsx` | 主页面组件 |
| `frontend/src/pages/monitor/TimeSeriesChart.tsx` | 时序折线图组件 |
| `frontend/src/pages/monitor/MetricCard.tsx` | 当前值卡片组件 |
| `frontend/src/pages/monitor/ResourceTable.tsx` | 资源列表表格组件 |
| `frontend/src/lib/promql.ts` | PromQL 模板和单位格式化 |
| `frontend/src/hooks/usePrometheus.ts` | Prometheus 数据获取 hook |

## 修改文件

| 文件 | 变更 |
|------|------|
| `models/cluster_model.go` | Cluster 结构体加 prometheus_url 字段 |
| `controllers/cluster.go` | 集群 CRUD 支持 prometheus_url |
| `routers/router.go` | 注册新路由 |
| `frontend/src/App.tsx` | 添加 /monitor/metrics 路由 |
| `frontend/src/layouts/MainLayout.tsx` | 菜单添加 Prometheus 指标入口 |
| `frontend/src/types/index.ts` | Cluster 类型加 prometheusUrl |
| `frontend/src/pages/cluster/ClusterEdit.tsx` | 集群编辑表单加 prometheus_url 输入框 |
| `frontend/package.json` | 添加 recharts 依赖 |
