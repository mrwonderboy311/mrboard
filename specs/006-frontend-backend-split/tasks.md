# Tasks: Frontend-Backend Separation

**Input**: Design documents from `specs/006-frontend-backend-split/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks grouped by user story. US1 (frontend dev) and US2 (backend API) can work in parallel after Phase 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)

---

## Phase 1: Setup

**Purpose**: Initialize React frontend project with Vite + shadcn/ui + Tailwind CSS

- [x] T001 Initialize Vite React TypeScript project in `frontend/` via `npm create vite@latest frontend -- --template react-ts`
- [x] T002 Install dependencies: react-router-dom, sonner, lucide-react in `frontend/package.json`
- [x] T003 Initialize shadcn/ui in `frontend/` via `npx shadcn@latest init` with Tailwind CSS v4
- [x] T004 [P] Add shadcn/ui components: button, input, table, dialog, form, select, badge, tabs, card, dropdown-menu, separator, sheet, toast in `frontend/src/components/ui/`
- [x] T005 Configure Vite dev server proxy for API calls to `http://localhost:8080` in `frontend/vite.config.ts`
- [x] T006 Create TypeScript types for API responses (Cluster, Deployment, User, Pipeline, Article, ApiResponse) in `frontend/src/types/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure — MUST complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create API client with fetch wrapper, credentials:include, 401 redirect in `frontend/src/lib/api.ts`
- [x] T008 Create utility functions (formatDate, formatDuration, cn for className merging) in `frontend/src/lib/utils.ts`
- [x] T009 Create AuthContext with login/logout/sessionCheck in `frontend/src/hooks/useAuth.tsx`
- [x] T010 Create useApi hook for data fetching with loading/error states in `frontend/src/hooks/useApi.ts`
- [x] T011 Create AuthLayout (centered card for login) in `frontend/src/layouts/AuthLayout.tsx`
- [x] T012 Create MainLayout with dark gradient sidebar, header, content area in `frontend/src/layouts/MainLayout.tsx`
- [x] T013 Build sidebar navigation with all modules (cluster, deploy, rbac, cicd, wiki, search, app) in `frontend/src/layouts/MainLayout.tsx`
- [x] T014 Create App.tsx with React Router, lazy-loaded routes, auth guard in `frontend/src/App.tsx`
- [x] T015 Create login page component in `frontend/src/pages/login/LoginPage.tsx`
- [x] T016 Create main.tsx entry point with AuthProvider and Toaster in `frontend/src/main.tsx`
- [x] T017 Create index.html with proper meta tags and favicon in `frontend/index.html`

**Checkpoint**: Frontend skeleton ready — login works, sidebar renders, routing works

---

## Phase 3: User Story 1 — Independent Frontend Development (P1) 🎯 MVP

**Goal**: Frontend runs standalone with Vite dev server, hot-reload, and API proxy

**Independent Test**: Start `npm run dev` in `frontend/`, open browser, login, navigate pages — all work via API proxy to backend

### Implementation for User Story 1

- [ ] T018 [US1] Verify Vite dev server starts and serves React app at `http://localhost:5173`
- [ ] T019 [US1] Verify API proxy forwards requests to backend at `http://localhost:8080`
- [x] T020 [US1] Verify login flow works end-to-end (submit credentials → receive cookie → redirect to dashboard)
- [ ] T021 [US1] Verify session expiry shows toast and redirects to login
- [ ] T022 [US1] Verify hot-reload works — edit a component, see change in browser without backend restart
- [x] T023 [US1] Create a placeholder dashboard/home page in `frontend/src/pages/HomePage.tsx`

**Checkpoint**: Frontend dev server fully functional — developers can work on UI without Go backend

---

## Phase 4: User Story 2 — Pure REST API Backend (P2)

**Goal**: All Go controllers return JSON only, no HTML template rendering

**Independent Test**: Call any endpoint (e.g., `GET /cluster/list`) — returns JSON, not HTML

### Implementation for User Story 2

