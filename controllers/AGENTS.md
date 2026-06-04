<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# controllers

## Purpose
HTTP request handlers implementing the business logic for all Kubernetes resource management operations. Each controller corresponds to one K8s resource type or feature area. Controllers parse requests, call model functions, and return JSON responses.

## Key Files
| File | Description |
|------|-------------|
| `deploy.go` | Deployment management — CRUD, rollback, restart, clone, scale, YAML view/modify, labels, image, probes, affinity, tolerations (largest controller) |
| `statefulset.go` | StatefulSet management — similar scope to deploy.go for StatefulSets |
| `pod.go` | Pod operations — list, detail, logs, YAML, delete, terminal exec |
| `pod_terminal_websocket.go` | WebSocket-based pod terminal (exec into container) via SockJS |
| `node.go` | Node management — list, detail, YAML, drain, cordon/uncordon, labels, taints |
| `namespace.go` | Namespace CRUD, YAML, resource limits |
| `service.go` | Service management — create, list, detail, YAML |
| `ingress.go` | Ingress management (networking.k8s.io/v1) |
| `ingress_v1beta1.go` | Ingress management (extensions/v1beta1) for older clusters |
| `configmap.go` | ConfigMap CRUD and YAML operations |
| `secret.go` | Secret CRUD and YAML operations |
| `cicd.go` | CI/CD pipeline management — integration with Jenkins |
| `jenkins.go` | Jenkins job operations via gojenkins library |
| `aliyun_flow.go` | Aliyun DevOps pipeline integration |
| `hpa.go` / `hpa_v2beta2.go` | HorizontalPodAutoscaler management (v2 and v2beta2) |
| `cronjob.go` / `cronjob_betav1.go` | CronJob management (batch/v1 and batch/v1beta1) |
| `job.go` | Job management |
| `gateway.go` / `gatewayClass.go` | Gateway API resources |
| `httproute.go` / `grpcroute.go` / `tcproute.go` / `udproute.go` | Gateway API route types |
| `cluster.go` | Cluster management — add, edit, delete, list, count |
| `wiki.go` | Wiki/knowledge base management |
| `backup.go` | YAML backup and restore |
| `search.go` | Full-text search across K8s resources |
| `public_intf.go` | Public APIs — cache clear, image update callback, scheduled restarts, health check |
| `metrics.go` | Resource metrics (CPU/memory) via K8s Metrics API |
| `clone.go` | Resource cloning between namespaces/clusters |
| `favorite.go` | User favorites/bookmarks |
| `apply_yaml.go` | Raw YAML apply to cluster |
| `roles.go` / `clusterRoles.go` / `roleBinding.go` / `clusterRoleBinding.go` / `serviceAccounts.go` | RBAC resource management |
| `pv.go` / `pvc.go` | PersistentVolume and PersistentVolumeClaim management |
| `storageclass.go` | StorageClass management |
| `cdr.go` | CustomResourceDefinition management |
| `event.go` | K8s event listing |
| `appname.go` | Application name management (organizational entity) |

## For AI Agents

### Working In This Directory
- All controllers are in package `controllers`
- Each controller struct embeds `beego.Controller`
- Standard method pattern: `Prepare()` extracts cluster ID, then `Post()`/`Get()` handles the specific action
- The cluster ID is typically passed as a query parameter or form field
- All K8s operations go through models in the `models` package, not directly through client-go
- Return pattern: set `controller.Data["json"]` to result, call `controller.ServeJSON()`

### Common Patterns
- `deploy.go` is the most complex controller (~52KB) — it handles the full Deployment lifecycle
- Version-aware APIs: some resources have dual controllers for different K8s API versions (e.g., `hpa.go` vs `hpa_v2beta2.go`, `ingress.go` vs `ingress_v1beta1.go`)
- Error responses use HTTP status codes set via `controller.Ctx.Output.Status`

### Testing Requirements
- No unit tests exist; testing is manual via the web UI

## Dependencies

### Internal
- `models/` - All K8s and database operations
- `common/` - K8s client creation, Redis, MySQL helpers
- `xadmin/` - RBAC authentication context

### External
- `github.com/beego/beego/v2/server/web` - Beego controller base
- `k8s.io/client-go` - Kubernetes API types (via models)
- `github.com/gorilla/websocket` - WebSocket for pod terminal
- `gopkg.in/igm/sockjs-go.v2` - SockJS for terminal transport

<!-- MANUAL: -->
