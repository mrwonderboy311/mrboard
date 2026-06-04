# Data Model: Tempo Distributed Tracing

## Database Changes

### xkb_cluster (existing table — additive only)

Add one column:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| tempo_url | VARCHAR(500) | '' | Tempo HTTP API base URL (e.g., `http://tempo.monitoring:3100`) |

No existing columns modified or dropped.

## API Response Entities

These are NOT stored in the database — they are proxied from the Tempo API.

### Trace

Represents a distributed transaction retrieved from Tempo.

| Field | Type | Description |
|-------|------|-------------|
| traceID | string | Hex-encoded trace identifier (32 chars) |
| rootService | string | Service name of the root span |
| rootOperation | string | Operation name of the root span |
| duration | int64 | Total trace duration in microseconds |
| spanCount | int | Number of spans in the trace |
| startTime | int64 | Trace start time (Unix microseconds) |
| status | string | "ok" or "error" (derived from root span) |

### Span

Represents a single unit of work within a trace.

| Field | Type | Description |
|-------|------|-------------|
| spanID | string | Hex-encoded span identifier (16 chars) |
| traceID | string | Parent trace ID |
| parentSpanID | string | Parent span ID (empty for root span) |
| operationName | string | Operation name |
| serviceName | string | Service that produced this span |
| startTime | int64 | Span start time (Unix microseconds) |
| duration | int64 | Span duration in microseconds |
| status | string | "ok" or "error" |
| tags | map[string]string | Key-value attributes |
| events | []SpanEvent | Timestamped log events within the span |

### SpanEvent

| Field | Type | Description |
|-------|------|-------------|
| timestamp | int64 | Event time (Unix microseconds) |
| name | Event name |
| attributes | map[string]string | Event attributes |

### ServiceDependency

Represents a call relationship between two services.

| Field | Type | Description |
|-------|------|-------------|
| parent | string | Source service name |
| child | string | Target service name |
| callCount | int64 | Number of calls |

## Entity Relationships

```
xkb_cluster (1) ──has──> (N) Trace (from Tempo API)
Trace (1) ──contains──> (N) Span
Span (0..1) ──parent of──> (N) Span
ServiceDependency ──derived from──> Trace/Span data
```
