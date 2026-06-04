<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# src

## Purpose
Core source code for the RBAC admin system. Contains the RBAC middleware, utility libraries, data models for users/roles/groups/audit, and controller implementations for admin endpoints.

## Key Files
| File | Description |
|------|-------------|
| `rbac.go` | RBAC middleware — intercepts requests, checks authentication, validates permissions against the node tree, handles login bypass for excluded packages |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `rbac/` | Admin controllers — login, user CRUD, role management, node management, cluster authorization, groups, audit (see `rbac/AGENTS.md`) |
| `models/` | Database models — users, roles, groups, audit logs, SMS, cluster authorization (see `models/AGENTS.md`) |
| `lib/` | Utility functions — JSON helpers, password hashing, counter management (see `lib/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- `rbac.go` is the critical RBAC middleware — it runs on every request except excluded packages
- Auth flow: check session -> verify user exists -> check node permissions -> allow/deny
- The `not_auth_package` config defines URL prefixes that skip auth (e.g., `public`, `index`, `task`)
- `rbac_admin_user` config defines the superadmin user that bypasses all checks

### Common Patterns
- Permission checking uses a tree-based node structure stored in the database
- Audit logging records user actions with timestamps and IP addresses
- Login failure tracking uses Redis with configurable lockout thresholds

## Dependencies

### Internal
- `xadmin/src/models/` - User, role, node, and audit data access
- `xadmin/src/lib/` - Utility functions
- `conf/app.conf` - RBAC configuration parameters

### External
- `github.com/beego/beego/v2` - Web framework middleware

<!-- MANUAL: -->
