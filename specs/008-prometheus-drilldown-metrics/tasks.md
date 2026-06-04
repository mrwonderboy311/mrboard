# Tasks: Prometheus Drilldown Metrics Dashboard

**Input**: Design documents from `/specs/008-prometheus-drilldown-metrics/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: No automated tests — manual UI verification per quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and prepare project structure

- [x] T001 Install recharts dependency in frontend: `cd /root/xkube/frontend && npm install recharts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend Prometheus proxy infrastructure — MUST complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Add `PrometheusUrl` field to Cluster model in `models/cluster_model.go` — follow existing `LokiUrl`/`TempoUrl` pattern: add field to struct, add to List query fields, add to Update mapping, add to Add/Edit controller parsing
- [x] T003 [P] Create `models/prometheus_model.go` — implement `prometheusHttpGet(url string) ([]byte, error)` (reuse pattern from `tempoHttpGet` in `models/tempo_trace_model.go`), implement PromQL template mapping for metrics: cpu, memory, network_receive, network_transmit, request_rate, request_latency_p99, implement `PrometheusQueryRange(clusterId, metric, namespace, pod, node, start, end, step)` and `PrometheusLabelValues(clusterId, label, match)` functions
- [x] T004 [P] Create `controllers/prometheus_query.go` — implement `PrometheusQueryController` with `QueryRange()` and `LabelValues()` methods that parse request params, call model functions, return JSON response in `{code, msg, data}` format
- [x] T005 Register Prometheus routes in `routers/router.go` — add `/mrboard/prometheus/v1/query_range` and `/mrboard/prometheus/v1/label_values` routes pointing to `PrometheusQueryController`
- [x] T006 Add `prometheus_url` field to Cluster controller parsing in `controllers/cluster.go` — add `gp.Get("prometheus_url")` in both Add and Update methods, following existing loki_url/tempo_url pattern

**Checkpoint**: Backend API ready — frontend can now query Prometheus through the proxy

---

## Phase 3: User Story 1 — 集群资源概览 (Priority: P1) 🎯 MVP

**Goal**: 运维人员进入指标页面，选择集群后立即看到 CPU、内存、网络使用概况时序折线图，可按命名空间筛选

**Independent Test**: 选择集群 → 页面显示节点级 CPU/内存/网络时序折线图 → 切换命名空间 → 图表刷新

### Implementation for User Story 1

- [x] T007 [P] [US1] Create `frontend/src/lib/promql.ts` — unit formatting functions: `formatCPU(cores)` → `500m` / `0.5 cores`, `formatMemory(bytes)` → `256 MiB`, `formatNetwork(bytesPerSec)` → `1.0 MiB/s`, `formatLatency(seconds)` → `125ms`, `formatRate(rate)` → `150.5 req/s`
- [x] T008 [P] [US1] Create `frontend/src/types/prometheus.ts` — TypeScript interfaces: `MetricSeries { metric: Record<string, string>, values: [number, string][] }`, `QueryRangeResponse { resultType: string, result: MetricSeries[] }`, `DrilldownState { level, breadcrumb, filters, timeRange, autoRefresh }`
- [x] T009 [US1] Create `frontend/src/hooks/usePrometheus.ts` — custom hook that wraps API calls to `/mrboard/prometheus/v1/query_range` and `/mrboard/prometheus/v1/label_values`, manages loading/error state, returns `{ data, loading, error, refetch }` for a given metric+filters+timerange
- [x] T010 [US1] Create `frontend/src/pages/monitor/TimeSeriesChart.tsx` — reusable chart component using recharts `ResponsiveContainer` + `LineChart`, accepts `MetricSeries[]`, `title`, `unitFormatter`, `color` props, renders time series with tooltip showing formatted values
- [x] T011 [US1] Create `frontend/src/pages/monitor/MetricCard.tsx` — card component showing current value (latest data point) with sparkline, accepts `title`, `value`, `unit`, `trend` props
- [x] T012 [US1] Create `frontend/src/pages/monitor/PrometheusMetrics.tsx` — main page component: top bar with cluster selector (reuse existing cluster list API), namespace dropdown (from label_values API), time range selector (1h/6h/24h/3d presets + custom), renders 4 TimeSeriesChart components (CPU, memory, network_receive, network_transmit), 4 MetricCard components
- [x] T013 [US1] Add route for PrometheusMetrics in `frontend/src/App.tsx` — add `/monitor/prometheus` route with ProtectedRoute + MainLayout, lazy import
- [x] T014 [US1] Add menu entry in `frontend/src/layouts/MainLayout.tsx` — add "Prometheus 指标" under existing "集群信息" menu group

**Checkpoint**: User can navigate to Prometheus Metrics page, select cluster, see CPU/memory/network charts, filter by namespace

---

## Phase 4: User Story 2 — 逐层下钻 (Priority: P2)

**Goal**: 从集群概览点击节点 → 看到该节点所有 Pod 指标 → 点击 Pod → 看到单个 Pod 详情 → 面包屑返回

**Independent Test**: 集群概览 → 点击节点 → 节点 Pod 列表 → 点击 Pod → Pod 详情 → 面包屑返回

### Implementation for User Story 2

