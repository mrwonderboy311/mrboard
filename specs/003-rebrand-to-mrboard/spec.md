# Feature Specification: Rebrand xkube to mrboard

**Feature Branch**: `003-rebrand-to-mrboard`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "把有关xkube官方的信息和标题logo都去了，新名称为mrboard"

## Clarifications

### Session 2026-06-01

- Q: 侧边栏 Logo 区域应如何显示 "mrboard"？ → A: 替换为 "mrboard" 纯文字（选项 A）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Replace User-Facing Brand Text (Priority: P1)

As a user opening the platform, I see "mrboard" as the product name everywhere — login page title, browser tab title, sidebar header — with no traces of "xkube" branding.

**Why this priority**: Brand text is the first thing users see. Mismatched branding creates confusion and looks unprofessional.

**Independent Test**: Open the login page and main dashboard — all visible text says "mrboard", no "xkube" appears in any user-facing label or title.

**Acceptance Scenarios**:

1. **Given** a user navigates to the login page, **When** the page loads, **Then** the login card header displays "mrboard" instead of "xkube后台登录"
2. **Given** a user logs in successfully, **When** the dashboard loads, **Then** the browser tab title shows "mrboard" instead of "xkube-k8s集群管理平台"
3. **Given** a user views the sidebar, **When** the layout renders, **Then** the logo area displays "mrboard" text instead of "xkube"
4. **Given** a user views any page footer or copyright, **When** the page loads, **Then** no "xkube" text appears

---

### User Story 2 - Update Configuration Defaults (Priority: P2)

As a system administrator, the application configuration file uses "mrboard" as the default app name, so deployments reflect the new brand.

**Why this priority**: Configuration defaults affect all new deployments and documentation references.

**Independent Test**: Open `conf/app.conf` — the `appname` field reads `mrboard`, SMS sign name references "mrboard", demo domain references "mrboard".

**Acceptance Scenarios**:

1. **Given** the default configuration, **When** the app starts, **Then** `appname` is set to `mrboard`
2. **Given** SMS/notification templates, **When** a message is sent, **Then** the sign name references "mrboard" instead of "xkube助手"
3. **Given** the demo domain setting, **When** the config is read, **Then** the domain references "mrboard" instead of "xkube-demo"

---

### User Story 3 - Update Mobile/App Download Page (Priority: P3)

As a user visiting the mobile download page, I see "mrboard" as the product name and description.

**Why this priority**: The app download page is a public-facing page that represents the brand.

**Independent Test**: Open `page/appDown.html` — title and body text say "mrboard" instead of "xkube".

**Acceptance Scenarios**:

1. **Given** a user visits the download page, **When** the page loads, **Then** the title shows "mrboard" instead of "xkube - 移动k8s多集群管理助手"
2. **Given** the download page content, **When** rendered, **Then** all descriptive text references "mrboard"

---

### Edge Cases

- What happens if a user has cached the old page title? — Browser cache will be refreshed by the HTML change; no special handling needed.
- What about the `xkube.js` filename? — This is a code file name, not user-facing branding. Out of scope.
- What about API routes like `/xkube/...`? — These are internal URLs, not user-visible branding. Out of scope.
- What about database names like `db_xkube`? — These are infrastructure details, not user-facing. Out of scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display "mrboard" as the product name in the login page header
- **FR-002**: System MUST display "mrboard" in the browser tab title across all pages
- **FR-003**: System MUST display "mrboard" as text in the sidebar logo area of the main layout (via CSS `::after` content or inline text, no image asset)
- **FR-004**: System MUST NOT display "xkube" in any user-visible text, title, or label
- **FR-005**: System MUST update the default `appname` configuration to `mrboard`
- **FR-006**: System MUST update notification sign names to reference "mrboard"
- **FR-007**: System MUST update the mobile download page title and content to reference "mrboard"
- **FR-008**: Internal API routes (`/xkube/...`), file names, and database names MUST remain unchanged (backward compatibility)

### Key Entities

- **Branding Text**: All user-visible strings containing "xkube" — login headers, page titles, logo text, notification sign names
- **Configuration**: Default app config values that reference "xkube"

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero occurrences of "xkube" in any user-visible HTML text (titles, headers, labels, footers)
- **SC-002**: All page titles display "mrboard" when viewed in a browser
- **SC-003**: Login page header, sidebar logo area, and download page all show "mrboard"
- **SC-004**: Application starts successfully after configuration changes with no errors

## Assumptions

- The new name "mrboard" is used as-is (no subtitle or tagline needed)
- API routes (`/xkube/...`) are internal and do not need renaming
- JavaScript file names (`xkube.js`) are code artifacts, not user-facing branding
- Database names and credentials are infrastructure details, out of scope
- No new logo image is required — text-only replacement is sufficient
