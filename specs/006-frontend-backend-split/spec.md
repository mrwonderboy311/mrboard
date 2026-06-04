# Feature Specification: Frontend-Backend Separation

**Feature Branch**: `006-frontend-backend-split`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "项目拆分为前后端分离架构"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Independent Frontend Development (Priority: P1)

As a frontend developer, I want to develop and test the UI independently without needing the Go backend running, so that I can iterate on UI changes quickly without recompiling the server.

Currently, every HTML change requires the Go binary to serve templates. Frontend developers must run the full backend (Go + MySQL + Redis) just to see UI changes. After separation, the React frontend runs via Vite dev server with hot-reload and API proxy to the backend.

**Why this priority**: This is the foundational change. Without separating the frontend into its own deployable unit, none of the other stories are possible. It also delivers immediate developer productivity gains.

**Independent Test**: Can be fully tested by starting the frontend dev server independently, loading any page (e.g., cluster list), and verifying it renders correctly with mock or proxied API data.

**Acceptance Scenarios**:

1. **Given** the frontend dev server is running standalone, **When** a developer modifies a UI component, **Then** the change hot-reloads in the browser without backend restart
2. **Given** the frontend is configured with a backend API proxy, **When** a user navigates to any page, **Then** data is fetched from the backend API and rendered correctly
3. **Given** the backend is unavailable, **When** a user loads the frontend, **Then** the UI shell loads and shows an appropriate connection error state

---

### User Story 2 - Pure REST API Backend (Priority: P2)

As a backend developer, I want the Go server to expose all functionality as REST APIs (no HTML template rendering), so that the backend is a clean, stateless API service that any client can consume.

Currently, Beego controllers mix API logic with HTML template rendering (`this.TplName = "..."`, `this.Data[...] = ...`). After separation, controllers return only JSON responses, and the template rendering layer is removed entirely.

**Why this priority**: This enables the backend to serve not just the web frontend but also mobile apps, CLI tools, or third-party integrations. It also simplifies testing — API endpoints can be tested without HTML parsing.

**Independent Test**: Can be tested by calling any API endpoint (e.g., `GET /cluster/list`) and verifying it returns structured JSON without any HTML template processing.

**Acceptance Scenarios**:

1. **Given** the backend API is running, **When** a client sends `GET /api/v1/clusters`, **Then** the response is JSON with proper status codes, no HTML template processing
2. **Given** a controller previously rendered HTML, **When** the same endpoint is called after separation, **Then** it returns JSON with the same data that was previously injected into templates
3. **Given** the frontend is not deployed, **When** a user accesses any backend URL in a browser, **Then** the backend returns a JSON response (not an HTML page or template error)

---

### User Story 3 - Unified Frontend Build & Deploy (Priority: P3)

As a DevOps engineer, I want the frontend to have its own build pipeline (build, test, deploy) independent of the Go backend, so that frontend and backend can be deployed separately with independent release cycles.

Currently, the Dockerfile bundles Go binary + HTML views into a single image. After separation, there are two deployable artifacts: a frontend static bundle (served via Nginx/CDN) and a backend API container.

**Why this priority**: Independent deployment reduces risk — a frontend bug doesn't require redeploying the backend and vice versa. It also enables CDN distribution for static assets.

**Independent Test**: Can be tested by building the frontend independently (`npm run build`), deploying the static files to Nginx, and verifying all pages load and function correctly against a running backend API.

**Acceptance Scenarios**:

1. **Given** the frontend build pipeline runs, **When** it completes, **Then** it produces a static bundle (HTML/JS/CSS) that can be served by any web server
2. **Given** the backend container is deployed independently, **When** the frontend bundle is deployed to a different host, **Then** the frontend functions correctly by calling backend APIs
3. **Given** a frontend-only change, **When** it is deployed, **Then** the backend container does not need to be rebuilt or restarted

---

### User Story 4 - Seamless Migration (Priority: P4)

As a platform user, I want the separated application to look and function identically to the current monolithic version, so that no workflows are disrupted during the migration.

The current system has 355 pages covering cluster management, RBAC, CI/CD, wiki, and more. After separation, every page must render the same data, every form must submit correctly, and every action must work as before.

**Why this priority**: User-facing regression is the biggest risk. The migration must be invisible to end users.

**Independent Test**: Can be tested by comparing the separated application side-by-side with the current monolithic version, verifying that all 355 pages render identically and all CRUD operations succeed.

**Acceptance Scenarios**:

1. **Given** the separated application is running, **When** a user logs in and navigates to any page, **Then** the page renders identically to the monolithic version
2. **Given** the separated application is running, **When** a user performs any CRUD operation (create/edit/delete cluster, deploy, etc.), **Then** the operation succeeds and the result is displayed correctly
3. **Given** the session expires, **When** a user performs an action, **Then** the user is redirected to the login page with a clear message

---

### Edge Cases

