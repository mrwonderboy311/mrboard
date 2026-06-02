# Feature Specification: Trace/Log Observability Redesign

**Feature Branch**: `007-trace-log-observability`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "链路追踪的服务拓扑不好看，而且不能点击，其次整个功能不能根据spanid搜索，然后日志不确定是否准确，从运维角度来说并不好用。排查问题不方便"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Service Topology Graph Interaction (Priority: P1)

As an ops engineer, I want to see a clear, interactive service topology graph so that I can quickly understand service dependencies and identify problematic services.

The current topology graph uses basic canvas rendering with only first-letter icons on nodes. I need Grafana-style rounded rectangle nodes showing service name, latency, error rate, and traffic volume. Clicking a node should show a detail panel with service metrics and recent traces.

**Why this priority**: The topology graph is the primary entry point for ops to understand system health at a glance. Without clear visualization and interaction, engineers cannot efficiently identify which service is causing issues.

**Independent Test**: Can be fully tested by loading the topology graph page, verifying nodes display service metrics, clicking a node opens a side panel with correct data, and navigating to a trace from the panel.

**Acceptance Scenarios**:

1. **Given** the topology graph is loaded with multiple services, **When** I view the graph, **Then** each service node displays its name, average latency, error rate, and traffic volume
2. **Given** a service has high error rate (>5%), **When** I view the graph, **Then** the node and its edges are highlighted in red
3. **Given** the topology graph is loaded, **When** I click on a service node, **Then** a side panel opens showing service overview metrics and recent traces
4. **Given** the side panel is open, **When** I click on a trace in the recent traces list, **Then** I navigate to the trace detail page
5. **Given** the side panel is open, **When** I click "查看日志", **Then** I navigate to the log viewer with that service pre-filtered

---

### User Story 2 - SpanID Search and定位 (Priority: P2)

As an ops engineer, I want to search by spanID so that when I get a spanID from an alert or log, I can quickly jump to the full trace.

Currently there is no way to search by spanID. I need a dedicated search mode where I paste a 32-character hex spanID and the system locates the containing trace.

**Why this priority**: When troubleshooting from alerts or external systems, engineers often have a spanID but not the full traceID. This is a critical gap in the troubleshooting workflow.

**Independent Test**: Can be tested by entering a known spanID in the search interface and verifying it navigates to the correct trace detail page showing that span highlighted.

**Acceptance Scenarios**:

1. **Given** I have a spanID from an alert, **When** I paste it into the SpanID search field and click "定位", **Then** the system finds and navigates to the trace containing that span
2. **Given** I enter an invalid or non-existent spanID, **When** I click "定位", **Then** I see a clear error message "未找到该 SpanID 对应的链路"
3. **Given** the trace detail page is loaded from a spanID search, **When** the page renders, **Then** the matching span is automatically selected and scrolled into view

---

### User Story 3 - Trace-Log Correlation (Priority: P3)

As an ops engineer, I want to see logs correlated to a specific span directly in the trace detail page so that I don't have to switch between trace and log views to correlate issues.

Currently the logs tab queries by service name + time range, which may return unrelated logs. I need embedded logs that are precisely correlated — either by traceID (if available in log labels) or by smart time window based on span duration.

**Why this priority**: Trace-log correlation is the key to efficient root cause analysis. Without it, engineers waste time manually matching timestamps between two separate views.

**Independent Test**: Can be tested by opening a trace detail page, clicking a span, switching to the Logs tab, and verifying the displayed logs are relevant to that span's time window and service.

**Acceptance Scenarios**:

1. **Given** I am viewing a span's detail panel, **When** I click the "日志" tab, **Then** I see logs from that span's service within the span's time window
2. **Given** the span duration is less than 1 second, **When** logs are queried, **Then** the time window is ±2 seconds around the span
3. **Given** the span duration is 5 seconds, **When** logs are queried, **Then** the time window is ±10 seconds (2x span duration)
4. **Given** the span duration is 30 seconds, **When** logs are queried, **Then** the time window is ±5 seconds around the span
5. **Given** log entries have a traceID label matching the current trace, **When** logs are displayed, **Then** those logs are prioritized and shown first
6. **Given** I am viewing the log viewer, **When** a log entry has a traceID label, **Then** the traceID is displayed as a clickable link that navigates to the trace detail page

