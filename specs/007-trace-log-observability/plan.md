# Implementation Plan: Trace/Log Observability Redesign

**Branch**: `007-trace-log-observability` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-trace-log-observability/spec.md`

## Summary

Redesign the trace/log observability module for ops usability: replace the Canvas-based service graph with React Flow (Grafana-style nodes showing metrics), add spanID search capability, enhance trace-log correlation with smart time windows, and add a service overview side panel. The backend needs two new endpoints (ServiceOverview, TraceBySpanID) and one enhancement (Dependencies with metrics).

## Technical Context

**Language/Version**: Go 1.25.4 (backend), TypeScript 5.x (frontend)

**Primary Dependencies**: 
- Backend: Beego v2, client-go v0.34.1
- Frontend: React 18, Vite, shadcn/ui v4, Tailwind CSS v4, reactflow (NEW ~50KB gzipped)

**Storage**: MySQL 8.0 (cluster config), Redis (sessions). Trace data in Tempo, logs in Loki, metrics in Prometheus.

**Testing**: No automated test suite. Manual testing via web UI. `npm run build` for frontend compilation check. `go build main.go` for backend.

**Target Platform**: Linux K8s pods (xkube backend + xkube-frontend nginx)

**Performance Goals**: Topology graph renders <2s with 50 nodes. SpanID search returns <3s. Log correlation loads <2s.

**Constraints**: 
- Constitution: Simplicity First, Surgical Changes, Multi-Cluster Safety, RBAC Enforcement, Backward Compatibility
- Template delimiters: `<<<` `>>>` (not `{{` `}}`)
- No automated tests — manual verification only
- Two new API endpoints must follow existing `{code, msg, data}` response pattern

**Scale/Scope**: 4 files modified, 2 new files, 2 new backend endpoints, 1 new npm dependency

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | Reuse existing patterns (controller→model→HTTP). No speculative abstractions. |
| II. Surgical Changes | PASS | Only touch trace/log files. No adjacent code changes. |
| III. Multi-Cluster Safety | PASS | All APIs take clusterId param. Tempo/Loki URLs resolved per-cluster. |
| IV. RBAC Enforcement | PASS | New endpoints go through existing RBAC middleware (not in `not_auth_package`). |
| V. Backward Compatibility | PASS | Dependencies API adds new fields (additive). No existing paths changed. New routes added only. |

**Post-Phase-1 Re-check**: PASS — no architectural changes, same patterns.

## Project Structure

### Documentation (this feature)

```text
specs/007-trace-log-observability/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit-tasks)
```

### Source Code (repository root)

```text
# Backend (Go/Beego)
controllers/
├── tempo_trace.go       # MODIFY: add ServiceOverview, TraceBySpanID methods
models/
├── tempo_trace_model.go # MODIFY: add GetServiceOverview, GetTraceBySpanID, extend TempoDependency

# Frontend (React/TypeScript)
frontend/
├── package.json         # MODIFY: add reactflow dependency
├── src/
│   ├── pages/log/
│   │   ├── ServiceGraph.tsx      # REWRITE: Canvas → React Flow
│   │   ├── ServiceNode.tsx       # NEW: React Flow custom node component
│   │   ├── ServiceOverviewPanel.tsx # NEW: side panel on node click
│   │   ├── TraceViewer.tsx       # MODIFY: add spanID search mode + duration/time filters
│   │   └── TraceDetail.tsx       # MODIFY: smart time window for log correlation
│   └── App.tsx                   # MODIFY: no route changes needed (existing routes suffice)
routers/
├── router.go            # MODIFY: add 2 new routes
```

**Structure Decision**: Follow existing project layout. Backend changes are surgical additions to existing files. Frontend adds 2 new components and modifies 2 existing files.

## Complexity Tracking

No constitution violations. All changes follow existing patterns.
