# Feature Specification: UI Modernization with HTMX + Tailwind CSS

**Feature Branch**: `005-ui-htmx-tailwind`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "整体界面优化表单和按钮都优化 HTMX + Tailwind CSS"

## Clarifications

### Session 2026-06-01

- Q: HTMX 替换范围 — 全量替换 jQuery AJAX 还是渐进式引入？ → A: 全量替换，所有页面的 jQuery AJAX 调用都替换为 HTMX

## User Scenarios & Testing

### User Story 1 - Modern Form Styling (Priority: P1)

As a platform user, I want all forms (login, edit, create, search) to have a clean, modern appearance with proper spacing, rounded inputs, focus states, and clear visual hierarchy, so that I can complete tasks efficiently without visual clutter.

**Why this priority**: Forms are the primary interaction pattern across the entire platform (admin management, RBAC, CI/CD, cluster management). Every module uses forms, so this delivers the highest impact.

**Independent Test**: Can be tested by visiting any form page (e.g., admin edit, cluster add) and verifying consistent modern styling without breaking existing functionality.

**Acceptance Scenarios**:

1. **Given** a user opens any form page, **When** the page loads, **Then** all input fields display with modern styling (rounded corners, proper padding, focus ring, consistent height)
2. **Given** a user fills in a form field, **When** they click into an input, **Then** a visible focus indicator appears
3. **Given** a user submits a form with validation errors, **When** errors are displayed, **Then** error messages are styled clearly with appropriate color and spacing
4. **Given** a form has required fields, **When** the user views the form, **Then** required indicators are visually distinct and consistent

---

### User Story 2 - Modern Button Styling (Priority: P1)

As a platform user, I want all buttons (primary actions, secondary actions, danger actions, toolbar buttons) to have a modern, consistent appearance with hover/active states, so that I can easily identify and interact with actions.

**Why this priority**: Buttons appear on every page alongside forms. Combined with form styling, this covers the two most visible UI elements users interact with daily.

**Independent Test**: Can be tested by visiting any page with buttons (list pages with action buttons, form submit buttons, toolbar buttons) and verifying consistent modern styling.

**Acceptance Scenarios**:

1. **Given** a user views any page, **When** buttons are rendered, **Then** primary, secondary, and danger buttons have distinct, modern styles with consistent sizing
2. **Given** a user hovers over a button, **When** the hover state activates, **Then** a visible visual change occurs (color shift, shadow, etc.)
3. **Given** a page has a toolbar with multiple action buttons, **When** rendered, **Then** buttons are evenly spaced with consistent alignment

---

### User Story 3 - Table and List Modernization (Priority: P2)

As a platform user, I want data tables and lists to have clean borders, alternating row colors, proper header styling, and readable spacing, so that I can scan and find information quickly.

**Why this priority**: Tables are the second most common UI pattern after forms. List pages (admin list, cluster list, role list, etc.) are the entry point for most workflows.

**Independent Test**: Can be tested by visiting any list page and verifying table styling is modern and readable.

**Acceptance Scenarios**:

1. **Given** a user opens a list page, **When** the table renders, **Then** headers are visually distinct from data rows with clear borders and spacing
2. **Given** a table has multiple rows, **When** rendered, **Then** alternating row backgrounds improve readability
3. **Given** a table has action buttons in a column, **When** rendered, **Then** action buttons are visually grouped and consistent

---

### User Story 4 - Layout and Navigation Polish (Priority: P2)

As a platform user, I want the sidebar navigation, header, and page layout to feel modern with proper spacing, subtle shadows, and smooth transitions, so that the overall experience feels cohesive and professional.

**Why this priority**: Layout frames every page. A polished layout elevates the perception of the entire application even before individual pages are updated.

**Independent Test**: Can be tested by navigating between different modules and verifying the layout chrome (sidebar, header, content area) looks modern and consistent.

**Acceptance Scenarios**:

