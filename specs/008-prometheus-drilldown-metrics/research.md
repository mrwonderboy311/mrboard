# Research: Prometheus Drilldown Metrics

## 1. 图表库选型

**Decision**: recharts

**Rationale**:
- React 生态最流行的图表库，与 React 18 完全兼容
- 支持 ResponsiveContainer 实现自适应布局
- 内置 Tooltip、Legend、XAxis/YAxis 等组件，开发效率高
- 包体积适中（~40KB gzipped）
- 项目中未安装任何图表库，recharts 是最低风险的选择

**Alternatives considered**:
- **echarts**: 功能强大但包体积大（~800KB），Apache 许可证
- **visx**: 更底层，需要更多自定义代码，学习曲线陡
- **nivo**: 美观但 SSR 支持差，社区较小

## 2. Prometheus API 代理模式

**Decision**: 后端 Go controller 代理 Prometheus 查询

**Rationale**:
- 避免前端直连 Prometheus（跨域问题、安全风险）
- 后端可以注入集群特定的 Prometheus 地址
- 可以在后端做 PromQL 模板拼接，前端不用写 PromQL
- 复用现有的 HTTP 客户端模式（tempoHttpGet）

**Alternatives considered**:
- **前端直连 Prometheus**: 需要 CORS 配置，暴露 Prometheus 地址给客户端
- **Nginx 反向代理**: 增加运维复杂度，不够灵活

## 3. PromQL 查询模板

**Decision**: 后端预定义指标名到 PromQL 的映射，前端传 metric 名和筛选参数

**Rationale**:
- 前端不需要学习 PromQL 语法
- 后端可以统一管理查询模板，便于维护
- 支持按层级自动调整查询维度（集群级聚合 vs Pod 级明细）

**内置指标**:
- `cpu`: `sum(rate(container_cpu_usage_seconds_total{...}[5m])) by (维度)`
- `memory`: `sum(container_memory_working_set_bytes{...}) by (维度)`
- `network_receive`: `sum(rate(container_network_receive_bytes_total{...}[5m])) by (维度)`
- `network_transmit`: `sum(rate(container_network_transmit_bytes_total{...}[5m])) by (维度)`
- `request_rate`: `sum(rate(http_requests_total{...}[5m])) by (code)`
- `request_latency_p99`: `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{...}[5m])) by (le))`

## 4. Drilldown 层级实现

**Decision**: 前端维护 drilldown 状态栈，每层独立查询

**Rationale**:
- 状态栈支持面包屑导航和返回操作
- 每层查询独立，切换层级时只刷新当前层的图表
- 层级信息（当前层级、筛选条件）通过 URL 参数持久化，支持刷新和分享

**层级映射**:
- 集群概览: `by (node)` — 按节点聚合
- 节点: `by (pod)`, `node="$node"` — 该节点下按 Pod 聚合
- 命名空间: `by (deployment)`, `namespace="$ns"` — 该 NS 下按工作负载聚合
- 工作负载: `by (pod)`, `namespace="$ns", pod=~"$deploy-.*"` — 该工作负载下按 Pod 聚合
- Pod: 单 Pod 查询, `pod="$pod"` — 单个 Pod 详情
