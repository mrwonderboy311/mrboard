# Data Model: Prometheus Drilldown Metrics

## 实体

### Cluster (修改)

在现有 `xkb_cluster` 表中新增字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| prometheus_url | VARCHAR(500) | Prometheus 查询地址，如 `http://prometheus.monitoring.svc.cluster.local:9090` |

### MetricQuery (API 请求)

| 字段 | 类型 | 说明 |
|------|------|------|
| clusterId | string | 集群 ID |
| metric | string | 指标名：cpu, memory, network_receive, network_transmit, request_rate, request_latency_p99 |
| namespace | string? | 可选，命名空间筛选 |
| pod | string? | 可选，Pod 名称筛选（支持正则） |
| node | string? | 可选，节点名筛选 |
| start | int64 | 开始时间戳（Unix 秒） |
| end | int64 | 结束时间戳（Unix 秒） |
| step | int64 | 步长（秒） |

### MetricSeries (API 响应)

| 字段 | 类型 | 说明 |
|------|------|------|
| metric | map[string]string | 标签集（如 pod, namespace, node） |
| values | [][2]interface{} | 时序数据点 [timestamp, value] |

### DrilldownState (前端状态)

| 字段 | 类型 | 说明 |
|------|------|------|
| level | enum | cluster, node, namespace, workload, pod |
| breadcrumb | []BreadcrumbItem | 导航路径 |
| filters | {namespace?, node?, pod?} | 当前筛选条件 |
| timeRange | {start, end, step} | 时间范围 |
| autoRefresh | boolean | 自动刷新开关 |
