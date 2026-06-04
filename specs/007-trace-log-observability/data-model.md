# Data Model: Trace/Log Observability Redesign

**Date**: 2026-06-02

## Entities

### ServiceNode (Frontend - React Flow node)
- `id`: string — service name
- `data.label`: string — service name  
- `data.status`: 'healthy' | 'degraded' | 'error'
- `data.avgLatencyMs`: number
- `data.errorRate`: number (0-1)
- `data.rpm`: number
- `data.callCount`: number (total calls)

### ServiceEdge (Frontend - React Flow edge)
- `source`: string — parent service name
- `target`: string — child service name
- `data.callCount`: number
- `data.rpm`: number
- `data.avgLatencyMs`: number
- `data.errorRate`: number (0-1)

### TempoDependency (Backend - existing, extended)
- `Parent`: string `json:"parent"`
- `Child`: string `json:"child"`
- `CallCount`: int64 `json:"callCount"`
- `Rpm`: int64 `json:"rpm"` (NEW)
- `AvgLatencyMs`: float64 `json:"avgLatencyMs"` (NEW)
- `ErrorRate`: float64 `json:"errorRate"` (NEW)

### ServiceOverview (Backend - new response)
- `ServiceName`: string
- `Rpm`: int64
- `AvgLatencyMs`: float64
- `P99LatencyMs`: float64
- `ErrorRate`: float64
- `ErrorCount`: int64
- `LastActive`: int64 (unix nano)
- `RecentTraces`: []TempoTrace (last 10)

## Relationships

```
ServiceNode --[ServiceEdge]--> ServiceNode
ServiceOverview --[contains]--> []TempoTrace
TempoTrace --[contains]--> []TempoSpan
TempoSpan --[correlates]--> []LogEntry (via service+time window or traceID)
```

## State Transitions

- ServiceNode status: `healthy` (err<1%, P99<500ms) → `degraded` (err 1-5% or P99>500ms) → `error` (err>5%)
- Computed on frontend from API data, not stored
