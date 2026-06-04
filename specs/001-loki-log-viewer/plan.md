# Implementation Plan: Loki Log Viewer

**Branch**: `001-loki-log-viewer` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-loki-log-viewer/spec.md`

## Summary

Add a Loki-based log viewer to xkube that allows operators
and developers to browse, filter, and search logs from all
services across a Kubernetes cluster. The UI follows the
Grafana Logs Drilldown pattern: time-based volume histogram,
label filter chips, log level color coding, text search with
highlighting, and live tail. Loki is queried via its HTTP API
with no authentication (internal network). The feature adds
new controller, model, routes, and frontend pages without
modifying existing functionality.

## Technical Context

**Language/Version**: Go 1.25.4

**Primary Dependencies**: Beego v2 (web framework),
client-go v0.34.1 (K8s client), ECharts (frontend histogram),
jQuery + Layui (frontend UI)

**Storage**: MySQL 8.0 via Beego ORM — extend `xkb_cluster`
table with `loki_url` column (additive, no breaking change)

**Testing**: None — no automated test suite exists; manual
testing via web UI

**Target Platform**: Linux server (web application)

**Project Type**: web-service

**Performance Goals**:
- Histogram loads < 2s for 24h range (SC-002)
- Live tail latency < 3s (SC-004)
- Text search finds results within 30s (SC-001)

**Constraints**:
- No auth to Loki (internal network, clarified)
- Must not break existing cluster management
- Must follow existing MVC pattern (controller → model → Loki HTTP)
- Frontend uses existing Layui + jQuery stack (no SPA)
- Template delimiters: `<<<` and `>>>`

**Scale/Scope**: Multi-cluster platform; Loki query volume
depends on log ingestion rate. Pagination/sampling for >100K
log lines.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ PASS | New feature adds 1 controller, 1 model, 1 HTML page. No unnecessary abstractions. |
| II. Surgical Changes | ✅ PASS | Only extends `xkb_cluster` table and adds `loki_url` column. No changes to existing controllers/models. |
| III. Multi-Cluster Safety | ✅ PASS | Loki URL is per-cluster. All queries scoped to selected cluster ID. |
| IV. RBAC Enforcement | ✅ PASS | New RBAC permission node for "日志查看" will be added. Route goes through RBAC middleware. |
| V. Backward Compatibility | ✅ PASS | Additive DB change only. New routes only. No existing API changes. |

## Project Structure

### Documentation (this feature)

```text
specs/001-loki-log-viewer/
├── plan.md              # This file
├── research.md          # Phase 0 — Loki API research
├── data-model.md        # Phase 1 — Entity definitions
├── quickstart.md        # Phase 1 — Setup guide
├── contracts/           # Phase 1 — API contracts
└── tasks.md             # Phase 2 (/speckit-tasks command)
```

### Source Code (repository root)

```text
# New files for this feature
controllers/
└── loki_log.go              # Loki log controller

models/
└── loki_log_model.go        # Loki HTTP client + log parsing

views/front/page/xkube/
├── logViewer.html           # Main log viewer page
└── logViewer.js             # Log viewer JavaScript (optional, may inline)

# Modified files (minimal surgical changes)
conf/app.conf                # No changes needed (Loki URL in DB)
routers/router.go            # Add log viewer routes (1 block)
xkb_cluster table            # Add loki_url column
```

**Structure Decision**: Follows existing xkube MVC pattern.
New files only — no modifications to existing controllers
or models. The Loki client is a standalone model
(`loki_log_model.go`) that makes HTTP requests to Loki's
API. The controller (`loki_log.go`) handles request/response.
The frontend is a single HTML page using Layui + ECharts.

## Complexity Tracking

> No constitution violations — table intentionally left empty.
