# Research: Trace/Log Observability Redesign

**Date**: 2026-06-02

## R1: React Flow vs Canvas for Service Topology

**Decision**: Replace Canvas with React Flow (`@xyflow/react`)

**Rationale**: 
- Current Canvas implementation (476 lines) has basic force-directed layout, no zoom/pan, no click events beyond simple hit-test
- React Flow provides: built-in zoom/pan, node dragging, minimap, controls, custom node components, edge routing
- ~50KB gzipped — acceptable for a management tool
- Custom node components allow Grafana-style rounded rectangles with embedded metrics

**Alternatives considered**:
- **Cytoscape.js**: More graph-theory focused, heavier (~200KB), less React-native
- **D3.js force layout**: Lower level, more code to write, no built-in interaction
- **Keep Canvas + enhance**: Would need to reimplement zoom/pan, minimap, custom rendering — more work than using React Flow

## R2: SpanID Search Implementation

**Decision**: Backend searches Tempo by spanID tag, returns traceID

**Rationale**:
- Tempo's search API supports tag filtering: `span.id=<spanID>` (Tempo v2+)
- If tag search unavailable, fallback: search recent traces by service, match spans client-side
- Frontend: dedicated input field + button, navigates to TraceDetail with the found traceID

**Alternatives considered**:
- **Direct Tempo API call from frontend**: Would expose Tempo URL to client, security concern
- **Search all traces and match client-side**: Too slow for large deployments

## R3: Trace-Log Correlation Strategy

**Decision**: Smart time window based on span duration, with traceID priority

**Rationale**:
- Loki logs may or may not have traceID labels — system handles both cases
- Time window logic: short spans (<1s) → ±2s, medium (1-10s) → 2x duration, long (>10s) → ±5s
- If logs have traceID label matching current trace → show those first (exact match)

**Alternatives considered**:
- **Always query by traceID**: Won't work if logs don't have traceID label
- **Fixed ±5s window**: Too wide for short spans, too narrow for long spans

## R4: Dependencies API Metrics Enrichment

**Decision**: Add rpm, avgLatencyMs, errorRate to existing Dependencies API response

**Rationale**:
- Current `TempoDependency` only has `parent`, `child`, `callCount`
- Prometheus already has `traces_service_graph_request_total`, `traces_service_graph_request_duration_seconds_bucket`, `traces_service_graph_failed_total`
- Additive change — existing fields preserved, new fields added

**Implementation**: Extend `GetDependencies()` to run 3 PromQL queries and merge results.

## R5: ServiceOverview API Design

**Decision**: New endpoint combining Tempo search + PromQL aggregation

**Rationale**:
- Node click needs: service metrics (rpm, latency, error rate) + recent traces
- Single API call avoids multiple round-trips
- Combines: PromQL for aggregated metrics, Tempo search for recent traces (limit 10)

**Alternatives considered**:
- **Separate APIs for metrics and traces**: More flexible but 2 round-trips from frontend
- **Frontend calls Prometheus directly**: Security concern, exposes Prometheus URL
