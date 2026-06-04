# Feature Specification: Loki Log Viewer

**Feature Branch**: `001-loki-log-viewer`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "增加日志的功能支持从loki读取日志，可以筛选服务，具体样式可以参考grafana的Drilldown Grafana Logs Drilldown"

## Clarifications

### Session 2026-06-01

- Q: Loki 认证方式？ → A: 无需认证，Loki 部署在内网，不配置认证凭据。
- Q: 日志页面的导航入口位置？ → A: 一级导航，左侧菜单新增"日志查看"入口，与集群、节点等同级。
- Q: 新功能上线后是否保留现有 Pod 日志？ → A: 保留，逐步替换。现有 Pod 日志用于即时调试，Loki 用于历史查询和全局搜索。Loki 稳定后在后续版本移除旧功能。

## User Scenarios & Testing

### User Story 1 - Browse and Filter Logs by Service (Priority: P1)

As a cluster operator, I want to view logs from all services
in a namespace and filter by specific service name, so that
I can quickly find relevant logs without writing queries.

**Why this priority**: This is the core value proposition.
Without service/label filtering, the feature is no better
than the existing pod log viewer.

**Independent Test**: Select a cluster and namespace, view
log volume histogram, click a service label to filter, and
verify only logs from that service are displayed.

**Acceptance Scenarios**:

1. **Given** user selects a cluster and namespace,
   **When** the log viewer loads,
   **Then** a time-based log volume histogram is displayed
   and all available service labels are listed as filter
   chips.
2. **Given** logs are displayed for a namespace,
   **When** user clicks a service label (e.g., "my-app"),
   **Then** the log list filters to show only logs from
   that service and the histogram updates accordingly.
3. **Given** user has applied a service filter,
   **When** user clicks the filter chip again to remove it,
   **Then** the log list returns to showing all services.

---

### User Story 2 - Search and Highlight Log Content (Priority: P1)

As a developer debugging an issue, I want to search for
specific text within logs and see matching lines highlighted,
so that I can pinpoint errors or specific events.

**Why this priority**: Text search is essential for
debugging and is a baseline expectation from the Grafana
Drilldown experience.

**Independent Test**: Type a search term in the search box,
verify matching log lines are highlighted and non-matching
lines are dimmed or hidden.

**Acceptance Scenarios**:

1. **Given** logs are displayed in the viewer,
   **When** user types a search term (e.g., "timeout"),
   **Then** matching log lines are highlighted with the
   search term visually emphasized.
2. **Given** a search term is active,
   **When** user clears the search box,
   **Then** all log lines are shown again without
   highlighting.

---

### User Story 3 - Filter by Log Level (Priority: P2)

As an SRE investigating a production incident, I want to
filter logs by severity level (error, warn, info, debug),
so that I can quickly isolate error logs from noise.

**Why this priority**: Log level filtering is a key
drill-down capability in Grafana Logs Drilldown. It
significantly reduces time to find critical issues.

**Independent Test**: Select "error" log level filter,
verify only error-level logs appear and the histogram
updates to show error log volume.

**Acceptance Scenarios**:

1. **Given** logs are displayed with detected log levels,
   **When** user selects the "error" level filter,
   **Then** only error-level logs are displayed and the
   histogram reflects the filtered volume.
2. **Given** multiple log levels are filtered,
   **When** user selects "all levels",
   **Then** logs from all levels are shown again.

---

### User Story 4 - Time Range Selection (Priority: P2)

As a user, I want to select a specific time range for log
queries (e.g., last 1 hour, last 24 hours, custom range),
so that I can focus on the relevant time window.

**Why this priority**: Time range control is fundamental
to log exploration. Without it, users cannot scope their
investigation.

**Independent Test**: Change time range to "Last 1 hour",
verify the histogram and log list update to show only
logs within that time window.

**Acceptance Scenarios**:

1. **Given** the log viewer is showing logs from the last
   15 minutes,
   **When** user changes the time range to "Last 1 hour",
   **Then** the histogram and log list update to reflect
   the new time range.
2. **Given** user selects a custom time range,
   **When** the range is applied,
   **Then** only logs within the custom range are fetched
   and displayed.

---

### User Story 5 - Live Tail (Priority: P3)

As a developer watching a deployment, I want to see new
logs appear in real-time (live tail), so that I can monitor
activity as it happens without manually refreshing.

**Why this priority**: Live tail is a power-user feature
that enhances the debugging experience but is not required
for the core log viewing workflow.

