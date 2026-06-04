<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# xkube

## Purpose
An open-source Kubernetes cluster management platform (v4.0) built with Go and the Beego web framework. Supports multi-cluster management, CI/CD pipelines, RBAC, and both PC and mobile interfaces. Provides a web UI for managing Deployments, StatefulSets, Services, Ingresses, ConfigMaps, Secrets, and other Kubernetes resources across multiple clusters.

## Key Files
| File | Description |
|------|-------------|
| `main.go` | Application entry point; initializes Beego, serves static frontend from `views/front/` |
| `go.mod` | Go module definition (Go 1.25.4) with dependencies on Beego v2, client-go, Redis, MySQL drivers |
| `go.sum` | Dependency checksums |
| `README.md` | Project documentation in Chinese with setup instructions |
| `CHANGELOG.txt` | Version history |
| `.gitignore` | Git ignore rules |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `common/` | Shared libraries: K8s client, MySQL, Redis, Aliyun SDK wrappers (see `common/AGENTS.md`) |
| `conf/` | Beego configuration (see `conf/AGENTS.md`) |
| `controllers/` | HTTP request handlers for K8s resource operations (see `controllers/AGENTS.md`) |
| `models/` | Data access layer for K8s API and database operations (see `models/AGENTS.md`) |
| `routers/` | API route definitions (see `routers/AGENTS.md`) |
| `views/` | Frontend static assets and HTML templates (see `views/AGENTS.md`) |
| `xadmin/` | RBAC admin backend: users, roles, groups, audit logs (see `xadmin/AGENTS.md`) |
| `docker-compose/` | Docker Compose deployment with MySQL database seed (see `docker-compose/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- This is a Go project using `github.com/beego/beego/v2` as the web framework
- The frontend is server-rendered HTML with jQuery and Layui (not a SPA)
- Build with: `go build main.go`
- Cross-compile for Linux: `GOOS=linux GOARCH=amd64 go build -o xkube main.go`
- Configuration is in `conf/app.conf` (INI format, Beego convention)

### Architecture
- **MVC pattern**: Controllers handle HTTP, Models talk to K8s API/DB, Views are HTML templates
- **Multi-cluster**: Each K8s cluster has a kubeconfig stored in MySQL (`xkb_cluster` table); clients are created per-request via `common.ClientSet(clusterid)`
- **Session**: Redis-backed sessions via Beego's session middleware
- **RBAC**: Custom RBAC system in `xadmin/` controls access to clusters, nodes, and features
- **API style**: REST-ish URLs like `/xkube/deploy/v1/List`, `/xkube/node/v1/Detail`

### Testing Requirements
- Run `go build` to verify compilation
- No test suite is present in the codebase

### Common Patterns
- Controllers embed `beego.Controller` and use `Prepare()`/`Post()` methods
- Models use Beego ORM for MySQL and raw `client-go` for K8s API calls
- K8s operations use dynamic client (`dynamic.Client`) or typed clientset from `common.ClientSet()`
- API responses are JSON via `controller.Data["json"]` + `controller.ServeJSON()`
- Chinese comments throughout; bilingual comments added in newer code

## Dependencies

### External
- `github.com/beego/beego/v2` v2.3.8 - Web framework
- `k8s.io/client-go` v0.34.1 - Kubernetes API client
- `k8s.io/api` v0.34.1 - Kubernetes API types
- `k8s.io/apimachinery` v0.34.1 - Kubernetes API machinery
- `sigs.k8s.io/gateway-api` v1.4.0 - Gateway API support
- `github.com/go-redis/redis/v9` - Redis client for caching/sessions
- `github.com/go-sql-driver/mysql` - MySQL driver
- `github.com/mattn/go-sqlite3` - SQLite driver
- `github.com/bndr/gojenkins` - Jenkins API client
- `github.com/alibabacloud-go/devops-20210625` - Aliyun DevOps API
- `github.com/tidwall/gjson` - JSON parsing

<!-- MANUAL: Any manually added notes below this line are preserved on regeneration -->
