# Tasks: UI/UX Pro Max Upgrade

**Input**: Design documents from `/specs/002-ui-ux-promax-upgrade/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the design system CSS foundation

- [x] T001 Create `views/front/css/material-theme.css` with `:root` CSS custom properties (design tokens: colors, spacing, radius, shadows, transitions) per research.md
- [x] T002 Create `views/front/css/skeleton.css` with `@keyframes` shimmer animation and `.skeleton` utility classes per research.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core CSS overrides that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add Layui button overrides in `views/front/css/material-theme.css` (`.layui-btn` border-radius, transitions, primary color, hover/active/focus states)
- [x] T004 [P] Add Layui table overrides in `views/front/css/material-theme.css` (`.layui-table` alternating rows, hover, cell padding, border)
- [x] T005 [P] Add Layui form overrides in `views/front/css/material-theme.css` (`.layui-input`, `.layui-select`, `.layui-form-label` border-radius, focus glow, spacing)
- [x] T006 [P] Add Layui modal/layer overrides in `views/front/css/material-theme.css` (`.layui-layer` shadow, border-radius, overlay)
- [x] T007 [P] Add Layui card overrides in `views/front/css/material-theme.css` (`.layui-card` shadow, border-radius)
- [x] T008 Add status badge component styles in `views/front/css/material-theme.css` (`.status-badge`, `.status-running`, `.status-pending`, `.status-error`, `.status-unknown`, `.status-info` pill shapes with colors)
- [x] T009 Add `material-theme.css` link to `views/front/xkube_index.html` after `public.css` in `<head>`

**Checkpoint**: Foundation ready — all pages will inherit base Material Design styling

---

## Phase 3: User Story 1 — Modern Dashboard & Navigation (Priority: P1) 🎯 MVP

**Goal**: Modern sidebar with gradient, refined header, smooth navigation transitions

**Independent Test**: Open main index — sidebar shows gradient background, white text, active menu highlighted, smooth hover transitions

### Implementation for User Story 1

- [x] T010 [US1] Add gradient sidebar styles in `views/front/css/material-theme.css` (`.layui-nav` parent container linear-gradient from deep indigo to lighter shade, white text/icon colors, hover states)
- [x] T011 [US1] Add active menu item indicator styles in `views/front/css/material-theme.css` (left border or background highlight for `.layui-this` items)
- [x] T012 [US1] Add header/topbar refinements in `views/front/css/material-theme.css` (clean background, refined typography, shadow)
- [x] T013 [US1] Add navigation transition animations in `views/front/css/material-theme.css` (`.layui-nav .layui-nav-item a` transition on hover/active)
- [x] T014 [US1] Verify sidebar renders correctly in `views/front/xkube_index.html` — gradient, text color, active states

**Checkpoint**: Main layout shell is fully modernized — all subsequent pages inherit this shell

---

## Phase 4: User Story 2 — Resource List Pages (Priority: P1)

**Goal**: Modern table design, colored status badges, refined search bars, polished action buttons

**Independent Test**: Open any resource list page (e.g., deployList.html) — modern table styling, status badges, clean search fieldset

### Implementation for User Story 2

- [x] T015 [P] [US2] Update search fieldset styles in `views/front/css/material-theme.css` (`.table-search-fieldset` card-style design, rounded corners, shadow, proper spacing)
- [x] T016 [P] [US2] Add Layui table toolbar styles in `views/front/css/material-theme.css` (`.layui-table-tool` modern button layout)
- [x] T017 [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/deployList.html`
- [x] T018 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/podList.html`
- [x] T019 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/nodeList.html`
- [x] T020 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/serviceList.html`
- [x] T021 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/namespaceList.html`
- [x] T022 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/configmapList.html`
- [x] T023 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/secretList.html`
- [x] T024 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/pvList.html`
- [x] T025 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/pvcList.html`
- [x] T026 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/dsList.html`
- [x] T027 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/stsList.html`
- [x] T028 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/jobList.html`
- [x] T029 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/cronjobList.html`
- [x] T030 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/ingressList.html`
- [x] T031 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/hpaList.html`
- [x] T032 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/gatewayList.html`
- [x] T033 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/eventList.html`
- [x] T034 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/storageclassList.html`
- [x] T035 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/resourceList.html`
- [x] T036 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/xkube/clusterList.html`
- [x] T037 [P] [US2] Add `material-theme.css` link and update status column rendering in remaining xkube list pages (`nodepoolList`, `serviceAccountsList`, `rolesList`, `clusterRolesList`, `clusterRoleBindingList`, `roleBindingList`, `lockList`, `appnameList`, `cdrList`, `myFavorite`)
- [x] T038 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/rbac/adminList.html`
- [x] T039 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/rbac/groupList.html`
- [x] T040 [P] [US2] Add `material-theme.css` link and update status column rendering in `views/front/page/rbac/roleList.html`
- [x] T041 [P] [US2] Add `material-theme.css` link and update status column rendering in remaining rbac list pages (`auditLogList`, `clusterToUserList`, `myClusterList`, `nodeList`, `nodeListByGroupId`, `roleToNodeList`, `roleToUserList`)

**Checkpoint**: All resource list pages have modern tables, status badges, and polished search bars

---

## Phase 5: User Story 3 — Detail & Form Pages (Priority: P2)

**Goal**: Modern form inputs with focus glow, polished modals, refined YAML editor styling

**Independent Test**: Open any create/edit form — inputs have rounded borders, focus glow, clear labels, modern buttons

### Implementation for User Story 3

- [x] T042 [P] [US3] Add `material-theme.css` link to `views/front/page/xkube/deployCreate.html`
- [x] T043 [P] [US3] Add `material-theme.css` link to `views/front/page/xkube/configmapCreate.html`
- [x] T044 [P] [US3] Add `material-theme.css` link to `views/front/page/xkube/secretCreate.html`
- [x] T045 [P] [US3] Add `material-theme.css` link to `views/front/page/xkube/serviceCreate.html`
- [x] T046 [P] [US3] Add `material-theme.css` link to `views/front/page/xkube/namespaceCreate.html`
- [x] T047 [P] [US3] Add `material-theme.css` link to `views/front/page/xkube/ingressCreate.html`
- [x] T048 [P] [US3] Add `material-theme.css` link to `views/front/page/xkube/stsCreate.html`
- [x] T049 [P] [US3] Add `material-theme.css` link to `views/front/page/xkube/cronjobCreate.html`
- [x] T050 [P] [US3] Add `material-theme.css` link to `views/front/page/xkube/hpaCreate.html`
- [x] T051 [P] [US3] Add `material-theme.css` link to remaining create/edit pages (`gatewayCreate`, `httprouteCreate`, `tcprouteCreate`, `udprouteCreate`, `grpcrouteCreate`, `appnameAdd`, `appnameEdit`, `clusterAdd`, `clusterEdit`, `createBackup`, `clone_resource`, `create_by_yaml`)
- [x] T052 [P] [US3] Add `material-theme.css` link to detail pages (`deployDetail`, `podDetail`, `nodeDetail`, `serviceDetail`, `ingressDetail`, `pvDetail`, `pvcDetail`, `configmapDetail`, `secretDetail`, `gatewayDetail`, `stsDetail`, `jobDetail`, `cronjobDetail`, `gatewayclassDetail`, `storageclassDetail`)
- [x] T053 [P] [US3] Add `material-theme.css` link to YAML view/edit pages (`deployYaml`, `podYaml`, `nodeYaml`, `serviceYaml`, `configmapYaml`, `secretYaml`, `pvYaml`, `pvcYaml`, `ingressYaml`, `stsYaml`, `jobYaml`, `cronjobYaml`, `hpaYaml`, `gatewayYaml`, `namespaceYaml`, `rolesYaml`, `clusterRolesYaml`, `roleBindingYaml`, `clusterRoleBindingYaml`, `serviceAccountsYaml`, `storageclassYaml`, `gatewayclassYaml`, `replicasetYaml`, `dsYaml`, `yamlView`, `yamlBackup`)
- [x] T054 [US3] Add YAML editor styling overrides in `views/front/css/material-theme.css` (CodeMirror container border-radius, shadow, font refinements)
- [x] T055 [US3] Add form validation error styling in `views/front/css/material-theme.css` (inline error messages with red highlight and iconography)
- [x] T056 [P] [US3] Add `material-theme.css` link to RBAC form pages (`adminEdit`, `changepassword`, `accesstonode`, `roleToNodeList`, `roleToUserList`)
- [x] T057 [P] [US3] Add `material-theme.css` link to resource editing pages (`deployEnv`, `deployImage`, `deployHost`, `deployResource`, `deployLables`, `deployProbe`, `deployLifecycle`, `deployNodeAffinity`, `deployPodAffinity`, `deployTolerations`, `stsEnv`, `stsImage`, `stsHost`, `stsResource`, `stsLables`, `stsProbe`, `stsLifecycle`, `stsNodeAffinity`, `nodeLables`, `nodeTaint`, `cronjobLables`, `namespaceResLimit`, `ingressPathRule`, `ingressTlsHost`, `configmap_yaml_create`, `secret_yaml_create`, `service_yaml_create`, `pv_yaml_create`, `pvc_yaml_create`, `ingress_yaml_create`, `deploy_yaml_create`, `apply_yaml`)

**Checkpoint**: All form and detail pages have modern Material Design styling

---

## Phase 6: User Story 4 — Loki Log Viewer & Monitoring (Priority: P2)

**Goal**: Modern log viewer with dark/light toggle, refined service cards, smooth tail animations

**Independent Test**: Open logViewer.html — service cards have shadows, dark theme by default, toggle button works, histogram has modern styling

### Implementation for User Story 4

- [x] T058 [US4] Add log viewer dark theme styles in `views/front/page/xkube/logViewer.html` (`.log-theme-dark` CSS variables for background, text, borders)
- [x] T059 [US4] Add log viewer light theme styles in `views/front/page/xkube/logViewer.html` (`.log-theme-light` CSS variables)
- [x] T060 [US4] Add theme toggle button HTML and JavaScript in `views/front/page/xkube/logViewer.html` (toggle `.log-theme-dark`/`.log-theme-light` class, persist preference in localStorage)
- [x] T061 [US4] Update service card styles in `views/front/page/xkube/logViewer.html` (modern shadows, rounded corners, refined typography)
- [x] T062 [US4] Update log entry styles in `views/front/page/xkube/logViewer.html` (refined monospace font, line-height, hover highlight, new-entry animation)
- [x] T063 [US4] Update histogram chart options in `views/front/page/xkube/logViewer.html` (gradient bar fill, rounded tops, minimal grid)
- [x] T064 [P] [US4] Add `material-theme.css` link and refine styles in `views/front/page/xkube/podCpuMemLine.html`
- [x] T065 [P] [US4] Add `material-theme.css` link and refine styles in `views/front/page/xkube/nodeCpuMemLine.html`
- [x] T066 [P] [US4] Add `material-theme.css` link and refine styles in `views/front/page/xkube/topPodMetric.html`
- [x] T067 [P] [US4] Add `material-theme.css` link and refine styles in `views/front/page/xkube/podLog.html`
- [x] T068 [P] [US4] Add `material-theme.css` link and refine styles in `views/front/page/xkube/jobLog.html`
- [x] T069 [P] [US4] Add `material-theme.css` link to `views/front/page/xkube/podTerminal.html` (xterm.js container styling)
- [x] T070 [P] [US4] Add `material-theme.css` link to `views/front/page/xkube/aiChat.html`
- [x] T071 [P] [US4] Add `material-theme.css` link to `views/front/page/aiChat.html`

**Checkpoint**: Log viewer and monitoring pages have modern styling with dark/light toggle

---

## Phase 7: User Story 5 — Login Pages (Priority: P2)

**Goal**: Modern centered card login with focus animations and loading states

**Independent Test**: Open login page — centered card with shadow, clean inputs, focus glow, loading spinner on submit

### Implementation for User Story 5

- [x] T072 [US5] Update login page layout in `views/front/login_code.html` (centered card wrapper, background gradient, Material Design form styling)
- [x] T073 [US5] Update tel login page layout in `views/front/login_telcode.html` (same centered card treatment)
- [x] T074 [US5] Add login-specific styles in `views/front/css/material-theme.css` (`.login-card` centered layout, max-width, shadow, background)
- [x] T075 [US5] Add submit button loading spinner in `views/front/login_code.html` and `views/front/login_telcode.html` (show spinner on form submit)

**Checkpoint**: Login pages have modern, professional appearance

---

## Phase 8: User Story 6 — CI/CD & Wiki Pages (Priority: P3)

**Goal**: Visual consistency with the rest of the application

**Independent Test**: Open cicdList.html and wiki/list.html — styling matches resource pages

### Implementation for User Story 6

- [x] T076 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/cicdList.html`
- [x] T077 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/index.html`
- [x] T078 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/jenkins_list.html`
- [x] T079 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/jenkins_job_detail.html`
- [x] T080 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/jenkins_log.html`
- [x] T081 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/pipelines_index.html`
- [x] T082 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/pipelines_add.html`
- [x] T083 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/pipelines_edit.html`
- [x] T084 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/pipelines_detail.html`
- [x] T085 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/pipelines_log.html`
- [x] T086 [P] [US6] Add `material-theme.css` link to `views/front/page/cicd/aliyun_ak_list.html`
- [x] T087 [P] [US6] Add `material-theme.css` link to `views/front/page/wiki/list.html`
- [x] T088 [P] [US6] Add `material-theme.css` link to `views/front/page/wiki/add.html`
- [x] T089 [P] [US6] Add `material-theme.css` link to `views/front/page/wiki/edit.html`
- [x] T090 [P] [US6] Add `material-theme.css` link to `views/front/page/wiki/read.html`
- [x] T091 [P] [US6] Add `material-theme.css` link to `views/front/page/wiki/columnList.html`
- [x] T092 [US6] Add wiki editor styling overrides in `views/front/css/material-theme.css` (editor container border-radius, shadow, toolbar refinements)

**Checkpoint**: CI/CD and Wiki pages share the same design language

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements across all pages

- [x] T093 Add skeleton loading toggle logic in `views/front/js/xkube.js` (helper function to show/hide skeleton on Layui table `done` callback)
- [x] T094 Add skeleton CSS classes in `views/front/css/skeleton.css` for table rows (`.skeleton-row` shimmer animation)
- [x] T095 [P] Add `material-theme.css` link to remaining pages (`views/front/page/search.html`, `views/front/page/appDown.html`, `views/front/page/xkube/deployCheck.html`, `views/front/page/xkube/podCheck.html`, `views/front/page/xkube/nodeCpuMemLine.html`)
- [x] T096 [P] Add `material-theme.css` link to RBAC pages (`views/front/page/rbac/myinfo.html`, `views/front/page/rbac/lockList.html`, `views/front/page/rbac/myClusterList.html`)
- [x] T097 [P] Add `material-theme.css` link to `views/front/page/xkube/xkube-main.html` and `views/front/xkube_index.html` (ensure main layout includes theme)
- [x] T098 Run `go build -o /tmp/xkube main.go` and verify compilation succeeds
- [ ] T099 Manual browser testing: verify sidebar, list pages, forms, log viewer, login page per quickstart.md testing checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (material-theme.css must exist)
- **US1 (Phase 3)**: Depends on Phase 2 — sidebar is the shell for all pages
- **US2 (Phase 4)**: Depends on Phase 2 — can run in parallel with US1
- **US3 (Phase 5)**: Depends on Phase 2 — can run in parallel with US1/US2
- **US4 (Phase 6)**: Depends on Phase 2 — can run in parallel with US1/US2/US3
- **US5 (Phase 7)**: Depends on Phase 2 — can run in parallel with other stories
- **US6 (Phase 8)**: Depends on Phase 2 — can run in parallel with other stories
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US3 (P2)**: Can start after Phase 2 — no dependencies on other stories
- **US4 (P2)**: Can start after Phase 2 — no dependencies on other stories
- **US5 (P2)**: Can start after Phase 2 — no dependencies on other stories
- **US6 (P3)**: Can start after Phase 2 — no dependencies on other stories

### Parallel Opportunities

- All tasks marked [P] within a phase can run in parallel
- All user story phases (3–8) can run in parallel after Phase 2 completes
- T017–T041 (US2 list pages) are all independent and parallelizable
- T042–T057 (US3 form pages) are all independent and parallelizable
- T076–T091 (US6 CI/CD & Wiki pages) are all independent and parallelizable

---

## Parallel Example: User Story 2

```bash
# Launch all list page updates in parallel (after Phase 2):
Task: "Add material-theme.css link and status badges to deployList.html"
Task: "Add material-theme.css link and status badges to podList.html"
Task: "Add material-theme.css link and status badges to nodeList.html"
Task: "Add material-theme.css link and status badges to serviceList.html"
# ... all [P] tasks in US2
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T009)
3. Complete Phase 3: User Story 1 (T010–T014)
4. **STOP and VALIDATE**: Load main index — gradient sidebar, active menu, transitions
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test sidebar → Deploy/Demo (MVP!)
3. Add US2 → Test list pages → Deploy/Demo
4. Add US3 + US4 + US5 → Test forms, logs, login → Deploy/Demo
5. Add US6 → Test CI/CD & Wiki → Deploy/Demo
6. Polish → Final validation → Complete

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (sidebar) + US5 (login)
   - Developer B: US2 (list pages — bulk of work)
   - Developer C: US3 (forms) + US4 (log viewer)
   - Developer D: US6 (CI/CD & Wiki)
3. Polish phase: everyone contributes to remaining pages

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total task count: 99
- Estimated file count to modify: ~150 HTML files + 3 CSS files + 1 JS file
