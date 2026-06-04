# Tasks: Loki Log Viewer

**Input**: Design documents from `/specs/001-loki-log-viewer/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and RBAC menu entry

- [x] T001 Add `loki_url` VARCHAR(255) DEFAULT '' column to `xkb_cluster` table via SQL migration: `ALTER TABLE xkb_cluster ADD COLUMN loki_url VARCHAR(255) DEFAULT '';`
- [x] T002 Add `LokiUrl` field to `Xkb_cluster` struct in `models/cluster_model.go`
- [x] T003 Add RBAC menu node for "日志查看" (Level=1, top-level sidebar entry) — insert Node record with Title="日志查看", Name="/page/xkube/logViewer.html", Icons="layui-icon-log", Status=1 in the RBAC node table

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create `models/loki_log_model.go` — Loki HTTP client with base functions: `GetLokiUrl(clusterId)` to fetch loki_url from cluster config, `lokiHttpGet(url)` helper with timeout and error handling
- [x] T005 [P] Create `controllers/loki_log.go` — LokiLogController struct extending `beego.Controller` with base response helpers (JSON success/error pattern matching existing controllers)
- [x] T006 [P] Register all Loki log routes in `routers/router.go` — add route block for `/xkube/log/v1/Labels`, `/xkube/log/v1/LabelValues`, `/xkube/log/v1/Query`, `/xkube/log/v1/Histogram`, `/xkube/log/v1/Levels`, `/xkube/log/v1/Tail` pointing to `LokiLogController`

**Checkpoint**: Foundation ready — model, controller skeleton, and routes registered. User story implementation can now begin.

---

## Phase 3: User Story 1 — Browse and Filter Logs by Service (Priority: P1) MVP

**Goal**: View logs from all services in a namespace, filter by service label, see volume histogram

**Independent Test**: Select cluster + namespace, verify histogram renders and service filter chips appear. Click a service chip → verify logs filter to that service.

### Implementation for User Story 1

- [x] T007 [US1] Implement `QueryLabels()` in `models/loki_log_model.go` — call Loki `/loki/api/v1/labels` with `start`, `end`, `query={namespace="ns"}` params, parse response into `[]string`
- [x] T008 [US1] Implement `QueryLabelValues()` in `models/loki_log_model.go` — call Loki `/loki/api/v1/label/{name}/values` with namespace scope, parse response into `[]string`
- [x] T009 [US1] Implement `QueryLogs()` in `models/loki_log_model.go` — call Loki `/loki/api/v1/query_range` with LogQL query built from namespace + optional service filter, parse response into `[]LogEntry` struct (timestamp, level, namespace, pod, container, app, message)
- [x] T010 [US1] Implement `detectLogLevel()` in `models/loki_log_model.go` — check Loki structured metadata `level` label first, fallback to regex `\b(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\b` on log line, default to "unknown"
- [x] T011 [US1] Implement `Labels()` action in `controllers/loki_log.go` — parse `clusterId`, `namespace`, `start`, `end` query params, call model, return JSON response `{code:0, data:["app","container","pod",...]}`
- [x] T012 [US1] Implement `LabelValues()` action in `controllers/loki_log.go` — parse `clusterId`, `namespace`, `label`, `start`, `end` query params, call model, return JSON response
- [x] T013 [US1] Implement `Query()` action in `controllers/loki_log.go` — parse all query params (clusterId, namespace, services, levels, search, start, end, limit, direction), build LogQL, call model, return JSON response with `entries` array and `total` count
- [x] T014 [US1] Implement `Histogram()` action in `controllers/loki_log.go` — parse query params, build `count_over_time()` LogQL with auto-calculated step, call model, return JSON with `buckets` and `levelBuckets` arrays
- [x] T015 [US1] Implement `GetHistogram()` in `models/loki_log_model.go` — call Loki `/loki/api/v1/query_range` with `count_over_time({namespace="ns"}[step])` query, parse matrix result into histogram buckets
- [x] T016 [US1] Create `views/front/page/xkube/logViewer.html` — main log viewer page with: cluster dropdown, namespace dropdown, time range presets (5m/15m/1h/6h/24h/7d), histogram chart area (ECharts), service filter chips area, log entries table area. Use Layui layout with `<<<` `>>>` template delimiters.
- [x] T017 [US1] Implement log viewer JavaScript in `views/front/page/xkube/logViewer.html` — ECharts bar chart for histogram, AJAX calls to `/xkube/log/v1/Histogram` and `/xkube/log/v1/Query`, render log entries in table with timestamp/level/service/pod/message columns, color-coded log levels (red=error, orange=warn, blue=info, gray=debug)
- [x] T018 [US1] Implement service filter chip rendering in `views/front/page/xkube/logViewer.html` — fetch labels from `/xkube/log/v1/LabelValues?label=app`, render as clickable Layui badges/chips, toggle filter on click, re-fetch logs and histogram on filter change

**Checkpoint**: User Story 1 fully functional — can browse logs, see histogram, filter by service. MVP complete.

---

## Phase 4: User Story 2 — Search and Highlight Log Content (Priority: P1)

**Goal**: Search for specific text within logs with match highlighting

**Independent Test**: Type a search term, verify matching log lines are highlighted and non-matching lines are dimmed.

### Implementation for User Story 2

- [x] T019 [US2] Add `search` parameter support to `QueryLogs()` in `models/loki_log_model.go` — append `|= "search-term"` to LogQL query when search param is non-empty
- [x] T020 [US2] Add search box UI in `views/front/page/xkube/logViewer.html` — Layui input field above log table with debounced input handler (300ms), triggers re-fetch of logs with `search` param
- [x] T021 [US2] Implement text highlighting in `views/front/page/xkube/logViewer.html` — wrap matching text in `<mark>` tags with yellow background in log message column, add CSS for `.log-highlight` class

**Checkpoint**: User Story 2 functional — can search logs and see highlighted matches.

---

## Phase 5: User Story 3 — Filter by Log Level (Priority: P2)

**Goal**: Filter logs by severity level with color-coded level indicators

**Independent Test**: Select "error" level filter, verify only error-level logs appear and histogram updates.

### Implementation for User Story 3

- [x] T022 [US2] Implement `Levels()` action in `controllers/loki_log.go` — parse query params, call Loki with level-specific LogQL queries or post-process results, return JSON with level counts `{error:N, warn:N, info:N, debug:N, unknown:N}`
- [x] T023 [US3] Add `levels` parameter support to `QueryLogs()` in `models/loki_log_model.go` — when levels specified, filter results post-query or build level-specific LogQL (structured metadata `level="error"` or regex fallback)
- [x] T024 [US3] Add level filter buttons in `views/front/page/xkube/logViewer.html` — Layui button group with error/warn/info/debug/all toggle buttons, color-coded (red/orange/blue/gray), click to toggle, re-fetch logs on change
- [x] T025 [US3] Implement stacked histogram in `views/front/page/xkube/logViewer.html` — update ECharts config to show stacked bars per level using `levelBuckets` data from Histogram API, color-coded by level

**Checkpoint**: User Stories 1+2+3 all functional — can filter by service and level, search text, see color-coded histogram.

---

## Phase 6: User Story 4 — Time Range Selection (Priority: P2)

**Goal**: Select time range for log queries with presets and custom range

**Independent Test**: Change time range to "Last 1 hour", verify histogram and log list update.

### Implementation for User Story 4

- [x] T026 [US4] Implement step auto-calculation in `models/loki_log_model.go` — function `calcStep(start, end)` returning appropriate step: 5m→5s, 15m→15s, 1h→30s, 6h→2m, 24h→5m, 7d→30m
- [x] T027 [US4] Implement time range preset buttons in `views/front/page/xkube/logViewer.html` — Layui button group with 5m/15m/1h/6h/24h/7d presets, active state highlighting, click updates start/end timestamps and re-fetches all data
- [x] T028 [US4] Implement custom time range picker in `views/front/page/xkube/logViewer.html` — use Layui `laydate` component for start/end datetime pickers, validate end > start, apply button triggers data refresh

**Checkpoint**: User Stories 1-4 all functional — full time range control.

---

## Phase 7: User Story 5 — Live Tail (Priority: P3)

**Goal**: Real-time log streaming with pause/resume

**Independent Test**: Enable live tail, generate new logs, verify they appear at top of list automatically.

### Implementation for User Story 5

- [x] T029 [US5] Implement `Tail()` WebSocket handler in `controllers/loki_log.go` — upgrade HTTP to WebSocket using `beego.WebSocket`, connect to Loki `/loki/api/v1/tail` WebSocket with LogQL query, proxy messages bidirectionally
- [x] T030 [US5] Implement live tail UI in `views/front/page/xkube/logViewer.html` — "实时"/"暂停" toggle button, WebSocket connection to `/xkube/log/v1/Tail`, prepend new entries to log table on message, auto-scroll to top, show connection status indicator (green=connected, red=disconnected)
- [x] T031 [US5] Add pause/resume logic in `views/front/page/xkube/logViewer.html` — pause closes WebSocket, resume reconnects, buffer new entries while paused and show count badge

**Checkpoint**: All 5 user stories functional — complete log viewer with live tail.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T032 Update cluster edit form `views/front/page/xkube/clusterEdit.html` — add optional "Loki URL" input field (`loki_url`), save via existing cluster update API
- [x] T033 Update cluster model `models/cluster_model.go` — add `loki_url` to `Xkb_cluster` struct, update Add/Edit/Update functions to handle the new field
- [x] T034 Add "日志查看" navigation entry in sidebar menu — update `views/front/xkube_index.html` or insert RBAC Node record to include top-level menu item with link to `/page/xkube/logViewer.html`
- [x] T035 Implement empty state handling in `views/front/page/xkube/logViewer.html` — when no cluster selected show "请选择集群" message, when Loki not configured show "该集群未配置 Loki" with link to cluster edit page, when no logs found show "未找到日志" with filter adjustment guidance
- [x] T036 Implement error handling in `controllers/loki_log.go` — catch Loki connection errors, return `{code:-1, msg:"Loki unreachable: ..."}` with appropriate HTTP status codes, handle timeout (30s default)
- [x] T037 Add pagination/infinite scroll in `views/front/page/xkube/logViewer.html` — "加载更多" button at bottom of log list, use last entry timestamp as cursor for next request, show loading spinner during fetch
- [x] T038 Run quickstart.md validation — follow all verification steps in `specs/001-loki-log-viewer/quickstart.md` to confirm feature works end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (T002 for LokiUrl field) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion — core MVP
- **US2 (Phase 4)**: Depends on Phase 2 + T009 (QueryLogs model) — can parallel with US1 frontend work
- **US3 (Phase 5)**: Depends on Phase 2 + T009/T010 (QueryLogs + level detection) — can parallel with US1/US2
- **US4 (Phase 6)**: Depends on Phase 2 + T014 (Histogram) — can parallel with US1/US2/US3
- **US5 (Phase 7)**: Depends on Phase 2 + T009 (QueryLogs) — can parallel with other stories
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories. This is the MVP.
- **US2 (P1)**: Can start after Phase 2 + T009 — builds on QueryLogs model
- **US3 (P2)**: Can start after Phase 2 + T009/T010 — builds on QueryLogs + level detection
- **US4 (P2)**: Can start after Phase 2 — time range affects histogram and queries
- **US5 (P3)**: Can start after Phase 2 — independent WebSocket implementation

### Within Each User Story

- Models before controllers
- Controllers before frontend
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T005 (controller) and T006 (routes) can run in parallel (different files)
- T007/T008 (labels model) and T009/T010 (query model) can partially parallel
- T011-T014 (controller actions) can parallel after models are done
- US2/US3/US4/US5 can all be worked on in parallel after Phase 2 + T009

---

## Parallel Example: User Story 1

```bash
# Launch model functions in parallel (different functions, same file — sequential safer):
Task: "Implement QueryLabels() in models/loki_log_model.go"
Task: "Implement QueryLabelValues() in models/loki_log_model.go"
Task: "Implement QueryLogs() in models/loki_log_model.go"
Task: "Implement detectLogLevel() in models/loki_log_model.go"

# Launch controller actions after models:
Task: "Implement Labels() in controllers/loki_log.go"
Task: "Implement LabelValues() in controllers/loki_log.go"
Task: "Implement Query() in controllers/loki_log.go"
Task: "Implement Histogram() in controllers/loki_log.go"

# Launch frontend after controller:
Task: "Create logViewer.html with histogram, chips, log table"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (DB migration + RBAC menu)
2. Complete Phase 2: Foundational (Loki model + controller + routes)
3. Complete Phase 3: User Story 1 (labels, query, histogram, frontend)
4. **STOP and VALIDATE**: Select cluster with Loki configured → verify histogram + service chips + log list
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (MVP!)
3. Add US2 (search) → Test independently → Deploy/Demo
4. Add US3 (log levels) → Test independently → Deploy/Demo
5. Add US4 (time range) → Test independently → Deploy/Demo
6. Add US5 (live tail) → Test independently → Deploy/Demo
7. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Template delimiters: `<<<` and `>>>` (NOT `{{` `}}`)
- Frontend uses Layui v2 + jQuery + ECharts — no SPA frameworks
- No auth to Loki (internal network) — no credential handling needed
- Existing Pod 日志 (`podLog.html`) is retained — Loki is a separate module
