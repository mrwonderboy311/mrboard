# Tasks: UI Modernization with HTMX + Tailwind CSS

**Input**: Design documents from `/specs/005-ui-htmx-tailwind/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)

---

## Phase 1: Setup (Foundation)

**Purpose**: CDN resources, design system stylesheet, main layout integration

- [x] T001 Create `views/front/css/modern-theme.css` with Tailwind CSS layer overrides for Layui form elements, buttons, tables, and layout components — color palette, spacing, typography, border-radius, shadows
- [x] T002 Update `views/front/xkube_index.html` to load Tailwind CSS CDN (`https://cdn.tailwindcss.com`), HTMX CDN (`https://unpkg.com/htmx.org@2.0.4`), and `modern-theme.css`
- [x] T003 Add Tailwind config script block in `views/front/xkube_index.html` to extend theme with project-specific design tokens (colors, fonts, spacing)

**Checkpoint**: Design system loaded on main layout — all iframe pages inherit Tailwind + HTMX

---

## Phase 2: Foundational (Design System CSS)

**Purpose**: Build the complete CSS override layer that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Style all form input types in `views/front/css/modern-theme.css` — override `.layui-input`, `.layui-textarea`, `.layui-select` with rounded corners, padding, focus ring, consistent height, modern borders
- [x] T005 Style all button types in `views/front/css/modern-theme.css` — override `.layui-btn` (primary), `.layui-btn-primary` (secondary), `.layui-btn-danger`, `.layui-btn-disabled` with modern backgrounds, rounded corners, hover/active/focus states
- [x] T006 Style data tables in `views/front/css/modern-theme.css` — override `.layui-table` with modern borders, alternating row backgrounds (`tbody tr:nth-child(even)`), header styling, cell padding, action button alignment
- [x] T007 Style form labels and layout in `views/front/css/modern-theme.css` — override `.layui-form-label`, `.layui-form-item`, `.layui-input-inline` with modern font weight, color, spacing
- [x] T008 Style modals/popups in `views/front/css/modern-theme.css` — override `.layui-layer` with rounded corners, shadow, overlay opacity, close button
- [x] T009 Style sidebar and header layout in `views/front/css/modern-theme.css` — override `.layui-side`, `.layui-header`, `.layui-body` with modern background, shadow, transitions, section grouping
- [x] T010 Style checkboxes and radio buttons in `views/front/css/modern-theme.css` — override `.layui-form-checkbox`, `.layui-form-radio` with modern check/radio indicators
- [x] T011 Style pagination and toolbar in `views/front/css/modern-theme.css` — override `.layui-laypage`, `.layui-toolbar` with modern spacing and borders

**Checkpoint**: Design system complete — all Layui components have modern visual treatment

---

## Phase 3: User Story 1 — Modern Form Styling (Priority: P1) 🎯 MVP

**Goal**: All forms across all modules display consistent modern styling

**Independent Test**: Visit admin edit page (`/page/rbac/adminEdit.html`) and verify form inputs have rounded corners, proper padding, focus ring, and consistent height

### Implementation for User Story 1

- [x] T012 [P] [US1] Apply modern form classes to all RBAC module forms — `views/front/page/rbac/adminEdit.html`, `adminList.html` (add modal), `myinfo.html`, `changepassword.html`
- [x] T013 [P] [US1] Apply modern form classes to all CI/CD module forms — `views/front/page/cicd/pipelines_add.html`, `pipelines_edit.html`, `aliyun_ak_list.html`
- [x] T014 [P] [US1] Apply modern form classes to all xkube module forms — `views/front/page/xkube/clusterAdd.html`, `clusterEdit.html`, `apply_yaml.html`, `clone_resource.html`, `hpaCreate.html`, `appnameAdd.html`, `appnameEdit.html`
- [x] T015 [P] [US1] Apply modern form classes to wiki module forms — `views/front/page/wiki/add.html`, `edit.html`
- [x] T016 [P] [US1] Apply modern form classes to remaining module forms — search page, AI chat input, app download page
- [x] T017 [US1] Verify Layui form components still function — `form.on('submit')`, `form.val()`, form validation (`lay-verify`) across all updated pages

**Checkpoint**: All forms across all modules display consistent modern styling with zero functional regressions

---

## Phase 4: User Story 2 — Modern Button Styling (Priority: P1)

**Goal**: All buttons across all modules display consistent modern styling with distinct variants

