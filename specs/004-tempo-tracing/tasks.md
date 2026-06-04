# Tasks: Tempo Distributed Tracing

**Input**: Design documents from `specs/004-tempo-tracing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tempo-api.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Database schema change and configuration entries

- [x] T001 Add `tempo_url` column to `xkb_cluster` table: `ALTER TABLE xkb_cluster ADD COLUMN tempo_url VARCHAR(500) DEFAULT '' AFTER loki_url;`
- [x] T002 Add `tempo_url` field to cluster edit form in `views/front/page/xkube/clusterEdit.html` (add input field + load in form.val)
- [x] T003 Add "链路追踪" menu entry to sidebar in `views/front/api/init.json` (point to `xkube/traceViewer.html`)
- [x] T004 Update `GetList_Cluster` in `models/cluster_model.go` to include `tempo_url` in select fields
- [x] T005 Update `Update_Cluster` in `models/cluster_model.go` to include `TempoUrl` in update params

**Checkpoint**: Cluster model supports tempo_url — can configure via cluster edit form

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Model + Controller + Routes — the Tempo API proxy layer that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create Tempo model with HTTP client, response types, and GetTempoUrl function in `models/tempo_trace_model.go` (follow `loki_log_model.go` pattern: `tempoHttpGet`, `TempoTraceResult`, `TempoSpanResult`)
- [x] T007 Implement `SearchTraces` function in `models/tempo_trace_model.go` — calls Tempo `/api/search`, returns trace list with traceID, rootService, rootOperation, duration, spanCount, startTime
- [x] T008 Implement `GetTraceDetail` function in `models/tempo_trace_model.go` — calls Tempo `/api/traces/{traceID}`, parses Jaeger JSON format into spans with parent-child relationships
- [x] T009 Implement `GetDependencies` function in `models/tempo_trace_model.go` — calls Tempo `/api/v1/service-dependencies`, returns parent/child/callCount tuples
- [x] T010 Implement `SearchTags` and `SearchTagValues` functions in `models/tempo_trace_model.go` — calls Tempo `/api/search/tags` and `/api/search/tag/{tag}/values`
- [x] T011 Create Tempo controller with Search, Trace, Dependencies, Tags, TagValues actions in `controllers/tempo_trace.go` (follow `loki_log.go` pattern: parse params, call model, return JSON)
- [x] T012 Add Tempo routes to `routers/router.go`: `/xkube/trace/v1/Search`, `/xkube/trace/v1/Trace`, `/xkube/trace/v1/Dependencies`, `/xkube/trace/v1/Tags`, `/xkube/trace/v1/TagValues`
- [x] T013 Verify compilation: `go build main.go`

**Checkpoint**: All Tempo API endpoints functional — can test with curl against the backend

---

## Phase 3: User Story 1 — Search and View Traces (Priority: P1) 🎯 MVP

**Goal**: Operators can search for traces by service name, operation, and time range, and see results in a list.

**Independent Test**: Select cluster → pick service → set time range → search → trace list appears with trace ID, service, operation, duration, timestamp.

### Implementation for User Story 1

- [x] T014 [US1] Create traceViewer.html page skeleton with cluster dropdown, time range presets (5m/15m/1h/6h/24h), service dropdown, operation dropdown, and search button in `views/front/page/xkube/traceViewer.html` (follow `logViewer.html` layout pattern)
- [x] T015 [US1] Implement service list loading: on cluster select, call `/xkube/trace/v1/Tags` to get available services, populate dropdown in `views/front/page/xkube/traceViewer.html`
- [x] T016 [US1] Implement trace search: call `/xkube/trace/v1/Search` with filters, render results as Layui table with columns (traceID, service, operation, duration, spanCount, startTime, status) in `views/front/page/xkube/traceViewer.html`
- [x] T017 [US1] Implement row click handler: navigate to waterfall view (Phase 4) when trace row is clicked in `views/front/page/xkube/traceViewer.html`

**Checkpoint**: Trace search works — can find and list traces by service/operation/time range

---

## Phase 4: User Story 2 — Waterfall Trace Visualization (Priority: P1)

**Goal**: Clicking a trace shows a waterfall view with spans as horizontal timing bars, nesting, and color coding.

**Independent Test**: Click any trace from search results → waterfall renders with span names, durations, nesting, error highlighting.

### Implementation for User Story 2

- [x] T018 [US2] Implement waterfall data processing: build span tree from flat span list (parent-child relationships), calculate nesting depths and time offsets in `views/front/page/xkube/traceViewer.html`
- [x] T019 [US2] Implement waterfall CSS rendering: horizontal bars with percentage-based positioning (left offset = relative start, width = duration ratio), service color-coding, error span red highlight in `views/front/page/xkube/traceViewer.html`
- [x] T020 [US2] Implement span hover tooltip: show span name, service, duration, status, key attributes on mouseover in `views/front/page/xkube/traceViewer.html`
- [x] T021 [US2] Implement span click detail panel: expandable panel showing full span attributes (tags), events/logs, with "查看日志" button in `views/front/page/xkube/traceViewer.html`
- [x] T022 [US2] Implement back button from waterfall to search results in `views/front/page/xkube/traceViewer.html`

**Checkpoint**: Full waterfall visualization — can drill into trace, see span timing, hover for details, click for attributes

---

## Phase 5: User Story 3 — Span ID Search (Priority: P2)

**Goal**: Operators can search by trace ID or span ID directly to jump to a specific trace.

**Independent Test**: Enter trace ID → waterfall opens. Enter span ID → parent trace found, span highlighted.

### Implementation for User Story 3

- [x] T023 [US3] Add "Trace ID / Span ID" search input field to search toolbar in `views/front/page/xkube/traceViewer.html`
- [x] T024 [US3] Implement trace ID lookup: if input is 32-char hex, call `/xkube/trace/v1/Trace?traceId=X` directly, open waterfall in `views/front/page/xkube/traceViewer.html`
- [x] T025 [US3] Implement span ID search: if input is 16-char hex, search traces then scan spans for matching spanID, open waterfall with that span highlighted/expanded in `views/front/page/xkube/traceViewer.html`
- [x] T026 [US3] Handle not-found case: show "未找到链路" message for invalid/non-existent IDs in `views/front/page/xkube/traceViewer.html`

**Checkpoint**: Direct ID lookup works — paste trace/span ID and jump to waterfall

---

## Phase 6: User Story 4 — Service Dependency Map (Priority: P3)

**Goal**: Operators can see a service dependency graph with clickable nodes.

**Independent Test**: Open dependency tab → services appear as nodes with directed edges. Click node → filter traces.

### Implementation for User Story 4

- [x] T027 [US4] Add "依赖图" tab/section to traceViewer.html in `views/front/page/xkube/traceViewer.html`
- [x] T028 [US4] Implement dependency graph data loading: call `/xkube/trace/v1/Dependencies` on tab select in `views/front/page/xkube/traceViewer.html`
- [x] T029 [US4] Implement SVG-based dependency graph rendering: nodes (service names), directed edges (lines with arrows), call count labels in `views/front/page/xkube/traceViewer.html`
- [x] T030 [US4] Implement node click handler: switch to search tab, set service filter to clicked service, run search in `views/front/page/xkube/traceViewer.html`

**Checkpoint**: Dependency map shows service graph, clicking node filters traces

---

## Phase 7: User Story 5 — Trace-to-Log Correlation (Priority: P3)

**Goal**: Operators can click from a span detail to view related logs in the log viewer.

**Independent Test**: Click "查看日志" on span detail → logViewer.html opens with service and time range pre-filtered.

### Implementation for User Story 5

- [x] T031 [US5] Implement "查看日志" button in span detail panel: construct URL to `logViewer.html` with clusterId, service name, start/end time parameters in `views/front/page/xkube/traceViewer.html`
- [x] T032 [US5] Open log viewer in new tab/window with pre-filled filters in `views/front/page/xkube/traceViewer.html`

**Checkpoint**: Click "查看日志" → log viewer opens with correct filters

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, edge cases, final verification

- [ ] T033 Add Tempo error handling: "Tempo未配置" message when tempo_url is empty, connection error messages, timeout handling in `views/front/page/xkube/traceViewer.html`
- [ ] T034 Add loading indicators for all API calls (search, waterfall, dependencies) in `views/front/page/xkube/traceViewer.html`
- [ ] T035 Implement empty state messages: "未找到链路" for no results, "请输入有效的ID" for invalid IDs in `views/front/page/xkube/traceViewer.html`
- [ ] T036 Final compilation check: `go build main.go` and verify all routes registered in `routers/router.go`
- [ ] T037 Run quickstart.md validation: execute all 6 test scenarios (T1-T6) from `specs/004-tempo-tracing/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T004-T005 for model updates) — BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1) and US2 (P1) are tightly coupled — US2 extends US1's UI
  - US3 (P2) extends US1/US2 search with ID lookup
  - US4 (P3) is independent — separate tab
  - US5 (P3) extends US2's span detail panel
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P1)**: Depends on US1 (T014-T016 for page skeleton and search)
- **US3 (P2)**: Depends on US1/US2 (extends search UI, uses waterfall)
- **US4 (P3)**: Can start after Phase 2 — independent tab, no US1/US2 dependency
- **US5 (P3)**: Depends on US2 (extends span detail panel)

