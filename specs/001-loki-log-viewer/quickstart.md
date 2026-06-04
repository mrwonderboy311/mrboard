# Quickstart: Loki Log Viewer

## Prerequisites

1. xkube is running and accessible
2. Loki is deployed and accessible from the xkube server
3. At least one K8s cluster is configured in xkube

## Setup Steps

### 1. Configure Loki URL for a cluster

Navigate to 集群管理 → Edit cluster → enter the Loki URL
(e.g., `http://loki.monitoring:3100`).

The Loki URL is stored per-cluster. If left empty, the log
viewer will show an informational message for that cluster.

### 2. Access the Log Viewer

Click "日志查看" in the left sidebar menu (top-level
navigation entry).

### 3. Select Cluster and Namespace

Use the cluster dropdown and namespace dropdown at the top
of the page to scope the log query.

### 4. Explore Logs

- **Volume histogram**: Shows log distribution over time.
  Click on a bar to zoom into that time range.
- **Service filter chips**: Click a service name to filter
  logs to that service only. Click again to remove.
- **Log level filter**: Click error/warn/info/debug to
  filter by severity.
- **Text search**: Type in the search box to highlight
  matching log lines.
- **Time range**: Use preset buttons (5m, 15m, 1h, 6h,
  24h, 7d) or custom range picker.

### 5. Live Tail (Optional)

Click the "实时" (Live) button to enable live tail streaming.
New log entries will appear at the top of the list in
real-time. Click "暂停" (Pause) to stop the stream.

## Verification

1. Select a cluster with Loki configured
2. Select a namespace with active workloads
3. Verify histogram shows log volume
4. Click a service chip → verify logs filter
5. Type a search term → verify highlighting
6. Click "error" level → verify only error logs shown
7. Change time range → verify histogram and logs update
