# API Contracts: Trace/Log Observability Redesign

**Date**: 2026-06-02

All endpoints follow the standard response envelope: `{"code": 0, "msg": "success", "data": ...}`

## New Endpoints

### GET /mrboard/trace/v1/ServiceOverview

Get aggregated metrics and recent traces for a specific service.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| clusterId | string | yes | Cluster ID |
| serviceName | string | yes | Service name |

**Response** (code=0):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "serviceName": "payment-service",
    "rpm": 1234,
    "avgLatencyMs": 120.5,
    "p99LatencyMs": 450.0,
    "errorRate": 0.021,
    "errorCount": 256,
    "lastActive": 1685000000000000000,
    "recentTraces": [
      {
        "traceID": "abc123...",
        "rootService": "payment-service",
        "rootOperation": "POST /pay",
        "duration": 230000000,
        "spanCount": 15,
        "startTime": 1685000000000000000,
        "status": "ok"
      }
    ]
  }
}
```

**Error** (code=-1):
```json
{"code": -1, "msg": "service_name is required"}
```

---

### GET /mrboard/trace/v1/TraceBySpanID

Find the traceID containing a specific spanID.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| clusterId | string | yes | Cluster ID |
| spanID | string | yes | 32-char hex span ID |

**Response** (code=0):
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "traceID": "full-trace-id-hex..."
  }
}
```

**Error** (code=-1, not found):
```json
{"code": -1, "msg": "未找到该 SpanID 对应的链路"}
```

## Modified Endpoints

### GET /mrboard/trace/v1/Dependencies (enhanced)

Existing endpoint — response fields added (backward compatible).

**Parameters**: unchanged (clusterId, start, end)

**Response** (code=0) — new fields marked with (NEW):
```json
{
  "code": 0,
  "msg": "success",
  "data": [
    {
      "parent": "gateway",
      "child": "payment-service",
      "callCount": 12340,
      "rpm": 205,
      "avgLatencyMs": 120.5,
      "errorRate": 0.021
    }
  ]
}
```

**Backward compatibility**: `callCount` preserved. New fields (`rpm`, `avgLatencyMs`, `errorRate`) are additive. Existing frontend code ignores unknown fields.
