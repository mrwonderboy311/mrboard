# Tasks: Rebrand xkube to mrboard

**Input**: Design documents from `/specs/003-rebrand-to-mrboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks grouped by user story. Each story is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: User Story 1 — Replace User-Facing Brand Text (Priority: P1) 🎯 MVP

**Goal**: All visible text shows "mrboard" instead of "xkube" — login page, dashboard title, sidebar logo

**Independent Test**: Open login page and dashboard — no "xkube" text visible, all replaced with "mrboard"

### Implementation for User Story 1

- [x] T001 [P] [US1] Replace "xkube后台登录" with "mrboard" in `views/front/login_code.html`
- [x] T002 [P] [US1] Replace "xkube后台登录" with "mrboard" in `views/front/login_telcode.html`
- [x] T003 [US1] Replace `<title>xkube-k8s集群管理平台</title>` with `<title>mrboard</title>` in `views/front/xkube_index.html`
- [x] T004 [US1] Add "mrboard" text to the sidebar logo div `.layuimini-logo` in `views/front/xkube_index.html`
- [x] T005 [US1] Verify no "xkube" remains in user-visible text across all HTML files (grep check)

**Checkpoint**: Login page, dashboard, and sidebar all show "mrboard"

---

## Phase 2: User Story 2 — Update Configuration Defaults (Priority: P2)

**Goal**: Application config uses "mrboard" as the product name

**Independent Test**: Open `conf/app.conf` — `appname`, `SignName`, and `domain` reference "mrboard"

### Implementation for User Story 2

- [x] T006 [P] [US2] Change `appname = xkube` to `appname = mrboard` in `conf/app.conf`
- [x] T007 [P] [US2] Change `SignName = "xkube助手"` to `SignName = "mrboard"` in `conf/app.conf`
- [x] T008 [US2] Change `domain` from `xkube-demo.eeenet.net` to `mrboard-demo.eeenet.net` in `conf/app.conf`

**Checkpoint**: Configuration file references "mrboard" for app name, sign name, and domain

---

## Phase 3: User Story 3 — Update Mobile/App Download Page (Priority: P3)

**Goal**: Download page shows "mrboard" as the product name

**Independent Test**: Open `page/appDown.html` — title and body text say "mrboard"

### Implementation for User Story 3

- [x] T009 [US3] Replace title and body text in `views/front/page/appDown.html` — change all "xkube" references to "mrboard"

**Checkpoint**: Download page fully references "mrboard"

---

## Phase 4: Polish & Verification

**Purpose**: Build verification and final check

- [x] T010 Run `go build main.go` and verify compilation succeeds
- [x] T011 Run quickstart.md verification checklist — confirm all items pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 1)**: No dependencies — can start immediately
- **US2 (Phase 2)**: No dependencies on US1 — can run in parallel
- **US3 (Phase 3)**: No dependencies on US1/US2 — can run in parallel
- **Polish (Phase 4)**: Depends on all user stories being complete

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T006 and T007 can run in parallel (different config lines)
- All three user stories can run in parallel since they touch different files

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: User Story 1 (login + dashboard branding)
2. **STOP and VALIDATE**: Open login page and dashboard, verify "mrboard" appears
3. Deploy if ready

### Incremental Delivery

1. US1 → login + dashboard branding → validate
2. US2 → config defaults → validate
3. US3 → download page → validate
4. Polish → build + full verification
