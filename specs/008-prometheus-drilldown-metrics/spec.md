# Feature Specification: Prometheus Drilldown Metrics Dashboard

**Feature Branch**: `008-prometheus-drilldown-metrics`

**Created**: 2026-06-02

**Status**: Draft

**Input**: 参考 docs/superpowers/specs/2026-06-02-prometheus-drilldown-metrics-design.md

## User Scenarios & Testing

### User Story 1 - 集群资源概览 (Priority: P1)

运维人员进入 Prometheus 指标页面，选择一个集群，立即看到该集群所有节点的 CPU、内存、网络使用概况。可以按命名空间筛选，快速定位资源使用异常的工作负载。

**Why this priority**: 这是最基础的能力——没有集群概览就无法进行任何监控分析。也是用户进入页面的第一个画面。

**Independent Test**: 选择集群 → 页面自动显示节点级 CPU/内存/网络时序折线图 → 切换命名空间 → 图表刷新为该 NS 下的数据

**Acceptance Scenarios**:

1. **Given** 用户已登录且集群已配置 Prometheus 地址, **When** 进入指标页面并选择集群, **Then** 页面显示该集群的 CPU、内存、网络接收、网络发送四组时序折线图
2. **Given** 页面已显示集群概览, **When** 用户从下拉菜单选择一个命名空间, **Then** 图表刷新为该命名空间下的指标数据
3. **Given** 页面已显示集群概览, **When** 用户切换时间范围为"最近 6 小时", **Then** 所有图表同步更新为 6 小时范围的数据

---

### User Story 2 - 逐层下钻 (Priority: P2)

运维人员从集群概览开始，点击某个节点进入该节点的详情视图，查看该节点上所有 Pod 的资源使用。继续点击某个 Pod，查看单个 Pod 的详细指标。每一层都可通过面包屑导航返回。

**Why this priority**: 下钻能力是 Grafana Drilldown 的核心体验，让运维人员能从宏观到微观逐步定位问题。

**Independent Test**: 集群概览 → 点击节点 → 看到该节点所有 Pod 的指标 → 点击 Pod → 看到单个 Pod 的详细指标 → 点击面包屑返回

**Acceptance Scenarios**:

1. **Given** 页面显示集群概览的资源列表, **When** 用户点击某个节点名称, **Then** 页面下钻到该节点视图，显示该节点上所有 Pod 的 CPU/内存/网络图表，面包屑更新为"集群概览 > 节点名称"
2. **Given** 页面显示节点详情, **When** 用户点击某个 Pod 名称, **Then** 页面下钻到该 Pod 视图，显示单个 Pod 的详细 CPU/内存/网络/文件系统图表
3. **Given** 页面在 Pod 详情层级, **When** 用户点击面包屑中的"集群概览", **Then** 页面返回到集群概览层级

---

### User Story 3 - 应用服务指标 (Priority: P3)

运维人员在指标页面查看应用层指标：服务的请求速率、P99 延迟、错误率。支持按服务名称筛选，快速找到延迟异常的服务。

**Why this priority**: 应用指标（请求量、延迟、错误率）是排查线上问题的关键维度，与 K8s 资源指标互补。

**Independent Test**: 选择命名空间和服务 → 显示请求速率和 P99 延迟图表 → 切换时间范围 → 图表更新

**Acceptance Scenarios**:

1. **Given** 用户已选择集群和命名空间, **When** 页面加载应用指标区域, **Then** 显示该命名空间下服务的请求速率和 P99 延迟时序折线图
2. **Given** 页面已显示应用指标, **When** 用户从服务下拉菜单选择一个具体服务, **Then** 图表刷新为该服务的请求速率和 P99 延迟数据
3. **Given** 页面已显示应用指标, **When** 某个服务的错误率超过 5%, **Then** 该服务在资源列表中标红高亮

---

### User Story 4 - 自动刷新与时间控制 (Priority: P4)

运维人员开启自动刷新（30 秒间隔），持续观察指标变化。也可以手动选择自定义时间范围查看历史数据。

**Why this priority**: 自动刷新是监控场景的标配能力，但优先级低于核心的查看和下钻功能。

