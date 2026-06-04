# Research: Loki Log Viewer

**Date**: 2026-06-01
**Feature**: 001-loki-log-viewer

## 1. Loki HTTP API Endpoints

**Decision**: Use Loki's built-in HTTP API for all queries.

**Endpoints to use**:
- `/loki/api/v1/query_range` — Range queries for histogram
  and log list. Parameters: `query` (LogQL), `start`, `end`,
  `limit`, `direction`
- `/loki/api/v1/labels` — List available label names for a
  time range. Used to populate filter chips.
- `/loki/api/v1/label/{name}/values` — List values for a
  specific label (e.g., get all `app` values in a namespace).
  Used to populate service filter chips.
- `/loki/api/v1/tail` — WebSocket-based live tail streaming.
  Parameters: `query` (LogQL), `limit`, `start`

**Rationale**: These are the standard Loki HTTP API endpoints.
No SDK needed — Go's `net/http` + `encoding/json` is
sufficient. Avoids adding a Loki client dependency.

**Alternatives considered**:
- Loki Go client library (`github.com/grafana/loki-client-go`)
  — rejected: adds dependency, Loki HTTP API is simple enough
  to call directly. Aligns with constitution principle I
  (Simplicity First).

## 2. LogQL Query Patterns

**Decision**: Build LogQL queries programmatically from
user filters.

**Query construction**:
- Base: `{namespace="selected-ns"}`
- With service filter: `{namespace="selected-ns", app="my-app"}`
- With log level filter: `{namespace="selected-ns"} |= "ERROR"`
  or use structured metadata `level="error"` if available
- With text search: `{namespace="selected-ns"} |= "search-term"`
- Combined: `{namespace="selected-ns", app="my-app"} |= "timeout"`

**Rationale**: LogQL label selectors follow Kubernetes label
conventions. The `app` label is the standard service identifier.
Text filtering uses the `|=` line filter operator.

**Alternatives considered**:
- Full LogQL editor — rejected for v1: too complex for the
  target UX (Grafana Drilldown style). Can be added later.

## 3. Log Level Detection

**Decision**: Multi-strategy log level detection.

**Priority order**:
1. Loki structured metadata `level` label (if present)
2. Regex pattern matching on log line content
   - Pattern: `\b(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\b`
   - Case-insensitive matching
3. Default to "unknown" if no level detected

**Rationale**: Not all Loki deployments use structured metadata.
Regex fallback ensures broad compatibility. This matches
Grafana's approach.

**Alternatives considered**:
- Only structured metadata — rejected: many deployments don't
  have `level` label, would show all logs as "unknown"

## 4. Histogram Data Source

**Decision**: Use Loki's `/loki/api/v1/query_range` with
`query=count_over_time({namespace="ns"}[1m])` to generate
histogram data.

**Resolution**: Auto-calculate step based on time range:
- 5m range → 5s step
- 15m range → 15s step
- 1h range → 30s step
- 6h range → 2m step
- 24h range → 5m step
- 7d range → 30m step

**Rationale**: `count_over_time` is the standard LogQL
aggregation for volume histograms. Grafana uses the same
pattern. Step auto-calculation keeps data points under 200
for any time range.

## 5. Live Tail Implementation

**Decision**: Use Loki's `/loki/api/v1/tail` WebSocket
endpoint. Proxy through xkube backend (not direct browser→Loki)
to avoid CORS issues.

**Flow**:
1. Browser → WebSocket → xkube controller
2. xkube controller → WebSocket → Loki `/tail`
3. Stream responses back to browser

**Rationale**: Direct browser-to-Loki WebSocket would require
Loki to have CORS configured and be directly accessible from
the browser. Proxying through xkube is more secure and avoids
CORS configuration.

**Alternatives considered**:
- Polling `/query_range` every 2s — rejected: higher latency,
  more load on Loki, not true "live" experience.

## 6. Pagination Strategy

**Decision**: Cursor-based pagination using Loki's `start`
and `end` parameters with `limit`.

**Approach**:
- Initial load: `start=range_start, end=now, limit=1000`
- Load more: use the timestamp of the last log entry as
  new `end` parameter
- Infinite scroll on frontend triggers "load more"

**Rationale**: Loki's API uses time-based cursors, not offset.
This is the correct pattern for Loki pagination.

**Alternatives considered**:
- Offset-based pagination — rejected: Loki doesn't support
  offset parameter, would require fetching all results.

## 7. Cluster Table Extension

**Decision**: Add `loki_url` VARCHAR(255) column to
`xkb_cluster` table.

**Migration**: `ALTER TABLE xkb_cluster ADD COLUMN
loki_url VARCHAR(255) DEFAULT '';`

**Impact**: Additive only. Existing cluster CRUD will need
the `loki_url` field added to the edit form (optional field).
No existing functionality breaks.

**Rationale**: Follows constitution principle V (Backward
Compatibility) — additive DB change only.
