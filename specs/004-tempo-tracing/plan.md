# Implementation Plan: Tempo Distributed Tracing

**Branch**: `004-tempo-tracing` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-tempo-tracing/spec.md`

## Summary

Add Tempo distributed tracing integration to xkube. The feature enables operators to search traces by service/operation/time, view waterfall visualizations, search by trace/span ID, see service dependency graphs, and correlate traces with Loki logs. Follows the same pattern as the existing Loki log viewer: model layer for Tempo HTTP API calls, controller for Beego endpoints, standalone HTML page with Layui/jQuery.

## Technical Context

**Language/Version**: Go 1.25.4

**Primary Dependencies**: Beego v2 (web framework), net/http (Tempo API calls), encoding/json (response parsing)

**Storage**: MySQL — add `tempo_url` column to `xkb_cluster` table (mirrors `loki_url` pattern)

**Testing**: Manual testing via web UI — no automated test suite exists

**Target Platform**: Linux server (ARM64 build), web UI served by Beego

**Project Type**: Web service (Go backend + server-rendered HTML frontend)

**Performance Goals**: Search results < 5s, waterfall render < 3s for 500 spans, trace ID lookup < 3s

**Constraints**: No new frameworks (Layui/jQuery only), no SPA, each page standalone HTML

**Scale/Scope**: Multi-cluster platform, traces queried from external Tempo instance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | New feature, no abstractions beyond what's needed. Model → Controller → HTML pattern reused. |
| II. Surgical Changes | PASS | Only adds new files + 1 column to existing table. No modifications to existing code except router.go (additive routes) and clusterEdit.html (add tempo_url field). |
| III. Multi-Cluster Safety | PASS | All Tempo API calls scoped by clusterId. Tempo URL fetched per-cluster from DB (same as Loki). |
| IV. RBAC Enforcement | PASS | New endpoints will be added to RBAC. Trace viewer page requires authentication (not in `not_auth_package`). |
| V. Backward Compatibility | PASS | Only additive changes: new column, new routes, new HTML page. No existing API changes. |

## Project Structure

### Documentation (this feature)

```text
specs/004-tempo-tracing/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical research
├── data-model.md        # Entity definitions
├── contracts/           # API contracts
└── tasks.md             # Task breakdown (via /speckit-tasks)
```

### Source Code (repository root)

```text
models/
├── tempo_trace_model.go   # Tempo API client: search, trace detail, dependencies

controllers/
├── tempo_trace.go         # Beego controller: Search, Trace, Dependencies, Tags, TagValues

routers/
└── router.go              # Add new Tempo routes

views/front/page/xkube/
├── traceViewer.html       # Main trace viewer page (search + waterfall + dependency map)
└── clusterEdit.html       # Add tempo_url field (existing file, surgical edit)

views/front/api/
└── init.json              # Add "链路追踪" menu entry (existing file, surgical edit)
```

**Structure Decision**: Follow existing project layout — no new directories. New files mirror the Loki pattern exactly.

## Complexity Tracking

No constitution violations. All changes follow existing patterns.