**Independent Test**: Visit any list page and verify primary, secondary, and danger buttons have distinct modern styles with hover/active states

### Implementation for User Story 2

- [x] T018 [P] [US2] Apply modern button classes to all RBAC module buttons — list page action buttons, form submit buttons, toolbar buttons across `views/front/page/rbac/*.html`
- [x] T019 [P] [US2] Apply modern button classes to all CI/CD module buttons — pipeline action buttons, Jenkins buttons, form submits across `views/front/page/cicd/*.html`
- [x] T020 [P] [US2] Apply modern button classes to all xkube module buttons — resource action buttons, deploy buttons, terminal buttons across `views/front/page/xkube/*.html`
- [x] T021 [P] [US2] Apply modern button classes to wiki and remaining module buttons — `views/front/page/wiki/*.html`, search, AI chat
- [x] T022 [US2] Verify button interactions still work — click handlers, disabled states, loading states, confirm dialogs (`layer.confirm`) across all updated pages

**Checkpoint**: All buttons across all modules display consistent modern styling with zero functional regressions

---

## Phase 5: User Story 3 — Table and List Modernization (Priority: P2)

**Goal**: All data tables have clean borders, alternating rows, proper header styling, and readable spacing

**Independent Test**: Visit admin list page and verify table headers are distinct from data rows, alternating row backgrounds, and action buttons are aligned

### Implementation for User Story 3

- [x] T023 [P] [US3] Apply modern table classes to all RBAC list pages — `views/front/page/rbac/adminList.html`, `roleList.html`, `groupList.html`, `nodeList.html`, `clusterToUserList.html`, `roleToUserList.html`, `roleToNodeList.html`, `auditLogList.html`, `lockList.html`, `myClusterList.html`
- [x] T024 [P] [US3] Apply modern table classes to all CI/CD list pages — `views/front/page/cicd/cicdList.html`, `jenkins_list.html`, `pipelines_index.html`, `aliyun_ak_list.html`
- [x] T025 [P] [US3] Apply modern table classes to all xkube list pages — `views/front/page/xkube/configmapList.html`, `clusterRoleBindingList.html`, `roleBindingList.html`, `cdrList.html`, `appnameList.html`, `clusterList.html`
- [x] T026 [US3] Verify Layui table component still functions — `table.render()`, sorting, pagination, toolbar events across all updated list pages

**Checkpoint**: All tables display modern styling with zero functional regressions

---

## Phase 6: User Story 4 — Layout and Navigation Polish (Priority: P2)

**Goal**: Sidebar, header, and content area feel modern with proper spacing, shadows, and transitions

**Independent Test**: Navigate between different modules and verify sidebar has modern styling, header is polished, and content area has appropriate padding

### Implementation for User Story 4

- [x] T027 [US4] Update main layout `views/front/xkube_index.html` — modernize sidebar navigation with section grouping, hover states, active indicators, smooth collapse/expand transitions
- [x] T028 [US4] Update header bar in `views/front/xkube_index.html` — modernize search input, APP button, refresh/clear/fullscreen icons, user menu
- [x] T029 [US4] Update content area in `views/front/xkube_index.html` — appropriate padding, max-width, smooth page transition, breadcrumb styling
- [x] T030 [US4] Verify responsive behavior — sidebar collapses on mobile, header adapts, content reflows on narrow viewports

**Checkpoint**: Layout chrome looks modern and cohesive across all modules

---

## Phase 7: User Story 5 — Login Page Modernization (Priority: P3)

**Goal**: Login pages present a modern, professional first impression

**Independent Test**: Visit login page and verify clean input fields, modern button, and professional appearance

### Implementation for User Story 5

- [x] T031 [US5] Modernize `views/front/login_code.html` — apply modern form styling, center layout, clean background, professional typography, loading state on submit button
- [x] T032 [US5] Modernize `views/front/login_telcode.html` — apply same modern styling as login_code.html for consistency
- [x] T033 [US5] Verify login flow still works — form submission, error display, redirect after login

**Checkpoint**: Login pages look modern and professional

---

## Phase 8: HTMX Migration — RBAC Module (Priority: P1)

**Goal**: Replace all jQuery AJAX calls in RBAC module with HTMX attributes

**Independent Test**: Create/edit/delete admin users, manage roles, assign permissions — all operations work via HTMX

