# Tasks: Trace/Log Observability Redesign

**Input**: Design documents from `/specs/007-trace-log-observability/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: No automated test suite — manual verification via web UI.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Install React Flow dependency

- [x] T001 Install reactflow package in frontend/package.json via `cd frontend && npm install @xyflow/react`

**Checkpoint**: React Flow available as dependency

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend API enhancements that multiple user stories depend on

**⚠️ CRITICAL**: Dependencies API enhancement (T002) is needed by US1 (topology graph). Other backend APIs are story-specific.

- [x] T002 Extend TempoDependency struct and GetDependencies function to return rpm, avgLatencyMs, errorRate from Prometheus in models/tempo_trace_model.go
- [x] T003 Add Dependencies response fields (rpm, avgLatencyMs, errorRate) to the JSON response in controllers/tempo_trace.go Dependencies method

**Checkpoint**: Dependencies API returns enriched metrics — topology graph can display per-edge data

---

## Phase 3: User Story 1 — Service Topology Graph Interaction (Priority: P1) 🎯 MVP

**Goal**: Replace Canvas topology with React Flow graph showing Grafana-style metric nodes, clickable with side panel

**Independent Test**: Load topology tab → nodes show service name/latency/error/rpm → click node opens side panel → click trace navigates to detail

### Implementation for User Story 1

- [x] T004 [P] [US1] Create ServiceNode custom React Flow component with Grafana-style rounded rectangle showing service name, status dot, avg latency, error rate, rpm bar in frontend/src/pages/log/ServiceNode.tsx
- [x] T005 [P] [US1] Create ServiceOverviewPanel slide-out component showing service metrics (rpm, latency, error rate), recent traces table, and quick action buttons (查看日志, 搜索 Traces) in frontend/src/pages/log/ServiceOverviewPanel.tsx
- [x] T006 [US1] Rewrite ServiceGraph.tsx to use React Flow with custom ServiceNode, zoom/pan/minimap, edge labels with call volume, red highlight for high-error services, click-to-open-panel in frontend/src/pages/log/ServiceGraph.tsx

**Checkpoint**: Topology graph fully interactive — nodes show metrics, click opens side panel, edges show call volume

---

## Phase 4: User Story 2 — SpanID Search (Priority: P2)

**Goal**: Add spanID search mode so ops can paste a spanID from alerts and jump to the trace

**Independent Test**: Paste a 32-char spanID → click 定位 → navigates to TraceDetail. Invalid spanID → error message.

### Implementation for User Story 2

- [x] T007 [US2] Add GetTraceBySpanID function that searches Tempo by span.id tag and returns traceID in models/tempo_trace_model.go
- [x] T008 [US2] Add TraceBySpanID controller method and register route GET /mrboard/trace/v1/TraceBySpanID in controllers/tempo_trace.go and routers/router.go
- [x] T009 [US2] Add spanID search mode to TraceViewer: mode toggle (链路搜索/SpanID定位), spanID input field, 定位 button, error handling for not found in frontend/src/pages/log/TraceViewer.tsx

**Checkpoint**: SpanID search works end-to-end — paste spanID → backend finds traceID → frontend navigates to TraceDetail

---

## Phase 5: User Story 3 — Trace-Log Correlation (Priority: P3)

**Goal**: Smart time window for embedded log panel based on span duration, traceID-priority log display

**Independent Test**: Open trace → click span → Logs tab → logs within correct time window. Short span: ±2s. Medium span: 2x duration. Long span: ±5s. Logs with traceID label shown first.

### Implementation for User Story 3

- [x] T010 [US3] Update TraceDetail.tsx Logs tab useEffect to use smart time window logic: short(<1s)→±2s, medium(1-10s)→2x duration, long(>10s)→±5s. Add traceID-priority sorting when log entries have traceID label in frontend/src/pages/log/TraceDetail.tsx

**Checkpoint**: Log correlation uses smart time windows and prioritizes traceID-matched logs

---

## Phase 6: User Story 4 — Enhanced Trace Search (Priority: P4)

**Goal**: Add operation name, time range, and duration filters to trace search

**Independent Test**: Filter by operation → results filtered. Filter by min duration → only slow traces. Filter by time range → results scoped.

### Implementation for User Story 4

- [x] T011 [US4] Add operation name dropdown (fetched from Tags API), time range selector (最近1小时/6小时/24小时/3天), and min/max duration inputs to TraceViewer search bar in frontend/src/pages/log/TraceViewer.tsx
- [x] T012 [US4] Wire new search params (operation, start, end, minDuration, maxDuration) to existing Search API call in frontend/src/pages/log/TraceViewer.tsx

**Checkpoint**: Trace search supports all new filters — operation, time range, duration

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final integration and verification

- [x] T013 Verify all routes work: topology tab, spanID search, trace detail with logs, enhanced search filters — manual testing per quickstart.md
- [x] T014 Run `npm run build` in frontend/ and `go build main.go` in project root — fix any compilation errors
- [x] T015 Deploy to K8s: `kubectl cp frontend/dist/` to xkube-frontend pod, `kubectl cp main` to xkube pod, restart deployments

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup (reactflow installed)
- **US1 (Phase 3)**: Depends on Phase 2 (T002-T003 for enriched Dependencies API)
- **US2 (Phase 4)**: Independent of US1 — can start after Phase 2
- **US3 (Phase 5)**: Independent — only modifies TraceDetail.tsx Logs tab
- **US4 (Phase 6)**: Independent of US1/US2 — only modifies TraceViewer search
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Needs T002-T003 (Dependencies API enrichment)
- **US2 (P2)**: Needs T001 (reactflow installed) — otherwise independent
- **US3 (P3)**: Fully independent — only touches TraceDetail.tsx
- **US4 (P4)**: Fully independent — only touches TraceViewer.tsx

### Parallel Opportunities

- T004 + T005 can run in parallel (different files: ServiceNode.tsx, ServiceOverviewPanel.tsx)
- US2, US3, US4 can all run in parallel after Phase 2 completes (different files)
- T011 + T012 are in the same file (TraceViewer.tsx) — must be sequential

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: T001 (install reactflow)
2. Complete Phase 2: T002-T003 (Dependencies API enrichment)
3. Complete Phase 3: T004-T006 (React Flow topology + side panel)
4. **STOP and VALIDATE**: Topology graph renders, nodes show metrics, click opens panel
5. Deploy if ready — this is the biggest UX improvement

### Incremental Delivery

1. Setup + Foundational → Dependencies API enriched
2. Add US1 → React Flow topology + side panel → Deploy (MVP!)
3. Add US2 → SpanID search → Deploy
4. Add US3 → Smart log correlation → Deploy
5. Add US4 → Enhanced search filters → Deploy
6. Polish → Final verification → Deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend changes follow existing controller→model→HTTP patterns
- Frontend changes use existing shadcn/ui components + new React Flow
