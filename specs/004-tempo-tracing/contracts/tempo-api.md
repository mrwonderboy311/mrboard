# API Contract: Tempo Trace Viewer

## Base Path: `/xkube/trace/v1/`

All endpoints require authentication (not in `not_auth_package`).

---

### GET /xkube/trace/v1/Search

Search for traces matching criteria.

**Parameters** (query string):

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| clusterId | string | yes | Cluster identifier |
| service | string | no | Filter by service name |
| operation | string | no | Filter by operation name |
| tags | string | no | Filter by tags (key=value format, comma-separated) |
| start | string | yes | Start time (Unix seconds) |
| end | string | yes | End time (Unix seconds) |
| limit | int | no | Max results (default: 20, max: 100) |
| minDuration | string | no | Min span duration (e.g., "100ms") |
| maxDuration | string | no | Max span duration (e.g., "5s") |

**Response**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "traces": [
      {
        "traceID": "abc123...",
        "rootService": "my-service",
        "rootOperation": "GET /api/v1/users",
        "duration": 1234000,
        "spanCount": 15,
        "startTime": 1717200000000000,
        "status": "ok"
      }
    ],
    "total": 42
  }
}
```

---

### GET /xkube/trace/v1/Trace

Get full trace detail by trace ID.

**Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| clusterId | string | yes | Cluster identifier |
| traceId | string | yes | Trace ID (hex string) |

**Response**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "traceID": "abc123...",
    "spans": [
      {
        "spanID": "def456...",
        "traceID": "abc123...",
        "parentSpanID": "",
        "operationName": "GET /api/v1/users",
        "serviceName": "my-service",
        "startTime": 1717200000000000,
        "duration": 1234000,
        "status": "ok",
        "tags": {"http.method": "GET", "http.status_code": "200"},
        "events": []
      }
    ],
    "services": ["my-service", "auth-service"],
    "rootService": "my-service",
    "rootOperation": "GET /api/v1/users",
    "duration": 1234000
  }
}
```

---

### GET /xkube/trace/v1/Dependencies

Get service dependency graph.

**Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| clusterId | string | yes | Cluster identifier |
| start | string | no | Start time (Unix seconds, default: 1h ago) |
| end | string | no | End time (Unix seconds, default: now) |

**Response**:
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "dependencies": [
      {"parent": "gateway", "child": "auth-service", "callCount": 1500},
      {"parent": "gateway", "child": "user-service", "callCount": 800}
    ]
  }
}
```

---

### GET /xkube/trace/v1/Tags

List available tag keys for a service.

**Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| clusterId | string | yes | Cluster identifier |
| service | string | no | Filter by service name |

**Response**:
```json
{
  "code": 0,
  "msg": "success",
  "data": ["http.method", "http.status_code", "db.system"]
}
```

---

### GET /xkube/trace/v1/TagValues

List values for a specific tag.

**Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| clusterId | string | yes | Cluster identifier |
| tag | string | yes | Tag key |
| service | string | no | Filter by service name |

**Response**:
```json
{
  "code": 0,
  "msg": "success",
  "data": ["GET", "POST", "PUT", "DELETE"]
}
```

---

### Error Response (all endpoints)

```json
{
  "code": -1,
  "msg": "Tempo not configured for this cluster"
}
```

Common error codes:
- `-1`: General error (Tempo unreachable, invalid params, etc.)