### Implementation for HTMX Migration — RBAC

- [x] T034 [P] Migrate jQuery AJAX to HTMX in `views/front/page/rbac/adminList.html` — replace `$.ajax`/`$.post` table data loading and CRUD operations with `hx-get`/`hx-post`/`hx-swap`/`hx-target`
- [x] T035 [P] Migrate jQuery AJAX to HTMX in `views/front/page/rbac/adminEdit.html` — replace form submission AJAX with `hx-post` on form element
- [x] T036 [P] Migrate jQuery AJAX to HTMX in `views/front/page/rbac/roleList.html` — replace AJAX calls with HTMX attributes
- [x] T037 [P] Migrate jQuery AJAX to HTMX in `views/front/page/rbac/groupList.html` — replace AJAX calls with HTMX attributes
- [x] T038 [P] Migrate jQuery AJAX to HTMX in `views/front/page/rbac/nodeList.html` — replace AJAX calls with HTMX attributes
- [x] T039 [P] Migrate jQuery AJAX to HTMX in remaining RBAC pages — `clusterToUserList.html`, `roleToUserList.html`, `roleToNodeList.html`, `auditLogList.html`, `lockList.html`, `myClusterList.html`, `myinfo.html`, `changepassword.html`, `nodeListByGroupId.html`, `accesstonode.html`
- [x] T040 Verify all RBAC operations work — CRUD for admins, roles, groups, nodes, permission assignments, audit logs

**Checkpoint**: RBAC module fully migrated to HTMX, zero functional regressions

---

## Phase 9: HTMX Migration — CI/CD Module (Priority: P1)

**Goal**: Replace all jQuery AJAX calls in CI/CD module with HTMX attributes

**Independent Test**: View pipeline list, create/edit pipelines, view Jenkins jobs and logs — all operations work via HTMX

### Implementation for HTMX Migration — CI/CD

- [x] T041 [P] Migrate jQuery AJAX to HTMX in `views/front/page/cicd/cicdList.html` — replace AJAX calls with HTMX attributes
- [x] T042 [P] Migrate jQuery AJAX to HTMX in `views/front/page/cicd/pipelines_index.html`, `pipelines_add.html`, `pipelines_edit.html`, `pipelines_detail.html`, `pipelines_log.html` — replace AJAX calls with HTMX attributes
- [x] T043 [P] Migrate jQuery AJAX to HTMX in `views/front/page/cicd/jenkins_list.html`, `jenkins_job_detail.html`, `jenkins_log.html` — replace AJAX calls with HTMX attributes
- [x] T044 [P] Migrate jQuery AJAX to HTMX in `views/front/page/cicd/aliyun_ak_list.html`, `index.html` — replace AJAX calls with HTMX attributes
- [x] T045 Verify all CI/CD operations work — pipeline CRUD, Jenkins job browsing, log viewing, Aliyun AK management

**Checkpoint**: CI/CD module fully migrated to HTMX, zero functional regressions

---

## Phase 10: HTMX Migration — xkube Module (Priority: P1)

**Goal**: Replace all jQuery AJAX calls in xkube module with HTMX attributes

**Independent Test**: Browse clusters, view resources, manage deployments, use terminal — all operations work via HTMX

### Implementation for HTMX Migration — xkube

- [x] T046 [P] Migrate jQuery AJAX to HTMX in cluster management pages — `views/front/page/xkube/clusterList.html`, `clusterAdd.html`, `clusterEdit.html`
- [x] T047 [P] Migrate jQuery AJAX to HTMX in deployment pages — `views/front/page/xkube/deployNodeAffinity.html`, `dsYaml.html`, `stsProbe.html`, `hpaCreate.html`
- [x] T048 [P] Migrate jQuery AJAX to HTMX in resource pages — `views/front/page/xkube/configmapList.html`, `clusterRoleBindingList.html`, `roleBindingList.html`, `cdrList.html`, `appnameList.html`, `appnameAdd.html`, `appnameEdit.html`
- [x] T049 [P] Migrate jQuery AJAX to HTMX in detail/monitoring pages — `views/front/page/xkube/nodeDetail.html`, `podCpuMemLine.html`, `storageclassDetail.html`
- [x] T050 [P] Migrate jQuery AJAX to HTMX in remaining xkube pages — `apply_yaml.html`, `clone_resource.html`, terminal pages, all other xkube templates
- [x] T051 Verify all xkube operations work — cluster CRUD, resource browsing, deployment management, YAML apply, terminal access

