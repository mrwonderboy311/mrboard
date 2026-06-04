<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# routers

## Purpose
Central API route registration. Maps URL paths to controller methods for the entire application, including both K8s resource management and admin/RBAC routes.

## Key Files
| File | Description |
|------|-------------|
| `router.go` | Single file containing all route definitions (~40KB); calls `admin.Run()` to register RBAC routes, then registers all K8s resource routes |

## For AI Agents

### Working In This Directory
- All routes are registered in the `init()` function of `router.go`
- `admin.Run()` is called first, which triggers `xadmin.Router.go` to register admin routes
- Route pattern: `beego.Router("/xkube/{resource}/{version}/{action}", &controllers.XxxController{}, "*:Action")`
- HTTP method mapping: `"*:Action"` means all methods; `"get:Action"` or `"post:Action"` for specific methods
- Public routes (no auth) are under `/public/` and `/task/` prefixes
- K8s resource routes are under `/xkube/` prefix

### Common Patterns
- Each K8s resource typically has routes for: List, Detail, Create, Modify, Del, Yaml, ModifyByYaml
- Some resources have additional routes: Restart, RollBack, Clone, Labels, Image, Replicas, Strategy
- The file is organized by resource type with Chinese comments explaining each route group

## Dependencies

### Internal
- `controllers/` - All controller types referenced in route definitions
- `xadmin/` - Admin initialization via `admin.Run()`

<!-- MANUAL: -->