**Independent Test**: Enable live tail, generate new logs
(e.g., by making API calls), verify new log lines appear
at the top of the list automatically.

**Acceptance Scenarios**:

1. **Given** live tail is enabled,
   **When** new logs are generated in the selected
   namespace/service,
   **Then** new log lines appear at the top of the viewer
   automatically.
2. **Given** live tail is active,
   **When** user clicks "Pause",
   **Then** the stream stops and the view becomes static.

---

### Edge Cases

- What happens when Loki returns no logs for the selected
  filters? Display an empty state with guidance on
  adjusting filters.
- What happens when Loki is unreachable or not configured?
  Show a clear error message with setup instructions.
- What happens when log volume is extremely high (>100K
  lines)? Paginate or sample with a warning to the user.
- What happens when the selected cluster has no Loki
  endpoint configured? Disable the log viewer for that
  cluster with an informational message.
- What happens to the existing Pod 日志功能？保留现有
  Pod 日志（`podLog.html`）作为即时调试入口，Loki
  日志查看器作为独立模块提供历史查询和全局搜索。
  Loki 稳定后在后续版本移除旧 Pod 日志功能。

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to select a cluster
  and namespace as the initial scope for log queries.
- **FR-002**: System MUST fetch logs from a Loki endpoint
  configured per-cluster (Loki URL stored in cluster
  settings). No authentication — Loki is on internal
  network.
- **FR-003**: System MUST display a time-based log volume
  histogram showing log distribution over the selected
  time range.
- **FR-004**: System MUST extract and display available
  labels (service, pod, container, namespace) as clickable
  filter chips.
- **FR-005**: System MUST support text search within log
  content with match highlighting.
- **FR-006**: System MUST detect and display log severity
  levels (error, warn, info, debug, trace) with visual
  differentiation (color-coded).
- **FR-007**: System MUST provide time range selection with
  preset options (last 5m, 15m, 1h, 6h, 24h, 7d) and
  custom range picker.
- **FR-008**: System MUST support live tail mode for
  real-time log streaming with pause/resume controls.
- **FR-009**: System MUST display logs in both raw text
  view and structured table view (with extracted fields
  as columns).
- **FR-010**: System MUST handle Loki unavailability
  gracefully with user-friendly error messages.
- **FR-011**: System MUST support scrolling through
  historical logs with pagination or infinite scroll.
- **FR-012**: Log entries MUST display timestamp, severity
  level, service name, and log message at minimum.

### Key Entities

- **Loki Connection**: Per-cluster Loki endpoint URL.
  No authentication required (internal network). Linked
  to the existing cluster entity (`xkb_cluster`).
- **Log Entry**: Individual log line with timestamp,
  severity level, labels (namespace, pod, container,
  service), and message content.
- **Log Filter**: User-applied filter state including
  service label, log level, search text, and time range.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can find a specific log line from the
  last 1 hour within 30 seconds using service filter +
  text search.
- **SC-002**: The log volume histogram loads and renders
  within 2 seconds for a 24-hour time range.
- **SC-003**: Users can filter logs by service label in
  at most 2 clicks (select namespace → click service chip).
- **SC-004**: Live tail displays new log entries within
  3 seconds of generation.
- **SC-005**: 90% of users can successfully navigate from
  namespace overview to a specific error log within
  1 minute on first use.

## Assumptions

- Loki is deployed and accessible from the xkube server
  for clusters where log viewing is enabled.
- Loki uses the default HTTP API (`/loki/api/v1/query_range`
  for range queries, `/loki/api/v1/tail` for streaming).
- Log labels follow Kubernetes conventions: `namespace`,
  `pod`, `container`, `app` (service name maps to `app`
  label).
- The existing cluster entity in `xkb_cluster` will be
  extended with a Loki URL field — this does not break
  existing cluster management functionality.
- Log retention in Loki is managed externally (xkube does
  not manage Loki storage or retention policies).
- The frontend will use the existing Layui + jQuery stack
  with ECharts for the histogram chart (consistent with
  existing metrics pages).
- The log viewer will be a top-level navigation item in
  the left sidebar menu ("日志查看"), at the same level
  as cluster management, node management, etc.
- Existing Pod log viewer (`podLog.html`) will be retained
  for immediate debugging. Loki log viewer is a separate
  module for historical query and global search. Pod log
  viewer will be removed in a future version once Loki
  log viewer is stable.
