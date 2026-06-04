# Data Model: Loki Log Viewer

**Date**: 2026-06-01
**Feature**: 001-loki-log-viewer

## Entities

### 1. Cluster (existing — extended)

**Table**: `xkb_cluster` (existing)

**New field**:
- `loki_url` VARCHAR(255) DEFAULT '' — Loki HTTP endpoint
  URL (e.g., `http://loki.monitoring:3100`)

**Relationships**: One cluster has one optional Loki connection.

**Validation**: Must be a valid HTTP/HTTPS URL if non-empty.
Empty string means Loki not configured for this cluster.

### 2. LogEntry (runtime — not persisted)

**Source**: Loki HTTP API response

**Fields**:
- `timestamp` (time.Time) — Log entry timestamp from Loki
- `level` (string) — Detected severity: error, warn, info,
  debug, trace, unknown
- `namespace` (string) — Kubernetes namespace label
- `pod` (string) — Pod name label
- `container` (string) — Container name label
- `app` (string) — Application/service name label
- `message` (string) — Raw log line content
- `labels` (map[string]string) — All Loki labels

**Lifecycle**: Ephemeral — fetched from Loki on each request,
not stored in MySQL.

### 3. LogFilter (frontend state — not persisted)

**Fields**:
- `clusterId` (string) — Selected cluster
- `namespace` (string) — Selected namespace
- `services` ([]string) — Selected service filters
- `levels` ([]string) — Selected log levels
- `searchText` (string) — Text search query
- `startTime` (time.Time) — Range start
- `endTime` (time.Time) — Range end
- `direction` (string) — "backward" (newest first) or
  "forward" (oldest first)

**Lifecycle**: Frontend JavaScript state, sent as query
parameters to backend on each request.

### 4. HistogramBucket (runtime — not persisted)

**Fields**:
- `timestamp` (time.Time) — Bucket start time
- `count` (int64) — Number of log entries in the bucket
- `level` (string) — Log level for stacked histogram
  (optional)

**Source**: Loki `count_over_time` query result.

## State Transitions

No persistent state transitions. All data is read-only from
Loki's perspective. The only write operation is saving the
`loki_url` field on the cluster entity.

## Data Volume Assumptions

- Typical Loki query returns 1000-10000 log lines per request
- Histogram has ~200 data points per time range
- Label values list is typically <500 entries per namespace
- Live tail streams 10-100 lines per second during normal load