**Checkpoint**: xkube module fully migrated to HTMX, zero functional regressions

---

## Phase 11: HTMX Migration — Wiki, Login, and Remaining Pages (Priority: P2-P3)

**Goal**: Replace all jQuery AJAX calls in remaining modules with HTMX attributes

**Independent Test**: Create/edit wiki articles, login flow, search, AI chat — all operations work via HTMX

### Implementation for HTMX Migration — Remaining

- [x] T052 [P] Migrate jQuery AJAX to HTMX in wiki pages — `views/front/page/wiki/add.html`, `edit.html`, `list.html`, `columnList.html`
- [x] T053 [P] Migrate jQuery AJAX to HTMX in login pages — `views/front/login_code.html`, `login_telcode.html`
- [x] T054 [P] Migrate jQuery AJAX to HTMX in search and utility pages — `views/front/page/search.html`, `views/front/page/aiChat.html`, `views/front/page/appDown.html`
- [x] T055 [P] Migrate jQuery AJAX to HTMX in shared JS files — `views/front/js/xkube.js` (global AJAX helpers, utility functions)
- [x] T056 Verify all remaining module operations work — wiki CRUD, login flow, search, AI chat, global utilities

**Checkpoint**: All modules fully migrated to HTMX

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, cleanup, and responsive testing

- [ ] T057 Remove unused jQuery references from `views/front/js/xkube.js` and HTML templates after HTMX migration (only if jQuery is no longer needed by any Layui module)
- [ ] T058 Verify Layui JS components still function across all modules — `form.on('submit')`, `table.render()`, `layer.open()`, `tree.render()`, dropdowns, date pickers
- [ ] T059 Test responsive behavior on mobile viewport (375px) — sidebar collapse, header adaptation, content reflow, form usability
- [ ] T060 Test responsive behavior on desktop viewport (1920px+) — content max-width, table horizontal scroll, modal sizing
- [ ] T061 Run quickstart.md validation — verify all checklist items pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational CSS)**: Depends on Phase 1 (CDN loaded)
- **Phase 3-7 (User Stories)**: All depend on Phase 2 completion
  - US1 (Forms) and US2 (Buttons) can run in parallel
  - US3 (Tables) can run in parallel with US1/US2
  - US4 (Layout) depends on Phase 2, can run in parallel with US1-US3
  - US5 (Login) depends on Phase 2, can run in parallel with US1-US4
- **Phase 8-11 (HTMX Migration)**: Depend on Phases 3-7 (styling complete)
  - RBAC, CI/CD, xkube HTMX migration can all run in parallel
  - Wiki/remaining HTMX migration can run in parallel with above
- **Phase 12 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Forms P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (Buttons P1)**: Can start after Phase 2 — independent of US1
- **US3 (Tables P2)**: Can start after Phase 2 — independent of US1/US2
- **US4 (Layout P2)**: Can start after Phase 2 — independent of US1-US3
- **US5 (Login P3)**: Can start after Phase 2 — independent of US1-US4

### Parallel Opportunities

- US1 + US2 + US3 + US4 + US5 can all be worked on in parallel after Phase 2
- HTMX migration for RBAC + CI/CD + xkube + wiki can all be run in parallel
- Within each HTMX migration phase, individual page tasks marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational CSS (T004-T011)
3. Complete Phase 3: US1 Forms (T012-T017)
4. Complete Phase 4: US2 Buttons (T018-T022)
5. **STOP and VALIDATE**: Forms and buttons look modern across all modules
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational CSS → Design system ready
2. Add US1 + US2 → Forms + Buttons modern → Deploy/Demo (MVP!)
3. Add US3 + US4 → Tables + Layout modern → Deploy/Demo
4. Add US5 → Login modern → Deploy/Demo
5. HTMX Migration (RBAC → CI/CD → xkube → remaining) → Deploy/Demo
6. Polish → Final validation → Deploy

### Notes

- CSS-only changes (Phases 1-7) have near-zero regression risk — existing Layui JS untouched
- HTMX migration (Phases 8-11) has higher risk — each page needs manual testing
- jQuery may still be needed by some Layui modules — only remove in Phase 12 after verification
- Backend endpoints returning JSON may need HTMX event handlers (`htmx:beforeSwap`) or HTML fragment responses
