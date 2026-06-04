<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# xadmin

## Purpose
Backend administration and RBAC (Role-Based Access Control) system. Handles user authentication, authorization, role management, node/cluster access control, audit logging, and user groups. This is the administrative backbone of the platform.

## Key Files
| File | Description |
|------|-------------|
| `admin.go` | Package entry point — `Run()` initializes DB connection, registers routes, sets up MIME types and template functions |
| `Router.go` | Admin route definitions for login, user management, role management, node management, cluster authorization, groups, and audit logs |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | Core source code — RBAC logic, models, and utilities (see `src/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Package name is `admin`
- `Run()` is called from `routers/router.go` during app initialization
- The `-syncdb` CLI flag triggers database schema sync and exits
- `InitCnt()` initializes counters (login failure tracking)
- `models.Connect()` sets up the database connection

### Common Patterns
- Routes use the same Beego pattern as the main app
- Auth flow: login -> session creation -> RBAC check on each request via middleware

## Dependencies

### Internal
- `xadmin/src/rbac/` - Controller implementations
- `xadmin/src/models/` - Database models
- `xadmin/src/lib/` - Utility functions

### External
- `github.com/beego/beego/v2/server/web` - Beego framework

<!-- MANUAL: -->
