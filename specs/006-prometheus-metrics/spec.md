# Prometheus Monitoring Integration

**Feature**: xkube Prometheus metrics export and monitoring dashboard
**Branch**: 006-frontend-backend-split
**Date**: 2026-06-01

## Overview

Integrate Prometheus monitoring into xkube to expose application metrics for scraping, and provide a built-in monitoring dashboard in the React frontend.

## Architecture

```
┌─────────────┐     scrape      ┌──────────────┐
│  Prometheus  │ ──────────────► │  xkube       │
│  Server      │   /metrics      │  Backend     │
└─────────────┘                  │  (Go/Beego)  │
                                 └──────────────┘
                                       │
                                  Beego Filter
                                  (BeforeExec/
                                   AfterExec)
                                       │
                                 ┌─────┴─────┐
                                 │  Metrics   │
                                 │  Middleware │
                                 └───────────┘

┌─────────────┐    fetch /metrics    ┌──────────────┐
│  React SPA   │ ──────────────────► │  Monitor     │
│  (Frontend)  │                     │  Dashboard   │
└─────────────┘                      └──────────────┘
```

## Components

### 1. Prometheus Metrics Controller (`controllers/prometheus.go`)

Serves the `/metrics` endpoint using `promhttp.Handler()`. Registers 6 custom metrics:

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `xkube_clusters_total` | Gauge | - | Total registered clusters |
| `xkube_deployments_total` | GaugeVec | cluster | Deployments per cluster |
| `xkube_http_requests_total` | CounterVec | method, path, status | HTTP request count |
| `xkube_http_request_duration_seconds` | HistogramVec | method, path | Request latency |
| `xkube_active_sessions` | Gauge | - | Active user sessions |
| `xkube_users_total` | Gauge | - | Registered users |

### 2. HTTP Metrics Middleware (`middleware/metrics.go`)

Beego filter middleware that automatically records request count and duration for all HTTP endpoints:
- `MetricsFilter` (BeforeExec): Records start time in request context
- `MetricsAfterFilter` (AfterExec): Computes duration, increments counter, observes histogram

### 3. Frontend Monitor Dashboard (`frontend/src/pages/monitor/MonitorDashboard.tsx`)

React page that fetches `/metrics` and displays:
- Overview cards: clusters, deployments, sessions, users
- Per-cluster deployment breakdown
- Top 10 API requests by count
- Top 10 API requests by duration
- Link to raw Prometheus metrics

### 4. Router Registration (`routers/router.go`)

- Registers `/metrics` route pointing to `MetricsHandler.Get`
- Calls `middleware.RegisterMetricsMiddleware()` on init

## Prometheus Scrape Configuration

### Kubernetes ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: xkube-backend
  namespace: mrboard
  labels:
    app: xkube
spec:
  selector:
    matchLabels:
      app: xkube-backend
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
  namespaceSelector:
    matchNames:
      - mrboard
```

### Static Prometheus Config

```yaml
scrape_configs:
  - job_name: 'xkube'
    metrics_path: /metrics
    static_configs:
      - targets: ['xkube-backend.mrboard.svc.cluster.local:8080']
    scrape_interval: 30s
```

## Deployment

### Backend

```bash
# Build and push
nerdctl build -t registry.cn-hangzhou.aliyuncs.com/xkube/xkube-backend:prometheus -f Dockerfile .
nerdctl push registry.cn-hangzhou.aliyuncs.com/xkube/xkube-backend:prometheus

# Deploy
kubectl set image deployment/xkube-backend xkube-backend=registry.cn-hangzhou.aliyuncs.com/xkube/xkube-backend:prometheus -n mrboard
```

### Frontend

```bash
# Build and push
nerdctl build -t registry.cn-hangzhou.aliyuncs.com/xkube/xkube-frontend:monitor -f frontend/Dockerfile frontend/
nerdctl push registry.cn-hangzhou.aliyuncs.com/xkube/xkube-frontend:monitor

# Deploy
kubectl set image deployment/xkube-frontend xkube-frontend=registry.cn-hangzhou.aliyuncs.com/xkube/xkube-frontend:monitor -n xkube
```

## Verification

1. `curl http://localhost:8080/metrics` — returns Prometheus text format metrics
2. Open frontend → 监控 → 监控面板 — shows metric cards and charts
3. Prometheus scrape target shows xkube as UP

## Dependencies

- `github.com/prometheus/client_golang v1.23.0` (promoted from indirect to direct)
- `github.com/prometheus/client_model v0.6.2`
- `github.com/prometheus/common v0.65.0`
- `github.com/prometheus/procfs v0.17.0`
