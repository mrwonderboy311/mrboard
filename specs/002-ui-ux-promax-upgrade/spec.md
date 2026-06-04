# Feature Specification: UI/UX Pro Max Upgrade

**Feature Branch**: `002-ui-ux-promax-upgrade`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "使用 ui ux promax 对所有界面展示进行升级"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Modern Dashboard & Navigation Experience (Priority: P1)

As an operator accessing xkube daily, I want a visually modern, consistent dashboard layout with a polished sidebar, header, and content area so that I can navigate efficiently and feel confident in the tool's professionalism.

**Why this priority**: The main layout (xkube_index.html) and sidebar navigation are the first thing every user sees. A modern, cohesive shell sets the tone for the entire application and affects every page.

**Independent Test**: Can be verified by loading the main index page and confirming the sidebar, header, and content frame render with modern styling (rounded corners, smooth transitions, refined typography, consistent spacing).

**Acceptance Scenarios**:

1. **Given** the user opens xkube in a browser, **When** the main layout loads, **Then** the sidebar displays with a modern dark/gradient theme, smooth hover transitions, and clear active-state indicators on menu items.
2. **Given** the user navigates between menu items, **When** clicking a submenu item, **Then** the content area loads with a smooth transition and the active menu item is visually highlighted.
3. **Given** the user resizes the browser window, **When** the viewport changes, **Then** the layout adapts responsively with the sidebar collapsing to icons on narrow screens.

---

### User Story 2 - Kubernetes Resource List Pages Upgrade (Priority: P1)

As a cluster administrator managing deployments, pods, services, and other resources, I want all resource list pages to have a modern table design with clear status badges, refined search bars, and polished action buttons so that I can quickly assess resource health and take action.

**Why this priority**: Resource list pages (deployList, podList, nodeList, serviceList, etc.) are the most frequently visited pages. Visual clarity directly impacts operational efficiency.

**Independent Test**: Can be verified by loading any resource list page (e.g., deployList.html) and confirming modern table styling, colored status badges, refined search fieldset, and polished toolbar buttons.

**Acceptance Scenarios**:

1. **Given** the user opens a resource list page, **When** the table loads, **Then** rows display with alternating backgrounds, hover highlights, and status columns use colored pill-shaped badges (green=Running, yellow=Pending, red=Error, gray=Unknown).
2. **Given** the user uses the search fieldset, **When** entering criteria and clicking search, **Then** the search area has a clean card-style design with proper spacing and the search button has a modern gradient/flat style.
3. **Given** the user views action buttons in the toolbar, **When** hovering over buttons, **Then** buttons show subtle hover effects with consistent iconography.

---

### User Story 3 - Detail & Form Pages Upgrade (Priority: P2)

As an operator creating or editing resources (deployments, configmaps, secrets, etc.), I want form pages with modern input styling, clear labels, proper spacing, and polished modal dialogs so that I can work efficiently without visual fatigue.

**Why this priority**: Detail and form pages are where users spend the most time doing actual work. Better form UX reduces errors and improves productivity.

**Independent Test**: Can be verified by opening any create/edit form (e.g., deployCreate.html, configmapCreate.html) and confirming modern input styling, clear section grouping, and polished button styles.

**Acceptance Scenarios**:

1. **Given** the user opens a create/edit form, **When** the form renders, **Then** inputs have modern rounded borders with focus glow effects, labels are clearly aligned, and required fields show visual indicators.
2. **Given** the user submits a form with validation errors, **When** errors appear, **Then** error messages display inline with red highlight and clear iconography.
3. **Given** the user opens a YAML editor or detail modal, **When** the modal renders, **Then** it has a modern overlay with rounded corners, proper padding, and smooth open/close animations.

---

### User Story 4 - Loki Log Viewer & Monitoring Pages Upgrade (Priority: P2)

As an SRE investigating issues through logs and metrics, I want the Loki log viewer and monitoring pages (pod metrics, node metrics) to have a modern terminal-like aesthetic with refined histograms, clear log level badges, and smooth real-time tail animations so that I can read logs comfortably for extended periods.

**Why this priority**: Log viewing and monitoring are high-usage, long-duration activities. Visual comfort directly impacts debugging efficiency.

**Independent Test**: Can be verified by opening logViewer.html and confirming modern dark-mode log area, refined histogram chart styling, and smooth WebSocket tail updates.

**Acceptance Scenarios**:

1. **Given** the user opens the log viewer, **When** the grouped view loads, **Then** service cards display with modern card shadows, rounded corners, and color-coded log level preview badges.
2. **Given** the user switches to detail view and logs stream in, **When** new entries arrive via WebSocket, **Then** entries animate in smoothly with a subtle highlight effect on new rows.
3. **Given** the user views the histogram, **When** the chart renders, **Then** bars use a modern gradient fill with rounded tops and the chart has a clean, minimal grid style.

---

### User Story 5 - Login & Authentication Pages Upgrade (Priority: P2)

As a user logging into xkube, I want a modern, visually appealing login page with clean form design, proper branding space, and smooth transitions so that the first impression is professional and trustworthy.

**Why this priority**: Login is the entry point for all users. A polished login page establishes trust and professionalism.

**Independent Test**: Can be verified by loading login_code.html and confirming modern centered card layout, refined input styling, and proper visual hierarchy.

**Acceptance Scenarios**:

1. **Given** the user navigates to the login page, **When** the page loads, **Then** a centered card with the login form appears with a subtle shadow, rounded corners, and a clean background.
2. **Given** the user enters credentials, **When** focusing on input fields, **Then** inputs show a smooth focus animation with a colored border glow.
3. **Given** the user submits the login form, **When** processing, **Then** the submit button shows a loading spinner animation.