- [x] T024 [US2] Modify `controllers/cluster.go` — remove `this.TplName`, convert all methods to JSON response
- [x] T025 [US2] Modify `controllers/deploy.go` — remove template rendering, return JSON
- [x] T026 [US2] Modify `controllers/rbac.go` (or equivalent RBAC controller) — remove template rendering, return JSON
- [x] T027 [US2] Modify `controllers/cicd.go` — remove template rendering, return JSON
- [x] T028 [US2] Modify `controllers/wiki.go` — remove template rendering, return JSON
- [x] T029 [US2] Modify `controllers/search.go` — remove template rendering, return JSON
- [x] T030 [US2] Modify `controllers/appname.go` — remove template rendering, return JSON
- [x] T031 [US2] Modify `controllers/favorite.go` — remove template rendering, return JSON
- [x] T032 [US2] Modify `controllers/event.go` — remove template rendering, return JSON
- [x] T033 [US2] Modify remaining controllers (gateway, cronjob, daemonset, configmap, backup, clone, cdr, apply_yaml, aiChat, appDown) — remove template rendering
- [x] T034 [US2] Verify all endpoints return JSON by testing with curl: `curl -b cookie.txt http://localhost:8080/cluster/list`
- [x] T035 [US2] Verify `go build main.go` compiles successfully after all controller changes

**Checkpoint**: Backend is pure API — no template rendering, all endpoints return JSON

---

## Phase 5: User Story 4 — Rewrite Cluster Module (P4 - first batch)

**Goal**: Rewrite cluster management pages as React components

**Independent Test**: Navigate to cluster list, add, edit, delete — all CRUD works

### Implementation for Cluster Module

- [x] T036 [P] [US4] Create ClusterList page with table (name, type, status, actions) in `frontend/src/pages/cluster/ClusterList.tsx`
- [x] T037 [P] [US4] Create ClusterAdd form page in `frontend/src/pages/cluster/ClusterAdd.tsx`
- [x] T038 [P] [US4] Create ClusterEdit form page in `frontend/src/pages/cluster/ClusterEdit.tsx`
- [x] T039 [US4] Add cluster routes to App.tsx: `/cluster/list`, `/cluster/add`, `/cluster/edit/:id`

**Checkpoint**: Cluster module fully functional in React

---

## Phase 6: User Story 4 — Rewrite Deploy Module (P4 - second batch)

**Goal**: Rewrite deployment management pages as React components

**Independent Test**: Navigate to deploy list, view detail, scale, restart — all operations work

### Implementation for Deploy Module

- [x] T040 [P] [US4] Create DeployList page with table (name, namespace, replicas, images, status) in `frontend/src/pages/deploy/DeployList.tsx`
- [x] T041 [P] [US4] Create DeployDetail page with pod list, events, YAML view in `frontend/src/pages/deploy/DeployDetail.tsx`
- [x] T042 [US4] Add deploy routes to App.tsx: `/deploy/list`, `/deploy/detail/:namespace/:name`

**Checkpoint**: Deploy module fully functional

---

## Phase 7: User Story 4 — Rewrite RBAC Module (P4 - third batch)

**Goal**: Rewrite RBAC management pages as React components

**Independent Test**: Admin list, role list, role-to-user assignment — all work

### Implementation for RBAC Module

- [x] T043 [P] [US4] Create AdminList page in `frontend/src/pages/rbac/AdminList.tsx`
- [x] T044 [P] [US4] Create AdminEdit form page in `frontend/src/pages/rbac/AdminEdit.tsx`
- [x] T045 [P] [US4] Create RoleList page in `frontend/src/pages/rbac/RoleList.tsx`
- [x] T046 [P] [US4] Create RoleToUserList page in `frontend/src/pages/rbac/RoleToUserList.tsx`
- [x] T047 [P] [US4] Create RoleToNodeList page in `frontend/src/pages/rbac/RoleToNodeList.tsx`
- [x] T048 [P] [US4] Create ClusterToUserList page in `frontend/src/pages/rbac/ClusterToUserList.tsx`
- [x] T049 [P] [US4] Create GroupList page in `frontend/src/pages/rbac/GroupList.tsx`
- [x] T050 [P] [US4] Create NodeList page in `frontend/src/pages/rbac/NodeList.tsx`
- [x] T051 [P] [US4] Create AuditLogList page in `frontend/src/pages/rbac/AuditLogList.tsx`
- [x] T052 [P] [US4] Create LockList page in `frontend/src/pages/rbac/LockList.tsx`
- [x] T053 [P] [US4] Create MyInfo page in `frontend/src/pages/rbac/MyInfo.tsx`
- [x] T054 [P] [US4] Create ChangePassword page in `frontend/src/pages/rbac/ChangePassword.tsx`
- [x] T055 [US4] Add RBAC routes to App.tsx

