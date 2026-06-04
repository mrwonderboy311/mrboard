# Research: Tempo Distributed Tracing Integration

## R1: Tempo HTTP API

**Decision**: Use Tempo's standard HTTP API endpoints.

**Rationale**: Tempo exposes a well-documented HTTP API that is compatible with Grafana's datasource queries. No SDK needed — plain HTTP calls with JSON responses, same pattern as Loki integration.

**Key Endpoints**:
- `GET /api/traces/{traceID}` — Get trace by ID (returns JSON with spans)
- `GET /api/search` — Search traces with params: `service.name`, `operation`, `start`, `end`, `limit`, `tags`
- `GET /api/search/tags` — List available tag keys
- `GET /api/search/tag/{tag}/values` — List values for a tag
- `GET /api/v1/service-dependencies` — Service dependency graph (for dependency map)

**Response Format**: Tempo returns traces in Jaeger JSON format (nested spans with traceID, spanID, parentSpanID, operationName, startTime, duration, tags, logs, process.serviceName).

**Alternatives considered**:
- Tempo gRPC API — rejected, HTTP is simpler and matches existing Loki pattern
- OpenTelemetry Collector query API — rejected, Tempo direct is sufficient

## R2: Trace ID / Span ID Search

**Decision**: Use `/api/traces/{traceID}` for trace ID lookup. For span ID search, fetch the trace first, then locate the span client-side.

**Rationale**: Tempo API does not have a direct "search by span ID" endpoint. The approach is:
1. If user enters a trace ID → direct fetch via `/api/traces/{traceID}`
2. If user enters a span ID → search with broader filters, then scan results for the span. Alternatively, use Tempo's search with `span:{spanID}` syntax if supported by the Tempo version.

**Note**: Tempo v2+ supports `byTraceID(traceID)` and `bySpanID(spanID)` in TraceQL. For backward compatibility, implement both the direct API path and a TraceQL fallback.

## R3: Waterfall Visualization

**Decision**: Pure CSS + jQuery waterfall rendering (no external chart library).

**Rationale**: The constitution prohibits new frameworks. The waterfall is fundamentally a table of horizontal bars — achievable with CSS `position: relative/absolute` and percentage-based width calculations. This matches the project's Layui/jQuery approach.

**Implementation approach**:
- Calculate span offsets relative to trace start time
- Each span row: left offset = `(spanStart - traceStart) / traceDuration * 100%`
- Bar width = `spanDuration / traceDuration * 100%`
- Nesting depth determined by parent-child relationships (build tree from flat span list)
- Error spans get red background class

**Alternatives considered**:
- Canvas/SVG rendering — rejected, overcomplicated for this use case
- External JS library (e.g., vis.js) — rejected, violates no-new-dependencies constraint

## R4: Service Dependency Graph

**Decision**: Use Tempo's `/api/v1/service-dependencies` endpoint with a simple SVG-based node-edge rendering.

**Rationale**: Tempo provides a dependency graph API that returns `{parent, child, callCount}` tuples. Rendering with inline SVG + jQuery event handlers is lightweight and avoids external dependencies.

**Implementation approach**:
- Fetch dependencies from Tempo API
- Layout: simple force-directed or circular layout (CSS/SVG)
- Nodes: service name labels
- Edges: SVG lines with arrow markers
- Click handler on nodes to filter traces

**Alternatives considered**:
- d3.js — rejected, external dependency
- CSS-only grid layout — rejected, doesn't handle arbitrary graph topology well

## R5: Trace-to-Log Correlation

**Decision**: Link from span detail to logViewer.html with query parameters for service name, time range, and optionally trace ID.

**Rationale**: The existing logViewer.html already supports service and time range filtering via URL parameters. Adding a "View Logs" button that constructs the appropriate URL is the simplest approach — no new API needed.

**URL format**: `/views/front/page/xkube/logViewer.html?clusterId=X&namespace=Y&service=Z&start=T1&end=T2`

## R6: Database Schema

**Decision**: Add `tempo_url` column to existing `xkb_cluster` table.

**Rationale**: Mirrors the `loki_url` pattern exactly. Single ALTER TABLE, no new tables needed.

**SQL**: `ALTER TABLE xkb_cluster ADD COLUMN tempo_url VARCHAR(500) DEFAULT '' AFTER loki_url;`