1. **Given** a user logs in, **When** the main layout loads, **Then** the sidebar has modern styling with clear section grouping and hover states
2. **Given** a user navigates between pages, **When** content loads, **Then** transitions are smooth and content area has appropriate padding and max-width
3. **Given** a user is on mobile or narrow screen, **When** the layout renders, **Then** the layout adapts responsively

---

### User Story 5 - Login Page Modernization (Priority: P3)

As a user visiting the platform for the first time, I want the login page to look modern and professional with clean input fields, a clear call-to-action button, and proper visual hierarchy, so that I feel confident using the platform.

**Why this priority**: The login page is the first impression. While important, it is a single page and less frequently visited than working pages.

**Independent Test**: Can be tested by visiting the login page and verifying modern styling.

**Acceptance Scenarios**:

1. **Given** a user visits the login page, **When** the page loads, **Then** login inputs and buttons display with modern, clean styling
2. **Given** a user enters credentials, **When** they click login, **Then** the button shows a loading state

---

### Edge Cases

- What happens when Layui JavaScript components (date pickers, dropdowns, modals) conflict with new CSS? The migration must preserve all existing Layui JS functionality while overriding only visual styles.
- What happens on pages that use both Layui v2.6 and v2.13? Both versions' styles must be overridden consistently.
- What happens when custom inline styles exist in templates? Inline styles should be preserved unless they directly conflict with the new design system.

## Requirements

### Functional Requirements

- **FR-001**: System MUST apply a unified modern design system to all form elements (inputs, selects, textareas, checkboxes, radio buttons) across all 351 HTML templates
- **FR-002**: System MUST apply a unified modern design system to all button types (primary, secondary, danger, disabled, loading states) across all pages
- **FR-003**: System MUST preserve all existing Layui JavaScript functionality (form submission, table rendering, layer popups, tree components) after styling changes
- **FR-004**: System MUST introduce Tailwind CSS as a utility framework loaded alongside existing Layui CSS (not replacing it)
- **FR-005**: System MUST replace all jQuery AJAX calls with HTMX across all 351 HTML templates, fully migrating dynamic interactions to HTMX
- **FR-006**: System MUST maintain responsive behavior for mobile and desktop viewports
- **FR-007**: System MUST provide a consistent color palette, typography scale, and spacing system applied via Tailwind utilities and custom CSS overrides
- **FR-008**: System MUST style data tables with modern borders, alternating rows, header differentiation, and action button alignment
- **FR-009**: System MUST style the main layout (sidebar, header, content area) with modern spacing, shadows, and transitions
- **FR-010**: System MUST style the login pages (login_code.html, login_telcode.html) with a modern, clean appearance

### Key Entities

- **Design Token**: Color palette, spacing scale, typography, border-radius, shadows used consistently across all pages
- **Component Style**: Visual treatment for forms, buttons, tables, cards, modals, navigation elements
- **Page Template**: Each HTML template that needs styling updates (351 total, grouped by module: RBAC, CI/CD, xkube, wiki, etc.)

## Success Criteria

### Measurable Outcomes

- **SC-001**: All form inputs across the platform display consistent modern styling (rounded corners, proper padding, focus states) — verified by sampling at least one page from each module
- **SC-002**: All buttons across the platform display consistent modern styling with distinct primary/secondary/danger variants — verified by sampling pages from each module
- **SC-003**: Zero functional regressions — all existing form submissions, table operations, and popup interactions continue to work after styling changes
- **SC-004**: The platform renders correctly on both desktop (1920px+) and mobile (375px+) viewports
- **SC-005**: Login page presents a modern, professional first impression consistent with the new design system

## Assumptions

- The Beego backend continues to serve HTML templates; no backend architecture changes are required
- Layui JavaScript modules continue to provide component functionality; only visual styling is replaced
- Tailwind CSS is loaded via CDN for simplicity; a build step is not required for this phase
- HTMX is loaded via CDN and fully replaces all jQuery AJAX patterns across all pages
- Existing Layui CSS files are kept but overridden by a new custom stylesheet layer
- The migration can be done incrementally — module by module — rather than all at once
- Browser support targets modern browsers (Chrome, Firefox, Safari, Edge latest 2 versions)
