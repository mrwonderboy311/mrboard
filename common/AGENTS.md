<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# common

## Purpose
Shared library package providing foundational utilities used across the application: Kubernetes client initialization, MySQL database helpers, Redis client management, and Aliyun SDK integration.

## Key Files
| File | Description |
|------|-------------|
| `k8sclient.go` | Creates K8s `clientset` and `dynamic.Client` from kubeconfig stored in the database; functions `ClientSet()` and `DynamicClient()` |
| `mysql_lib.go` | MySQL ORM helpers; caches cluster kubeconfig/token/version in memory maps; `GetKubeConfigByClusterId()` retrieves kubeconfig strings |
| `redis_lib.go` | Redis client initialization from `app.conf`; exposes global `Rdb` client and `Ctx`; provides cache get/set/delete helpers |
| `aliyun_client.go` | Aliyun DevOps API client factory; `AliClient()` creates authenticated devops client using stored AK/SK |

## For AI Agents

### Working In This Directory
- All files are in package `common`
- `ClusterMap`, `ClusterTokenMap`, `ClusterVersionMap` are in-memory caches for cluster metadata — they are populated lazily from MySQL
- The `Rdb` global Redis client is initialized in `init()` from Beego config — avoid calling Redis before `main()` starts
- `ClientSet()` panics if the kubeconfig is invalid — controllers should catch this upstream

### Common Patterns
- Database queries use Beego ORM (`orm.NewOrm()`) with raw SQL strings
- K8s clients are created per-call using `clientcmd.NewClientConfigFromBytes()` — no connection pooling
- Caching pattern: check in-memory map first, fall back to MySQL query, store result in map

## Dependencies

### Internal
- `conf/app.conf` - Configuration values for DB, Redis, Aliyun credentials

### External
- `k8s.io/client-go` - Kubernetes clientset, dynamic client, rest client
- `github.com/beego/beego/v2/client/orm` - ORM for MySQL queries
- `github.com/go-redis/redis/v9` - Redis operations
- `github.com/alibabacloud-go/devops-20210625` - Aliyun DevOps API

<!-- MANUAL: -->