**Checkpoint**: RBAC module fully functional

---

## Phase 8: User Story 4 — Rewrite CI/CD Module (P4 - fourth batch)

**Goal**: Rewrite CI/CD pages as React components

**Independent Test**: Pipeline list, detail, logs, Jenkins integration — all work

### Implementation for CI/CD Module

- [x] T056 [P] [US4] Create CICDList page in `frontend/src/pages/cicd/CICDList.tsx`
- [x] T057 [P] [US4] Create PipelinesIndex page in `frontend/src/pages/cicd/PipelinesIndex.tsx`
- [x] T058 [P] [US4] Create PipelinesAdd form page in `frontend/src/pages/cicd/PipelinesAdd.tsx`
- [x] T059 [P] [US4] Create PipelinesEdit form page in `frontend/src/pages/cicd/PipelinesEdit.tsx`
- [x] T060 [P] [US4] Create PipelinesDetail page in `frontend/src/pages/cicd/PipelinesDetail.tsx`
- [x] T061 [P] [US4] Create PipelinesLog page in `frontend/src/pages/cicd/PipelinesLog.tsx`
- [x] T062 [P] [US4] Create JenkinsList page in `frontend/src/pages/cicd/JenkinsList.tsx`
- [x] T063 [P] [US4] Create JenkinsJobDetail page in `frontend/src/pages/cicd/JenkinsJobDetail.tsx`
- [x] T064 [P] [US4] Create JenkinsLog page in `frontend/src/pages/cicd/JenkinsLog.tsx`
- [x] T065 [P] [US4] Create AliyunAKList page in `frontend/src/pages/cicd/AliyunAKList.tsx`
- [x] T066 [US4] Add CI/CD routes to App.tsx

**Checkpoint**: CI/CD module fully functional

---

## Phase 9: User Story 4 — Rewrite Wiki Module (P4 - fifth batch)

**Goal**: Rewrite wiki pages as React components

**Independent Test**: Article list, detail, add, edit, column management — all work

### Implementation for Wiki Module

- [x] T067 [P] [US4] Create WikiList page in `frontend/src/pages/wiki/WikiList.tsx`
- [x] T068 [P] [US4] Create WikiDetail page with markdown rendering in `frontend/src/pages/wiki/WikiDetail.tsx`
- [x] T069 [P] [US4] Create WikiAdd page with markdown editor in `frontend/src/pages/wiki/WikiAdd.tsx`
- [x] T070 [P] [US4] Create WikiEdit page with markdown editor in `frontend/src/pages/wiki/WikiEdit.tsx`
- [x] T071 [P] [US4] Create ColumnList page in `frontend/src/pages/wiki/ColumnList.tsx`
- [x] T072 [US4] Add wiki routes to App.tsx

**Checkpoint**: Wiki module fully functional

---

## Phase 10: User Story 4 — Rewrite Remaining Modules (P4 - sixth batch)

**Goal**: Rewrite search, favorites, app management, and other pages

**Independent Test**: All remaining pages load and function correctly

### Implementation for Remaining Modules

- [x] T073 [P] [US4] Create SearchPage in `frontend/src/pages/search/SearchPage.tsx`
- [x] T074 [P] [US4] Create FavoriteList page in `frontend/src/pages/favorite/FavoriteList.tsx`
- [x] T075 [P] [US4] Create AppNameList page in `frontend/src/pages/app/AppNameList.tsx`
- [x] T076 [P] [US4] Create AppNameAdd page in `frontend/src/pages/app/AppNameAdd.tsx`
- [x] T077 [P] [US4] Create AppNameEdit page in `frontend/src/pages/app/AppNameEdit.tsx`
- [x] T078 [P] [US4] Create AppDown page in `frontend/src/pages/app/AppDown.tsx`
- [x] T079 [P] [US4] Create AIChat page in `frontend/src/pages/ai/AIChat.tsx`
- [x] T080 [P] [US4] Create ApplyYAML page in `frontend/src/pages/tools/ApplyYAML.tsx`
- [x] T081 [P] [US4] Create CloneResource page in `frontend/src/pages/tools/CloneResource.tsx`
- [x] T082 [US4] Add remaining routes to App.tsx

