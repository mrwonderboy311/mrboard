<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# rbac

## Purpose
Admin controllers implementing HTTP handlers for authentication, user management, role-based access control, node/cluster authorization, group management, and audit log viewing.

## Key Files
| File | Description |
|------|-------------|
| `public.go` | Authentication controller — login (web + app), logout, password change, user info, SMS verification code, health check, session validation |
| `user.go` | User CRUD — add, update, delete, list users; lock/unlock accounts |
| `role.go` | Role management — CRUD roles, assign roles to users/nodes, manage role permissions |
| `node.go` | RBAC node management — add/edit/delete permission nodes, tree structure for menu/feature access control |
| `cluster.go` | Cluster authorization — assign cluster access to users, list user's authorized clusters |
| `group.go` | User group management — CRUD groups for organizing users |
| `audit.go` | Audit log controller — list security/audit events |
| `common.go` | Shared controller utilities and base types |
| `lockuser.go` | Locked user/IP management — view and unlock locked accounts |
| `check.go` | Permission checking helpers |

## For AI Agents

### Working In This Directory
- All controllers are in package `rbac`
- Controllers embed `beego.Controller` and implement `Post()`/`Get()` methods
- `MainController` handles auth-related endpoints (login, logout, password)
- Login creates a session with user info; logout destroys it
- App login uses a separate endpoint (`/public/appLogin`) with different session handling
- SMS verification is optional (controlled by `mobile_verify_code` config)

### Common Patterns
- User passwords are hashed before storage
- Login failures are tracked per-user and per-IP with configurable lockout
- Role permissions are stored as a tree (node-based) with parent-child relationships
- Cluster authorization is a separate concept from role permissions — users need both

## Dependencies

### Internal
- `xadmin/src/models/` - All database operations
- `xadmin/src/lib/` - Utility functions
- `common/` - Aliyun SMS client

### External
- `github.com/beego/beego/v2/server/web` - Beego controller base

<!-- MANUAL: -->