---

### User Story 4 - Enhanced Trace Search (Priority: P4)

As an ops engineer, I want more search filters for traces so that I can narrow down results by operation name, time range, and duration.

**Why this priority**: Better search filters reduce noise and help engineers find relevant traces faster, especially in high-traffic systems.

**Independent Test**: Can be tested by using each filter (operation, time range, duration) independently and verifying the search results are correctly filtered.

**Acceptance Scenarios**:

1. **Given** I am on the trace search page, **When** I select a service and operation name, **Then** only traces matching both criteria are shown
2. **Given** I set a minimum duration filter of 500ms, **When** I search, **Then** only traces with duration > 500ms are shown
3. **Given** I select a time range of "最近1小时", **When** I search, **Then** only traces from the last hour are shown

---

### Edge Cases

- What happens when the topology graph has no data? → Show "暂无服务依赖数据" message
- What happens when a spanID search returns no results? → Show "未找到该 SpanID 对应的链路" error
- What happens when Loki has no logs for the queried time window? → Show "该时间段内暂无日志" in the logs tab
- What happens when the service overview API fails? → Show error toast, side panel shows "加载失败"
- What happens when there are more than 50 services in the topology? → Graph remains usable with zoom/pan, nodes don't overlap excessively

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a service topology graph with nodes showing service name, average latency, error rate, and traffic volume
- **FR-002**: System MUST allow users to click a service node to open a side panel with detailed metrics and recent traces
- **FR-003**: System MUST support searching traces by spanID, navigating to the containing trace detail page
- **FR-004**: System MUST display correlated logs in the trace detail page's span panel, with time window automatically adjusted based on span duration
- **FR-005**: System MUST make traceID values in log entries clickable, linking to the trace detail page
- **FR-006**: System MUST support filtering traces by operation name, time range, and duration
- **FR-007**: System MUST highlight services with high error rates (>5%) in red on the topology graph
- **FR-008**: System MUST allow users to zoom and pan the topology graph
- **FR-009**: System MUST show edge labels on topology connections indicating call volume
- **FR-010**: System MUST provide quick action buttons in the service side panel to view logs or search traces for that service

### Key Entities

- **Service Node**: Represents a microservice in the topology, with attributes: name, status (healthy/degraded/error), average latency, P99 latency, error rate, traffic volume (rpm)
- **Service Edge**: Represents a dependency between two services, with attributes: parent service, child service, call count, average latency, error rate
- **Trace**: A distributed trace across services, with attributes: traceID, root service, root operation, duration, span count, start time, status
- **Span**: A single operation within a trace, with attributes: spanID, traceID, parentSpanID, operation name, service name, start time, duration, status, tags
- **Log Entry**: A log record, with attributes: timestamp, level, message, namespace, pod, container, app, labels (including traceID if available)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify the most problematic service in the topology graph within 5 seconds of page load
- **SC-002**: Users can locate a trace by spanID in under 3 seconds (from paste to trace detail page)
- **SC-003**: Users can correlate logs to a specific span without leaving the trace detail page
- **SC-004**: The topology graph renders correctly with up to 50 service nodes without visual overlap
- **SC-005**: 90% of ops engineers can complete a full troubleshooting cycle (find service → find trace → find logs) in under 2 minutes
- **SC-006**: Trace-log correlation accuracy improves: when traceID is available in logs, 100% correlation; when using time window, logs are within the correct time range

## Assumptions

- Tempo and Loki are deployed and configured for the target clusters
- Prometheus is available for service graph metrics (traces_service_graph_request_total, etc.)
- The application uses OpenTelemetry for distributed tracing
- Log entries may or may not contain traceID labels — the system handles both cases
- The current authentication and cluster selection mechanism is reused unchanged
- React Flow library (~50KB gzipped) is acceptable as a new frontend dependency
