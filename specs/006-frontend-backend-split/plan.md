# Implementation Plan: Frontend-Backend Separation

**Branch**: `006-frontend-backend-split` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-frontend-backend-split/spec.md`

## Summary

将 xkube 从 Go/Beego 单体应用拆分为前后端分离架构。后端保留 Go/Beego 作为纯 API 服务（移除模板渲染），前端使用 React + shadcn/ui + Tailwind CSS + Vite 重写全部 355 个页面。生产环境通过 Nginx 同域反向代理部署（`/` → 静态文件，其他路径 → 后端 API）。保留现有 Cookie Session 认证机制和 API 路径不变。

## Technical Context

**Language/Version**: Go 1.25.4 (backend) + TypeScript + React 18+ (frontend)

**Primary Dependencies**: Beego v2 (backend), React, shadcn/ui, Tailwind CSS v4, Vite, sonner, lucide-react (frontend)

**Storage**: MySQL 8.0 (Beego ORM) + Redis (sessions)

**Testing**: Manual via web UI — no automated test suite exists

**Target Platform**: Linux server (K8s deployment) + modern web browsers

**Project Type**: web-service (Go API backend) + SPA (React frontend)

**Performance Goals**: Hot-reload < 3s (SC-002), production build < 60s / < 10MB (SC-003)

**Constraints**: Zero existing test coverage, 355 pages to migrate, multi-cluster K8s operations must not break

**Scale/Scope**: ~49 controllers, ~48 models, 355 HTML pages, 7 modules (cluster, RBAC, CI/CD, wiki, search, favorites, app management)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ PASS | React SPA with direct API calls is simpler than Beego template + embedded JS |
| II. Surgical Changes | ✅ PASS | Backend changes limited to removing template rendering; frontend is greenfield |
| III. Multi-Cluster Safety | ✅ PASS | No K8s client changes — API layer unchanged |
| IV. RBAC Enforcement | ✅ PASS | Existing RBAC middleware stays in backend; frontend respects session auth |
| V. Backward Compatibility | ⚠️ JUSTIFIED VIOLATION | API response format may change slightly (JSON-only vs template-injected data). Existing paths preserved per clarification. |

**Constitution Violation — Frontend Architecture**:
- **Violation**: Constitution states "Frontend: Server-rendered HTML with Layui and jQuery — NOT a SPA"
- **Justification**: User explicitly chose React + shadcn/ui in clarification Q3. This is a deliberate architectural decision, not an oversight.
- **Mitigation**: All existing API paths preserved (FR-010), session auth preserved (FR-005), RBAC unchanged (FR-012)

## Project Structure

### Documentation (this feature)

```text
specs/006-frontend-backend-split/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
# Backend (existing Go/Beego — modified)
controllers/            # Remove template rendering, keep JSON API responses
models/                 # Unchanged
routers/router.go       # Add JSON-only routes for pages that only rendered HTML
common/                 # Unchanged (K8s client, RBAC middleware)
conf/                   # Unchanged

# Frontend (new React app)
frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── index.html
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Router + layout
│   ├── components/
│   │   └── ui/                   # shadcn/ui components
│   ├── layouts/
│   │   ├── MainLayout.tsx        # Sidebar + header + content
│   │   └── AuthLayout.tsx        # Login page layout
│   ├── pages/
│   │   ├── cluster/              # Cluster management pages
│   │   ├── rbac/                 # RBAC pages
│   │   ├── cicd/                 # CI/CD pages
│   │   ├── wiki/                 # Wiki pages
│   │   ├── search/               # Search pages
│   │   ├── app/                  # App management pages
│   │   └── login/                # Login page
│   ├── hooks/
│   │   └── useApi.ts             # API fetching hook
│   ├── lib/
│   │   ├── api.ts                # API client (fetch wrapper)
│   │   └── utils.ts              # Utility functions
│   └── types/
│       └── index.ts              # TypeScript type definitions
└── tests/                        # (future)

# Deployment
deploy/
├── nginx.conf                    # Nginx config for same-origin proxy
├── k8s-frontend.yaml             # Frontend K8s deployment (Nginx + static files)
└── k8s.yaml                      # Backend K8s deployment (existing)
```

**Structure Decision**: Web application (Option 2) — separate `frontend/` directory for the React app, existing Go backend stays at repo root. Frontend is a self-contained Vite project.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Frontend is SPA (constitution says "NOT a SPA") | User chose React + shadcn/ui in clarification | Layui + jQuery is end-of-life, team wants modern stack |
| 355 pages to rewrite | Full platform migration required | Incremental migration was considered but user chose single release with step-by-step verification |
