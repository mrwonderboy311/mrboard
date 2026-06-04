# Quickstart: Tempo Tracing Integration

## Prerequisites

1. Tempo instance deployed and accessible from xkube server (e.g., `http://tempo.monitoring:3100`)
2. xkube running with the new tracing code deployed
3. A cluster configured in xkube with kubeconfig

## Setup

### Step 1: Configure Tempo URL

1. Navigate to **集群管理** (Cluster Management)
2. Click **编辑** (Edit) on the target cluster
3. Fill in the **Tempo URL** field (e.g., `http://tempo.monitoring:3100`)
4. Save

### Step 2: Verify Connectivity

1. Navigate to **链路追踪** (Trace Viewer) in the sidebar
2. Select the cluster from the dropdown
3. The page should load and show service list (or "No traces found" if empty)

## Test Scenarios

### T1: Search Traces
1. Select cluster → select service → set time range to "1h"
2. Click search
3. **Expected**: Trace list appears with trace ID, service, operation, duration, timestamp

### T2: Waterfall View
1. Click any trace row from search results
2. **Expected**: Waterfall view renders with horizontal bars, service color coding, nesting
3. Hover over a span → tooltip shows details
4. Click a span → detail panel opens

### T3: Trace ID Lookup
1. Copy a trace ID from the search results
2. Paste into the "Trace ID / Span ID" search field
3. **Expected**: Direct waterfall view of that trace

### T4: Span ID Lookup
1. Note a span ID from a span detail panel
2. Enter it in the search field
3. **Expected**: Parent trace found, waterfall opens with that span highlighted

### T5: Service Dependency Map
1. Click the "依赖图" (Dependencies) tab
2. **Expected**: Graph shows service nodes with directed edges
3. Click a service node → traces filtered to that service

### T6: Trace-to-Log Correlation
1. Open a trace waterfall view
2. Click "查看日志" (View Logs) on a span
3. **Expected**: Log viewer opens with service and time range pre-filled