- What happens in development when frontend dev server and backend run on different ports? (Dev proxy configuration required, production uses same-origin Nginx)
- What happens when the backend API response format changes? (API versioning needed)
- What happens to Beego template functions (e.g., `<<< .xxx >>>`) used in 355 HTML files? (Must be replaced with frontend-side data binding)
- What happens to server-side session management? (Must migrate to token-based auth or maintain session via API)
- What happens to WebSocket endpoints (e.g., terminal/exec)? (Must be proxied correctly through the frontend dev server and production Nginx)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST serve the frontend as a standalone web application (static files) independent of the Go backend
- **FR-002**: System MUST expose all backend functionality as REST API endpoints returning JSON
- **FR-003**: System MUST remove all HTML template rendering from Go controllers (no `this.TplName`, no `this.Data` template injection)
- **FR-004**: System MUST rewrite all 355 HTML pages as React components using shadcn/ui + Tailwind CSS, replacing Beego template syntax with API-driven data fetching
- **FR-005**: System MUST maintain the existing Redis-backed Cookie session authentication — React frontend uses `fetch({credentials:'include'})` to send/receive session cookies
- **FR-006**: System MUST serve frontend and backend from the same origin via Nginx reverse proxy (`/` → static files, `/api/` → backend), eliminating the need for CORS configuration
- **FR-007**: System MUST proxy WebSocket connections (terminal, exec, log streaming) from the frontend to the backend
- **FR-008**: System MUST provide a frontend development server with hot-reload and API proxy configuration
- **FR-009**: System MUST produce a production frontend bundle (HTML/JS/CSS) deployable to Nginx or CDN
- **FR-010**: System MUST maintain all existing API paths unchanged — the React frontend calls the same paths the Beego templates used
- **FR-011**: System MUST handle `/public/login` and `/public/logout` as API endpoints returning JSON — React login page submits credentials via fetch and receives session Cookie in response
- **FR-012**: System MUST preserve all existing RBAC permission checks in the backend API layer

### Key Entities

- **API Endpoint**: Each backend route, its HTTP method, request/response schema, and authentication requirements
- **Page Component**: Each of the 355 HTML pages, rewritten as React components with shadcn/ui and API data fetching
- **UI Component**: shadcn/ui components (Button, Table, Dialog, Form, etc.) used across pages
- **Static Asset**: CSS (Tailwind), JS (React bundle), images, fonts — built by Vite
- **Session/Token**: Authentication credential passed between frontend and backend

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 355 pages load and render correctly in the separated architecture, with identical visual output to the monolithic version
- **SC-002**: Frontend developers can start the UI dev server and see changes in under 3 seconds (hot-reload), without running the Go backend
- **SC-003**: The frontend production bundle builds in under 60 seconds and produces assets under 10MB total
- **SC-004**: All existing CRUD operations (cluster management, deployments, RBAC, CI/CD, wiki) function correctly via API
- **SC-005**: The backend API container image is at least 30% smaller than the current monolithic image (no HTML/CSS/JS bundled)
- **SC-006**: A frontend-only deployment completes in under 2 minutes (no backend rebuild needed)
- **SC-007**: Zero regression in user-facing functionality — all existing workflows pass without modification

## Assumptions

- Frontend will use React + shadcn/ui + Tailwind CSS + sonner (toast) + lucide-react (icons), fully replacing Layui v2.13.3 + layuimini
- The 355 HTML files will be rewritten as React components with API data fetching via fetch/axios
- Vite will be used as the frontend build tool (dev server + production build)
- Session-based authentication (Redis-backed) will be preserved; token-based auth (JWT) is out of scope for this migration
- Backend API routes keep their existing paths (e.g., `/cluster/list`, `/deploy/get`), no `/api/v1/` prefix added. Nginx routes requests based on `Accept` header or path patterns to distinguish static files from API calls
- WebSocket endpoints (terminal exec, log streaming) will be proxied through the same Nginx reverse proxy (same-origin), with `/ws/` path routing to the backend
- MySQL schema and data remain unchanged — this is an architecture split, not a data migration
- The existing `xkube.js` and Layui-specific JavaScript will be replaced by React components with API calls via fetch/axios
- All 355 pages will be converted and shipped as a single release, but development proceeds module-by-module with verification at each step before the final cutover

## Clarifications

### Session 2026-06-01

- Q: 迁移策略（增量/一次性/混合）？ → A: 方案B - 一次性发布部署，但开发过程逐步进行并逐一验证每个模块的正确性
- Q: 生产环境部署方式（同域/跨域）？ → A: 方案A - 同域部署，Nginx 反向代理，`/` 指向前端静态文件，`/api/` 代理到后端。无需 CORS 配置
- Q: 前端技术栈？ → A: shadcn/ui + Tailwind CSS + sonner + lucide-react（基于 React），替换现有 Layui v2.13.3 + layuimini
- Q: API 路由策略？ → A: 保留现有路径不变（如 `/cluster/list`、`/deploy/get`），不添加 `/api/v1/` 前缀，减少迁移工作量
- Q: 登录认证流程？ → A: 保留 Cookie Session 机制不变，React 前端通过 `fetch({credentials:'include'})` 携带 Cookie，登录页作为 React 组件调用 `/public/login` API
