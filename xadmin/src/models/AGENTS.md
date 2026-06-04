<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# models

## Purpose
Database models for the RBAC admin system. Handles all MySQL operations for users, roles, groups, RBAC nodes (permission tree), audit logs, cluster authorizations, and SMS verification.

## Key Files
| File | Description |
|------|-------------|
| `UserModel.go` | User CRUD, authentication, password hashing, login failure tracking, user locking |
| `RoleModel.go` | Role CRUD, role-to-user assignments, role-to-node (permission) assignments |
| `NodeModel.go` | RBAC permission node tree — hierarchical menu/feature access control |
| `GroupModel.go` | User group management |
| `ClusterModel.go` | Cluster authorization — maps users to accessible clusters |
| `AuditModel.go` | Audit/security log recording and querying |
| `AdminInit.go` | Database schema sync (`SyncdbInfo()`) — creates/updates tables on startup |
| `smsModel.go` | SMS verification code storage and validation |

## For AI Agents

### Working In This Directory
- All models are in package `models`
- `Connect()` initializes the Beego ORM database connection using config from `app.conf`
- `SyncdbInfo()` auto-creates tables — called with `-syncdb` CLI flag
- Table naming: `rbac_user`, `rbac_role`, `rbac_node`, `rbac_group`, `rbac_cluster`, `audit_log`, etc.
- Models use Beego ORM's `orm.NewOrm()` for all database operations

### Common Patterns
- User model handles both web and app authentication flows
- Role permissions are stored via a many-to-many relationship with permission nodes
- Node model implements a tree structure for hierarchical permissions
- Audit logging is called from RBAC middleware, not from individual controllers

## Dependencies

### Internal
- `conf/app.conf` - Database connection parameters

### External
- `github.com/beego/beego/v2/client/orm` - Beego ORM for MySQL

<!-- MANUAL: -->