**Independent Test**: 开启自动刷新 → 等待 30 秒 → 图表自动更新 → 关闭自动刷新 → 手动选择时间范围 → 图表更新

**Acceptance Scenarios**:

1. **Given** 页面已显示指标图表, **When** 用户开启自动刷新开关, **Then** 每 30 秒所有图表自动刷新数据
2. **Given** 自动刷新已开启, **When** 用户关闭自动刷新开关, **Then** 图表停止自动刷新
3. **Given** 页面已显示指标图表, **When** 用户选择自定义时间范围（如最近 2 小时）, **Then** 所有图表更新为指定时间范围的数据

---

### Edge Cases

- 集群未配置 Prometheus 地址时，页面显示友好提示"请先在集群配置中填写 Prometheus 地址"
- Prometheus 不可达时，页面显示连接错误提示，不影响其他功能
- 指标数据为空时（如新集群无监控数据），图表区域显示"暂无数据"
- 命名空间/服务下拉列表为空时，显示"无可用选项"
- 时间范围过大（如 7 天）导致查询超时时，显示超时提示并建议缩小范围

## Requirements

### Functional Requirements

- **FR-001**: 系统 MUST 支持在集群配置中添加和编辑 Prometheus 地址
- **FR-002**: 系统 MUST 提供 Prometheus 指标查询代理 API，避免前端直连 Prometheus
- **FR-003**: 系统 MUST 在指标页面顶部提供集群选择器、命名空间筛选器、服务筛选器和时间范围选择器
- **FR-004**: 系统 MUST 显示 CPU 使用率、内存用量、网络接收、网络发送四组时序折线图
- **FR-005**: 系统 MUST 支持从集群概览逐层下钻到节点、命名空间、工作负载、Pod 层级
- **FR-006**: 每一层级 MUST 显示对应的资源列表表格，支持点击进入下一层
- **FR-007**: 系统 MUST 提供面包屑导航，支持返回任意上层层级
- **FR-008**: 系统 MUST 显示应用层指标：请求速率和 P99 延迟
- **FR-009**: 系统 MUST 支持快捷时间范围选择（1 小时、6 小时、24 小时、3 天）和自定义时间范围
- **FR-010**: 系统 MUST 支持 30 秒间隔的自动刷新，可手动开启/关闭
- **FR-011**: 系统 MUST 对不同指标类型自动格式化单位（CPU: cores/m, 内存: MiB/GiB, 网络: MiB/s, 延迟: ms/s）
- **FR-012**: 系统 MUST 在指标页面入口和侧边菜单中可访问

### Key Entities

- **Prometheus 地址**: 每个集群可配置一个 Prometheus 查询地址，用于获取该集群的监控指标
- **指标查询**: 由指标名 + 筛选条件（命名空间、服务、Pod）+ 时间范围组成，返回时序数据
- **Drilldown 层级**: 集群 → 节点 → 命名空间 → 工作负载 → Pod，每层有对应的指标和资源列表

## Success Criteria

### Measurable Outcomes

- **SC-001**: 运维人员从进入指标页面到看到集群资源概览不超过 3 秒
- **SC-002**: 从集群概览下钻到 Pod 详情的操作步骤不超过 4 次点击
- **SC-003**: 切换命名空间或时间范围后，图表刷新完成不超过 2 秒
- **SC-004**: 运维人员能通过指标页面在 5 分钟内定位到资源使用异常的 Pod
- **SC-005**: 页面在无 Prometheus 配置或 Prometheus 不可达时显示友好错误提示，不出现白屏或崩溃

## Assumptions

- 目标 Prometheus 部署标准 kubelet/cAdvisor 指标采集（CPU、内存、网络、文件系统）
- 目标 Prometheus 部署了 Tempo metrics-generator 产出的服务图指标（traces_service_graph_request_total 等）
- 集群的 Prometheus 地址从集群内部可达（如 `http://prometheus.monitoring.svc.cluster.local:9090`）
- 用户已通过 xkube 的认证体系登录，无需额外的 Prometheus 认证
- 现有的集群管理功能和数据库结构可以扩展以支持新的 Prometheus 地址字段