- [x] T015 [US2] Create `frontend/src/pages/monitor/ResourceTable.tsx` — table component showing resource list for current drilldown level (nodes/pods), each row clickable to drill down, columns: name, CPU current, memory current, network in/out, with color-coded thresholds
- [x] T016 [US2] Implement drilldown state management in `frontend/src/pages/monitor/PrometheusMetrics.tsx` — add `DrilldownState` with breadcrumb navigation, handle click events from ResourceTable to update level/filters/breadcrumb, sync drilldown state with URL params for shareability and refresh
- [x] T017 [US2] Add drilldown-aware query logic in `frontend/src/hooks/usePrometheus.ts` — adjust query params based on drilldown level: cluster overview → `by (node)`, node view → `by (pod)` + `node=$node`, pod view → single pod query, update `by` dimension and filters accordingly
- [x] T018 [US2] Add breadcrumb component to `frontend/src/pages/monitor/PrometheusMetrics.tsx` — render breadcrumb trail above charts, each crumb clickable to navigate back to that level, current level shown as plain text

**Checkpoint**: User can drill down from cluster → node → pod and navigate back via breadcrumbs

---

## Phase 5: User Story 3 — 应用服务指标 (Priority: P3)

**Goal**: 显示应用层指标（请求速率、P99 延迟），支持按服务名称筛选

**Independent Test**: 选择命名空间和服务 → 显示请求速率和 P99 延迟图表 → 切换时间范围 → 图表更新

### Implementation for User Story 3

- [x] T019 [US3] Add request_rate and request_latency_p99 PromQL templates in `models/prometheus_model.go` — `request_rate`: `sum(rate(http_requests_total{...}[5m])) by (code)`, `request_latency_p99`: `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{...}[5m])) by (le))`, with namespace/pod/service filter support
- [x] T020 [US3] Add service selector dropdown in `frontend/src/pages/monitor/PrometheusMetrics.tsx` — add service dropdown populated from label_values API (label=service), appears when viewing application metrics section, filter charts by selected service
- [x] T021 [US3] Add application metrics section in `frontend/src/pages/monitor/PrometheusMetrics.tsx` — render 2 additional TimeSeriesChart components for request_rate and request_latency_p99 below the resource metrics section, add service filter to this section, highlight services with error rate > 5% in ResourceTable (red text)

**Checkpoint**: User can see request rate and P99 latency charts, filter by service

---

## Phase 6: User Story 4 — 自动刷新与时间控制 (Priority: P4)

**Goal**: 支持 30 秒自动刷新和自定义时间范围

**Independent Test**: 开启自动刷新 → 30 秒后图表更新 → 关闭 → 手动选时间范围 → 图表更新

### Implementation for User Story 4

- [x] T022 [US4] Add auto-refresh toggle in `frontend/src/pages/monitor/PrometheusMetrics.tsx` — add switch button in toolbar, when enabled start 30-second interval calling `refetch()` for all active queries, clear interval on disable or unmount, show countdown timer next to toggle
- [x] T023 [US4] Enhance time range selector in `frontend/src/pages/monitor/PrometheusMetrics.tsx` — support custom start/end datetime inputs in addition to presets, update step size based on range (1h→60s, 6h→300s, 24h→900s, 3d→3600s), persist time range in URL params

**Checkpoint**: Auto-refresh and custom time ranges fully functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cluster config UI, error handling, build and deploy

- [x] T024 Add Prometheus URL input field in `frontend/src/pages/cluster/ClusterEdit.tsx` — add input field for `prometheus_url` in the cluster edit form, following existing loki_url/tempo_url pattern
- [x] T025 Add Prometheus URL input field in `frontend/src/pages/cluster/ClusterAdd.tsx` — add input field for `prometheus_url` in the cluster add form
- [x] T026 Add error handling in `frontend/src/pages/monitor/PrometheusMetrics.tsx` — show "请先配置 Prometheus 地址" when cluster has no prometheus_url, show connection error when Prometheus unreachable, show "暂无数据" when query returns empty, show timeout suggestion for large time ranges
- [x] T027 Add `prometheus_url` to cluster type in `frontend/src/types/index.ts` — add field to Cluster interface
- [x] T028 Build frontend: `cd /root/xkube/frontend && npm run build`
- [x] T029 Deploy frontend to pod: copy dist files to xkube-frontend pod
- [x] T030 Deploy backend: build Go binary and deploy to xkube pod
- [x] T031 Run quickstart.md verification — test all scenarios from quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1) → US2 (P2) depends on US1 (uses same page)
  - US3 (P3) can run in parallel with US2 (different section of same page)
  - US4 (P4) depends on US1 (enhances existing controls)
- **Polish (Phase 7)**: Depends on all user stories being complete

### Within Each User Story

- Models/services before UI components
- Components before page assembly
- Core implementation before integration

### Parallel Opportunities

- T003 and T004 can run in parallel (model vs controller)
- T007 and T008 can run in parallel (utils vs types)
- T010 and T011 can run in parallel (chart vs card components)
- US2 and US3 can be developed in parallel (drilldown vs app metrics)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T006) — backend ready
3. Complete Phase 3: User Story 1 (T007-T014) — basic charts visible
4. **STOP and VALIDATE**: Navigate to page, select cluster, see charts
5. Deploy demo if ready

### Incremental Delivery

1. Setup + Foundational → Backend API ready
2. Add US1 → Test cluster overview → Deploy (MVP!)
3. Add US2 → Test drilldown → Deploy
4. Add US3 → Test app metrics → Deploy
5. Add US4 → Test auto-refresh → Deploy
6. Polish → Final deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Backend follows existing patterns: controller → model → API, `{code, msg, data}` JSON response
- Frontend uses React 18 + TypeScript + shadcn/ui + recharts
- No automated tests — manual verification per quickstart.md
- Commit after each task or logical group