---

### User Story 6 - CI/CD & Wiki Pages Upgrade (Priority: P3)

As a developer using CI/CD pipelines and wiki documentation, I want these pages to share the same modern design language as the rest of the application so that the experience is cohesive across all modules.

**Why this priority**: CI/CD and Wiki are secondary modules but still benefit from visual consistency.

**Independent Test**: Can be verified by opening cicdList.html and wiki/list.html and confirming they match the modern design system used in resource pages.

**Acceptance Scenarios**:

1. **Given** the user opens CI/CD pipeline list, **When** the page loads, **Then** pipeline cards/tables use the same modern styling as Kubernetes resource pages.
2. **Given** the user opens wiki pages, **When** rendering, **Then** article cards and the markdown editor share consistent typography and spacing with the rest of the application.

---

### Edge Cases

- What happens when the user has a slow network connection? Pages should show skeleton loading states instead of blank screens.
- How does the system handle very long resource names or log messages? Text should truncate gracefully with ellipsis and tooltip on hover.
- What happens on very narrow viewports (< 768px)? The sidebar should collapse and tables should become horizontally scrollable.
- What happens when dark mode is preferred by the user's OS? Consider a dark mode option for log viewer and monitoring pages.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST apply a unified design system (color palette, typography, spacing, border-radius, shadows) across ALL HTML pages in views/front/.
- **FR-002**: System MUST upgrade the main layout (xkube_index.html) with a modern sidebar theme, refined header, and smooth navigation transitions.
- **FR-003**: System MUST modernize all resource list tables with alternating row colors, hover effects, and colored status badges.
- **FR-004**: System MUST upgrade all form pages (create/edit) with modern input styling, focus effects, and clear validation states.
- **FR-005**: System MUST modernize the Loki log viewer with refined service cards, histogram styling, and smooth real-time tail animations.
- **FR-006**: System MUST upgrade login pages with a centered card layout, modern form design, and loading states.
- **FR-007**: System MUST add skeleton loading states for pages that load data asynchronously.
- **FR-008**: System MUST ensure all interactive elements (buttons, links, dropdowns) have consistent hover/active/focus states.
- **FR-009**: System MUST maintain backward compatibility with the existing Layui v2.13.3 framework (no framework replacement).
- **FR-010**: System MUST ensure all upgraded pages remain functional with existing backend APIs (no API changes).
- **FR-011**: System MUST add CSS custom properties (variables) for the design system tokens (colors, spacing, shadows) to enable easy theme customization.
- **FR-012**: System MUST upgrade all YAML editor/preview pages with modern code editor styling.

### Key Entities

- **Design System Tokens**: Color palette (primary, success, warning, danger, neutral shades), typography scale, spacing scale, border-radius values, shadow levels, transition timings.
- **Page Template**: The base HTML structure shared across pages (head includes, CSS imports, script imports).
- **Component Style**: Reusable UI patterns (status badges, card styles, table styles, form styles, button styles, modal styles, loading states).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All pages load with consistent visual styling — zero pages with raw/unstyled Layui defaults visible to users.
- **SC-002**: Status indicators (Running, Pending, Error, etc.) are instantly recognizable via color-coded badges across all resource pages.
- **SC-003**: Users can identify the active navigation item within 1 second of page load (clear visual indicator).
- **SC-004**: Form pages reduce visual clutter — label-to-input spacing is consistent, and required fields are visually distinct.
- **SC-005**: Log viewer supports comfortable reading for 30+ minute sessions without visual fatigue (refined typography, proper contrast ratios).
- **SC-006**: Login page renders as a modern centered card layout on all screen sizes.
- **SC-007**: All interactive elements provide visual feedback (hover, active, focus) within 200ms of user interaction.
- **SC-008**: Skeleton loading states appear within 300ms of page navigation for data-heavy pages.

## Assumptions

- The existing Layui v2.13.3 framework will be retained; upgrades will be achieved through CSS overrides and targeted HTML/template modifications, not framework replacement.
- The existing backend APIs and JavaScript business logic (xkube.js, page-specific scripts) will not be modified unless strictly necessary for UI changes.
- The upgrade scope covers all HTML pages under views/front/page/ (xkube, cicd, rbac, wiki, app subdirectories) plus login pages and the main layout.
- The wiki editor (editor.md) will receive visual styling updates but not functional changes to its markdown editing capabilities.
- Third-party libraries (ECharts, xterm.js, CodeMirror) will be styled via CSS overrides rather than replaced.
- Mobile-responsive design is a secondary goal; the primary target is desktop browsers at 1280px+ width.
- The log viewer supports light/dark mode toggle (default dark); other pages use a modernized light theme only.

## Clarifications

### Session 2026-06-01

- Q: 视觉风格方向？ → A: Material Design 风格 — Google 的 Material 3 设计语言，层次分明、色彩丰富
- Q: 主色调选择？ → A: 深邃靛蓝 (#3F51B5) — 更沉稳高端，适合企业级工具
- Q: 侧边栏样式？ → A: 渐变侧边栏 — 从深到浅的渐变背景，视觉层次感强
- Q: 骨架屏加载方式？ → A: 仅列表页骨架屏 — 只在资源列表页显示骨架屏，详情页用 loading spinner
- Q: 日志查看器配色方案？ → A: 可切换 — 默认暗色，用户可一键切换为浅色
