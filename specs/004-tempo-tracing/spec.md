# Feature Specification: Tempo Distributed Tracing

**Feature Branch**: `004-tempo-tracing`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "新增功能链路追踪支持对接tempo，然后能显示全景图链路图等参考grafana的tempo看板支持根据spanid查询和链路图点击"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search and View Traces (Priority: P1)

As an operator, I want to search for traces by service name, span name, and time range so that I can quickly locate distributed transactions when investigating issues.

**Why this priority**: Trace search is the foundational capability — without it, no other tracing feature is useful. This delivers immediate value by letting users find traces matching specific criteria.

**Independent Test**: Can be fully tested by selecting a cluster, choosing a service, and searching — traces appear in a list with service, operation, duration, and timestamp.

**Acceptance Scenarios**:

1. **Given** a cluster with Tempo configured, **When** user selects the cluster and clicks "Search Traces", **Then** the system displays recent traces from the last 1 hour grouped by service.
2. **Given** the trace search page, **When** user selects a specific service and operation, **Then** only traces matching that service/operation are shown.
3. **Given** search results, **When** user adjusts the time range, **Then** results refresh to show traces within the new time window.
4. **Given** a trace list, **When** user clicks on a trace row, **Then** the system navigates to the waterfall visualization for that trace.

---

### User Story 2 - Waterfall Trace Visualization (Priority: P1)

As an operator, I want to see a waterfall view of a trace showing all spans in chronological order with timing bars, so that I can understand the execution flow and identify slow spans.

**Why this priority**: The waterfall view is the primary visualization for understanding individual traces — it is the core value proposition of distributed tracing.

**Independent Test**: Can be tested by clicking any trace from the search results — the waterfall renders with span names, durations, nesting, and timing bars.

**Acceptance Scenarios**:

1. **Given** a selected trace, **When** the waterfall view loads, **Then** all spans are displayed as horizontal bars sorted by start time, with proper nesting depth.
2. **Given** a waterfall view, **When** user hovers over a span bar, **Then** a tooltip shows span name, service, duration, status, and attributes.
3. **Given** a waterfall view, **When** user clicks on a span, **Then** a detail panel opens showing full span attributes (tags, events, logs).
4. **Given** spans with error status, **When** the waterfall renders, **Then** error spans are visually highlighted (red indicator).

---

### User Story 3 - Span ID Search (Priority: P2)

As an operator, I want to search directly by a specific span ID or trace ID, so that when I have an ID from logs or error reports, I can jump directly to the relevant trace.

**Why this priority**: Span/trace ID lookup is a common debugging workflow when correlating across systems (e.g., finding a trace ID in logs then looking it up).

**Independent Test**: Can be tested by entering a known trace ID or span ID into the search field — the system returns the matching trace with the span highlighted.

**Acceptance Scenarios**:

1. **Given** the search page, **When** user enters a trace ID, **Then** the system displays that specific trace's waterfall view.
2. **Given** the search page, **When** user enters a span ID, **Then** the system finds the parent trace and opens the waterfall with that span highlighted/expanded.
3. **Given** an invalid or non-existent ID, **When** user searches, **Then** the system shows a clear "no trace found" message.

---

### User Story 4 - Service Dependency Map (Priority: P3)

As an operator, I want to see a service dependency graph showing how services communicate, so that I can understand system architecture and identify connectivity patterns.

**Why this priority**: The dependency map provides high-level architectural insight but is not essential for day-to-day debugging. It is a valuable overview feature.

**Independent Test**: Can be tested by viewing the dependency map tab — nodes represent services, edges represent call relationships with request counts.

**Acceptance Scenarios**:

1. **Given** a cluster with trace data, **When** user opens the dependency map, **Then** services appear as nodes with directed edges showing call relationships.
2. **Given** the dependency map, **When** user clicks on a service node, **Then** the system filters to show only traces involving that service.
3. **Given** the dependency map, **When** user selects a different time range, **Then** the graph updates to reflect dependencies in that period.

---

### User Story 5 - Trace-to-Log Correlation (Priority: P3)

As an operator, I want to navigate from a trace span to the related logs, so that I can see the log output associated with a specific span without manually searching.

**Why this priority**: Trace-to-log correlation bridges two observability signals but requires both Loki and Tempo to be configured. It is a convenience feature for advanced users.