**Checkpoint**: All 355 pages rewritten as React components

---

## Phase 11: User Story 3 — Production Build & Deploy (P3)

**Goal**: Frontend and backend deploy independently via Nginx + K8s

**Independent Test**: Build frontend (`npm run build`), deploy to Nginx, verify all pages work against production backend

### Implementation for Deployment

- [x] T083 [US3] Create Nginx config with same-origin proxy (`/` → static, other paths → backend, `/ws/` → WebSocket) in `deploy/nginx.conf`
- [x] T084 [US3] Create frontend Dockerfile (multi-stage: node build + nginx serve) in `frontend/Dockerfile`
- [x] T085 [US3] Create frontend K8s deployment YAML (nginx + static files) in `deploy/k8s-frontend.yaml`
- [x] T086 [US3] Update existing backend K8s YAML — remove views/static volume mounts in `deploy/k8s.yaml`
- [x] T087 [US3] Update backend Dockerfile — remove `COPY views` step in `Dockerfile`

**Checkpoint**: Frontend and backend deploy independently

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and final validation

- [ ] T088 Remove old CSS files: `views/front/css/default.css`, `material-theme.css`, `modern-theme.css`, `app-theme.css`
- [ ] T089 Remove old JS files: `views/front/js/xkube.js`, jQuery, Layui-specific scripts
- [ ] T090 Remove `views/front/` directory (all old HTML templates)
- [x] T091 Verify `go build main.go` still compiles without views directory
- [x] T092 Verify frontend production build (`npm run build`) produces bundle under 10MB
- [ ] T093 Run quickstart.md validation — verify dev and production workflows

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 - Frontend Dev)**: Depends on Phase 2 — MVP milestone
- **Phase 4 (US2 - Backend API)**: Depends on Phase 2 — can run parallel with US1
- **Phases 5-10 (US4 - Page Rewrites)**: Depend on Phase 2 — can run parallel with US2
- **Phase 11 (US3 - Deploy)**: Depends on US1 + US2 + at least one module rewrite (Phase 5)
- **Phase 12 (Polish)**: Depends on all previous phases

### Parallel Opportunities

```
Phase 1 → Phase 2 → ┬─ US1 (Phase 3)    ─┐
                     ├─ US2 (Phase 4)    ─┤
                     ├─ US4 cluster (Phase 5) ─┤
                     ├─ US4 deploy (Phase 6)  ─┤─ US3 (Phase 11) → Polish
                     ├─ US4 rbac (Phase 7)    ─┤
                     ├─ US4 cicd (Phase 8)    ─┤
                     ├─ US4 wiki (Phase 9)    ─┤
                     └─ US4 other (Phase 10)  ─┘
```

- US1 and US2 can run in parallel after Phase 2
- All US4 module rewrites (Phases 5-10) can run in parallel with each other
- US3 (deploy) needs US1 + US2 complete

---

## Implementation Strategy

### MVP First (User Story 1 + minimal US4)

1. Complete Phase 1 + Phase 2 → Foundation ready
2. Complete Phase 3 (US1) → Frontend dev server works
3. Complete Phase 4 (US2) → Backend returns JSON
4. Complete Phase 5 (Cluster module) → First module fully migrated
5. **STOP and VALIDATE**: Login, navigate to cluster list, CRUD operations work
6. This is the MVP — one complete module end-to-end

### Incremental Delivery

1. MVP (login + cluster) → validate
2. Add deploy module → validate
3. Add RBAC module → validate
4. Add CI/CD module → validate
5. Add wiki + remaining → validate
6. Production deployment → validate
7. Cleanup old code → done

### Batch Migration Strategy (per user request)

All 355 pages ship as one release, but development proceeds module-by-module:
- Each module is a complete vertical slice (frontend page + backend JSON)
- Verify each module before moving to the next
- Final cutover replaces the entire monolithic frontend at once

---

## Notes

- No automated tests (project has zero test coverage — manual testing via browser)
- WebSocket endpoints (terminal, exec, log) need special attention in Nginx config
- shadcn/ui components are copy-paste, not npm dependencies — they live in `frontend/src/components/ui/`
- Backend controller changes are mechanical: remove `this.TplName` + `this.Data[...]`, add `this.Data["json"] = result`
- 355 pages count includes all HTML files; actual distinct page components will be fewer (some are variations)
