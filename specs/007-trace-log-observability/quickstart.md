# Quickstart: Trace/Log Observability Redesign

**Date**: 2026-06-02

## Prerequisites

- xkube deployed with Tempo, Loki, Prometheus configured
- Cluster with trace data flowing (OpenTelemetry instrumented services)
- `kubectl` access to the xkube namespace

## Verification Steps

### 1. Service Topology Graph (US1)

1. Navigate to: 链路追踪 → 服务拓扑 tab
2. Verify: Nodes show rounded rectangles with service name, latency, error rate, rpm
3. Verify: Nodes with error rate >5% are highlighted red
4. Click a node → side panel opens with service metrics + recent traces
5. Click a trace in side panel → navigates to TraceDetail
6. Click "查看日志" in side panel → navigates to LogViewer with service pre-filtered
7. Verify: Zoom/pan works, minimap visible

### 2. SpanID Search (US2)

1. Navigate to: 链路追踪 → 链路列表 tab
2. Switch search mode to "SpanID 定位"
3. Paste a 32-char hex spanID
4. Click "定位" → navigates to TraceDetail showing that trace
5. Verify: If spanID not found, shows error "未找到该 SpanID 对应的链路"

### 3. Trace-Log Correlation (US3)

1. Open a trace detail page
2. Click a span → detail panel opens
3. Click "日志" tab → logs from that span's service appear
4. Verify: Logs are within the span's time window (±2s for short spans, 2x for medium, ±5s for long)
5. Verify: If logs have traceID label, those appear first

### 4. Enhanced Trace Search (US4)

1. Navigate to: 链路追踪 → 链路列表 tab
2. Set operation name filter → results filtered
3. Set min duration filter (e.g., 500ms) → only slow traces shown
4. Set time range → results filtered to that window

## Build Verification

```bash
# Frontend
cd frontend && npm run build

# Backend
cd /root/xkube && go build main.go
```

## Deployment

```bash
# Frontend
kubectl cp frontend/dist/ xkube-frontend-<pod>:/usr/share/nginx/html/

# Backend  
kubectl cp main xkube-<pod>:/app/main
kubectl rollout restart deployment/xkube
```