**Independent Test**: Can be tested by clicking a "View Logs" link on a span detail — the system opens the log viewer pre-filtered to the span's time range and service.

**Acceptance Scenarios**:

1. **Given** a span detail panel, **When** user clicks "View Logs", **Then** the log viewer opens with the service name and span's time range pre-filled.
2. **Given** a trace with trace ID in span attributes, **When** user clicks "View Logs", **Then** the log viewer also filters by the trace ID if available in log labels.

---

### Edge Cases

- What happens when Tempo is unreachable or not configured for a cluster? The system shows a clear error message: "Tempo not configured for this cluster. Please configure the Tempo URL in cluster settings."
- What happens when a trace has 1000+ spans? The waterfall view uses virtualized rendering and limits initial display to 500 spans with a "Load More" option.
- What happens when search returns 0 results? The system displays "No traces found for the selected filters" with suggestions to expand the time range or change filters.
- What happens when a span ID exists in multiple traces? The system shows all matching traces and lets the user select which one to view.
- What happens when the time range is too wide (e.g., 7 days)? The system warns that searches over 24h may be slow and suggests narrowing the range.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to configure a Tempo URL per cluster (similar to Loki URL configuration).
- **FR-002**: System MUST provide a trace search interface with filters for service name, operation name, time range, and tags.
- **FR-003**: System MUST display search results as a list showing trace ID, service, root operation, duration, span count, and timestamp.
- **FR-004**: System MUST render a waterfall visualization for a selected trace showing all spans with timing bars, nesting, and service color-coding.
- **FR-005**: System MUST support searching by trace ID directly, returning the matching trace's waterfall view.
- **FR-006**: System MUST support searching by span ID, locating the parent trace and highlighting the span.
- **FR-007**: System MUST display span details including service name, operation, duration, status (ok/error), and key-value attributes.
- **FR-008**: System MUST show a service dependency graph with nodes (services) and directed edges (call relationships).
- **FR-009**: System MUST allow users to click a service node in the dependency graph to filter traces by that service.
- **FR-010**: System MUST provide a link from span detail to view related logs in the log viewer, pre-filtered by service and time range.
- **FR-011**: System MUST integrate with the existing cluster selection — tracing features are accessible only when a cluster has a Tempo URL configured.
- **FR-012**: System MUST support time range presets (5m, 15m, 1h, 6h, 24h) consistent with the log viewer.
- **FR-013**: System MUST display error spans with visual distinction (color or icon) in the waterfall view.
- **FR-014**: System MUST handle Tempo API errors gracefully with user-friendly error messages.

### Key Entities

- **Trace**: Represents a distributed transaction. Attributes: trace ID (hex string), root service, root operation, total duration, span count, start time, status.
- **Span**: Represents a single unit of work within a trace. Attributes: span ID, trace ID, parent span ID, service name, operation name, start time, duration, status (ok/error), attributes (key-value pairs), events.
- **Service**: Represents a microservice that produces spans. Attributes: service name, span count, error rate. Derived from trace data, not a persistent entity.
- **Service Dependency**: Represents a call relationship between two services. Attributes: source service, target service, call count, error count. Used for the dependency graph.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can search for traces by service and time range and see results within 5 seconds.
- **SC-002**: Users can view a waterfall visualization of a trace with up to 500 spans rendered within 3 seconds.
- **SC-003**: Users can find a specific trace by trace ID in under 3 seconds.
- **SC-004**: Users can navigate from the dependency graph to filtered trace results in a single click.
- **SC-005**: 90% of operators can complete a "find slow trace → identify slow span → view related logs" workflow without documentation.

## Assumptions

- Tempo is deployed as a standalone service accessible via HTTP API (same network as Loki).
- Tempo uses the standard HTTP API: `/api/traces/{traceID}`, `/api/search`, `/api/v1/service-dependencies`, `/api/search/tags`, `/api/search/tag/{tag}/values`.
- No authentication is required for Tempo API access (internal network, same as Loki).
- Tempo URL will be stored in the `xkb_cluster` table alongside the existing `loki_url` field.
- The existing tech stack (Go/Beego backend, Layui frontend) is reused — no new frameworks.
- Tempo stores traces in OpenTelemetry format with standard semantic conventions (service.name, etc.).
- The Tempo URL format is `http://tempo.monitoring:3100` (similar to Loki).
