<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# models

## Purpose
Data access layer containing all Kubernetes API interactions and database operations. Each model file corresponds to a K8s resource type and provides functions for CRUD, listing, YAML manipulation, and resource-specific operations.

## Key Files
| File | Description |
|------|-------------|
| `deploy_model.go` | Deployment operations — largest model (~100KB); create, update, list, rollback, restart, clone, scale, affinity, probes, tolerations |
| `statefulset_model.go` | StatefulSet operations (~61KB); full lifecycle management |
| `pod_model.go` | Pod listing, detail, logs, YAML, deletion |
| `pod_exec_model.go` | Pod exec/terminal operations |
| `node_model.go` | Node operations — list, detail, drain, cordon, labels, taints, metrics |
| `namespace_model.go` | Namespace CRUD, resource limits |
| `service_model.go` | Service operations |
| `configmap_model.go` | ConfigMap CRUD and YAML |
| `secret_model.go` | Secret CRUD with base64 encoding/decoding |
| `ingress_model.go` / `ingress_model_v1beta1.go` | Ingress operations for two API versions |
| `cluster_model.go` | Cluster management — stores kubeconfig, tokens, versions in MySQL |
| `cicd_model.go` | CI/CD pipeline data and Jenkins integration |
| `cronjob_model.go` / `cronjob_model_beta1.go` | CronJob operations for two API versions |
| `hpa_model_v2.go` / `hpa_model_v2beta2.go` | HPA operations for two API versions |
| `gateway_model.go` / `gatewayClass_model.go` | Gateway API operations |
| `httproute_model.go` / `grpcroute_model.go` / `tcproute_model.go` / `udproute_model.go` | Gateway API route operations |
| `metrics_model.go` | K8s Metrics API for pod/node CPU/memory |
| `search_model.go` | Full-text search indexing |
| `wiki_model.go` | Wiki/knowledge base storage |
| `backup_model.go` | YAML backup to database |
| `clone_model.go` | Resource cloning logic |
| `applyYaml_model.go` | Raw YAML apply/parse |
| `jenkins_model.go` | Jenkins API integration |
| `events_model.go` | K8s event queries |
| `pv_model.go` / `pvc_model.go` / `storageclass_model.go` | Storage resource operations |
| `roles_model.go` / `clusterRoles_model.go` / `roleBinding_model.go` / `clusterRoleBinding_model.go` / `serviceAccounts_model.go` | K8s RBAC resource operations |
| `cdr_model.go` | CustomResourceDefinition operations |
| `favorite_model.go` | User favorites storage |
| `appname_model.go` | Application name database operations |
| `backup_model.go` | YAML backup operations |
| `public_model.go` | Shared model utilities |

## For AI Agents

### Working In This Directory
- All models are in package `models`
- Functions are typically standalone (not methods on structs) — they accept cluster ID and parameters, create a K8s client internally, and return results
- K8s clients are created via `common.ClientSet(clusterid)` or `common.DynamicClient(clusterid)` at the start of each function
- Beego ORM is used for MySQL operations via `orm.NewOrm()`
- Many functions return `map[string]interface{}` or `[]map[string]interface{}` for JSON serialization

### Common Patterns
- Large model files (deploy, statefulset) mirror the full complexity of the corresponding K8s resource
- YAML operations use `k8s.io/apimachinery/pkg/util/yaml` for parsing and `sigs.k8s.io/yaml` for marshaling
- Version-aware models exist for resources with multiple API versions (ingress, hpa, cronjob)
- Error handling returns error strings rather than structured error types

## Dependencies

### Internal
- `common/` - K8s client creation (`ClientSet`, `DynamicClient`), Redis cache, MySQL helpers

### External
- `k8s.io/client-go` - Kubernetes typed and dynamic clients
- `k8s.io/api` - K8s resource types
- `k8s.io/apimachinery` - YAML parsing, JSON marshaling
- `sigs.k8s.io/gateway-api` - Gateway API types
- `github.com/beego/beego/v2/client/orm` - MySQL ORM

<!-- MANUAL: -->
