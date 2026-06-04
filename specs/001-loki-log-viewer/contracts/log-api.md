# API Contract: Loki Log Viewer

**Base path**: `/xkube/log/v1`

## Endpoints

### GET /xkube/log/v1/Labels

List available label names for a cluster+namespace.

**Query Parameters**:
- `clusterId` (string, required) — Cluster ID
- `namespace` (string, required) — Kubernetes namespace
- `start` (string, required) — Unix timestamp (seconds)
- `end` (string, required) — Unix timestamp (seconds)

**Response** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": ["app", "container", "pod", "namespace", "stream"]
}
```

---

### GET /xkube/log/v1/LabelValues

List values for a specific label.

**Query Parameters**:
- `clusterId` (string, required) — Cluster ID
- `namespace` (string, required) — Kubernetes namespace
- `label` (string, required) — Label name (e.g., "app")
- `start` (string, required) — Unix timestamp (seconds)
- `end` (string, required) — Unix timestamp (seconds)

**Response** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": ["my-app", "nginx", "redis", "api-server"]
}
```

---

### GET /xkube/log/v1/Query

Query logs with filters.

**Query Parameters**:
- `clusterId` (string, required) — Cluster ID
- `namespace` (string, required) — Kubernetes namespace
- `services` (string, optional) — Comma-separated service names
- `levels` (string, optional) — Comma-separated log levels
- `search` (string, optional) — Text search filter
- `start` (string, required) — Unix timestamp (seconds)
- `end` (string, required) — Unix timestamp (seconds)
- `limit` (int, optional, default=1000) — Max log lines
- `direction` (string, optional, default="backward") —
  "backward" (newest first) or "forward" (oldest first)

**Response** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "entries": [
      {
        "timestamp": "2026-06-01T10:30:00.123Z",
        "level": "error",
        "namespace": "production",
        "pod": "my-app-7d8f9-x1k2p",
        "container": "my-app",
        "app": "my-app",
        "message": "ERROR: connection timeout to database"
      }
    ],
    "total": 1234
  }
}
```

**Error Response** (500):
```json
{
  "code": -1,
  "msg": "Loki unreachable: connection refused to http://loki:3100"
}
```

---

### GET /xkube/log/v1/Histogram

Query log volume histogram data.

**Query Parameters**:
- `clusterId` (string, required) — Cluster ID
- `namespace` (string, required) — Kubernetes namespace
- `services` (string, optional) — Comma-separated service names
- `levels` (string, optional) — Comma-separated log levels
- `start` (string, required) — Unix timestamp (seconds)
- `end` (string, required) — Unix timestamp (seconds)
- `step` (string, optional) — Query resolution step
  (auto-calculated if omitted)

**Response** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "buckets": [
      {"timestamp": 1717237800, "count": 42},
      {"timestamp": 1717237860, "count": 38}
    ],
    "levelBuckets": {
      "error": [
        {"timestamp": 1717237800, "count": 3},
        {"timestamp": 1717237860, "count": 5}
      ],
      "info": [
        {"timestamp": 1717237800, "count": 35},
        {"timestamp": 1717237860, "count": 30}
      ]
    }
  }
}
```

---

### GET /xkube/log/v1/Levels

Get log level distribution for the current filter context.

**Query Parameters**:
- `clusterId` (string, required) — Cluster ID
- `namespace` (string, required) — Kubernetes namespace
- `services` (string, optional) — Comma-separated service names
- `start` (string, required) — Unix timestamp (seconds)
- `end` (string, required) — Unix timestamp (seconds)

**Response** (200):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "error": 120,
    "warn": 340,
    "info": 5600,
    "debug": 890,
    "unknown": 50
  }
}
```

---

### WebSocket /xkube/log/v1/Tail

Live tail stream via WebSocket.

**Query Parameters** (on WebSocket upgrade):
- `clusterId` (string, required) — Cluster ID
- `namespace` (string, required) — Kubernetes namespace
- `services` (string, optional) — Comma-separated service names

**WebSocket Messages** (server → client):
```json
{
  "type": "entry",
  "data": {
    "timestamp": "2026-06-01T10:30:00.123Z",
    "level": "info",
    "namespace": "production",
    "pod": "my-app-7d8f9-x1k2p",
    "container": "my-app",
    "app": "my-app",
    "message": "GET /api/health 200 12ms"
  }
}
```

**Error Message**:
```json
{
  "type": "error",
  "data": {"message": "Loki connection lost"}
}
```
