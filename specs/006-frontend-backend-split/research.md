# Research: Frontend-Backend Separation

**Branch**: `006-frontend-backend-split` | **Date**: 2026-06-01

## Research Tasks

### R1: React + shadcn/ui + Vite Project Setup

**Decision**: Use Vite with React + TypeScript template, shadcn/ui for component library

**Rationale**:
- Vite: Fastest dev server with native ESM, instant hot-reload (< 1s), optimized Rollup production builds
- shadcn/ui: Copy-paste components (not a dependency), built on Radix UI + Tailwind CSS, fully customizable
- TypeScript: Type safety for 355 pages worth of API responses and component props

**Alternatives considered**:
- Next.js: Overkill — no SSR needed, adds complexity for a purely client-side app
- CRA (Create React App): Deprecated, slow builds
- Webpack: More config, slower dev server than Vite

**Setup steps**:
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npx shadcn@latest init
```

### R2: Tailwind CSS v4 Integration

**Decision**: Tailwind CSS v4 with Vite plugin

**Rationale**:
- v4 uses CSS-first configuration (no tailwind.config.ts needed for basic setup)
- Native Vite integration via `@tailwindcss/vite`
- shadcn/ui v2 supports Tailwind v4

**Alternatives considered**:
- Tailwind v3: More mature but requires JS config file
- CSS Modules: More manual work for 355 pages

### R3: API Client Pattern

**Decision**: Custom `fetch` wrapper with credentials, error handling, and type inference

**Rationale**:
- `fetch({credentials: 'include'})` for Cookie session (FR-005)
- Centralized error handling (session expiry → redirect to login)
- TypeScript generics for response typing
- No external dependency (axios not needed)

**Pattern**:
```typescript
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {'Content-Type': 'application/json', ...options?.headers},
  });
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

**Alternatives considered**:
- axios: Extra dependency, larger bundle, not needed for simple use case
- SWR/React Query: Good for caching but adds complexity; can be added later if needed

### R4: Routing Strategy

**Decision**: React Router v6 with file-based routing structure

**Rationale**:
- Maps naturally to the existing 355 pages organized by module (cluster, rbac, cicd, wiki, etc.)
- Nested layouts for sidebar + header
- Lazy loading for code splitting per module

**Route structure**:
```
/login → Login page
/ → MainLayout
  /cluster/list → ClusterList
  /cluster/edit/:id → ClusterEdit
  /deploy/list → DeployList
  /rbac/adminList → AdminList
  ...
```

**Alternatives considered**:
- TanStack Router: Type-safe but more complex setup
- File-based routing (Next.js style): Requires framework overhead

### R5: Sidebar & Layout Migration

**Decision**: Custom sidebar component using shadcn/ui Sheet/NavigationMenu + Tailwind

**Rationale**:
- Current sidebar is layuimini's dark gradient sidebar
- shadcn/ui doesn't have a pre-built sidebar, but composable primitives (Sheet, NavigationMenu, Collapsible) work well
- Can replicate the dark gradient design with Tailwind classes

**Layout structure**:
- `MainLayout`: Sidebar (fixed left) + Header (fixed top) + Content area (scrollable)
- `AuthLayout`: Centered card for login pages

### R6: WebSocket Proxy Configuration

**Decision**: Nginx `proxy_pass` for WebSocket paths (`/ws/`)

**Rationale**:
- Same-origin proxy eliminates CORS
- Nginx supports WebSocket upgrade with `proxy_set_header Upgrade $http_upgrade`
- Existing WebSocket endpoints (terminal exec, log streaming) stay unchanged

**Nginx config snippet**:
```nginx
location /ws/ {
    proxy_pass http://backend:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### R7: Beego Template Rendering Removal

**Decision**: Modify controllers to return JSON instead of rendering templates

**Rationale**:
- Controllers currently do: `this.Data["xxx"] = result; this.TplName = "page.html"`
- Change to: `this.Data["json"] = result` (Beego's JSON response)
- Models and business logic stay unchanged

**Scope**: ~49 controllers need modification. Each controller method that renders HTML needs to be converted to return JSON. This is mechanical work — the data is already prepared, just the output format changes.

### R8: Session Expiry Handling

**Decision**: React frontend checks API response status; 401 → redirect to login

**Rationale**:
- Beego session middleware returns 401 when session expires
- The `api()` wrapper catches 401 and redirects to `/login`
- No changes needed to backend session management

**User-facing behavior**: User sees a brief "session expired" toast (sonner) then gets redirected to login page.