### Parallel Opportunities

- T002 + T003 + T004 + T005 can run in parallel (different files in Phase 1)
- T006-T010 can run in parallel if split into separate model files (but all in same file, so sequential)
- T014-T016 are sequential (same file, building UI incrementally)
- US4 (dependency map) can be built in parallel with US1/US2/US3 (different tab/section)

---

## Parallel Example: Phase 1 Setup

```
# These 4 tasks touch different files — can run in parallel:
Task: "Add tempo_url field to clusterEdit.html (T002)"
Task: "Add menu entry to init.json (T003)"
Task: "Update GetList_Cluster select fields (T004)"
Task: "Update Update_Cluster params (T005)"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Complete Phase 1: Setup (DB + config)
2. Complete Phase 2: Foundational (model + controller + routes)
3. Complete Phase 3: US1 (trace search)
4. Complete Phase 4: US2 (waterfall)
5. **STOP and VALIDATE**: Search traces → click → waterfall works
6. Deploy as MVP

### Incremental Delivery

1. Setup + Foundational → Backend API ready (test with curl)
2. US1 + US2 → Search + Waterfall → Deploy (MVP!)
3. US3 → Span ID search → Deploy
4. US4 → Dependency map → Deploy
5. US5 → Log correlation → Deploy

---

## Notes

- All frontend work goes in a single file (`traceViewer.html`) — this matches the project pattern (each page is standalone HTML)
- Model file (`tempo_trace_model.go`) holds all Tempo HTTP API interaction
- Controller (`tempo_trace.go`) is a thin pass-through from model to HTTP response
- No external JS libraries — pure CSS + jQuery for waterfall and graph rendering
