# MRBoard

A multi-cluster Kubernetes management platform providing unified operations for cluster resources, log exploration, distributed tracing, CI/CD, and monitoring metrics.

## Features

### K8s Resource Management
- Multi-cluster onboarding and management
- Deployment, StatefulSet, DaemonSet, Job, CronJob management
- Pod, Node, Namespace, Service, Ingress, ConfigMap, Secret management
- PV/PVC, StorageClass, HPA management
- Gateway API (Gateway, HTTPRoute, GRPCRoute, TCPRoute, UDPRoute)
- RBAC (ClusterRole, Role, ClusterRoleBinding, RoleBinding, ServiceAccount)

### Log Drilldown
- Grafana Logs Drilldown-style log exploration UI
- Label facet filtering (dynamically loads all stream labels)
- Detected Fields (auto-parses JSON/logfmt structured fields)
- Pattern Detection (log pattern clustering, Loki native + Go fallback)
- Field Breakdown (aggregate analysis by field dimension)
- Real-time log streaming (WebSocket Tail)
- Custom LogQL queries

### Distributed Tracing
- Tempo trace search and detail view
- Service dependency graph (Service Graph)
- Trace-Log correlation
- RED Metrics (Request rate, Error rate, Duration)

### Monitoring
- Prometheus metrics dashboard
- K8s resource metrics (CPU/Memory/Network) time-series charts
- Application metrics (Request rate, P99 latency, Error rate)
- Drilldown from cluster to pod level
- Auto-refresh and time range control

### CI/CD
- Pipeline management and execution
- Jenkins integration
- Artifact management

### Others
- Wiki knowledge base
- Favorites
- Backup management
- Alibaba Cloud Flow integration

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.25 + Beego v2 |
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui (base-nova) + Tailwind CSS v4 + Lucide Icons |
| Charts | Recharts |
| Database | MySQL 8.0 |
| Cache | Redis |
| Logging | Loki |
| Tracing | Tempo |
| Monitoring | Prometheus |
| Testing | Playwright (E2E) |

## Quick Start

### Prerequisites

- Go 1.25+
- Node.js 20+
- MySQL 8.0
- Redis

### Backend

```bash
# Install dependencies
go mod tidy

# Configure database
cp conf/app.conf.example conf/app.conf
# Edit conf/app.conf with your MySQL and Redis connection details

# Run
go run main.go
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build
```

### Docker Deployment

```bash
cd docker-compose
docker-compose up -d
```

## Project Structure

```
mrboard/
├── common/          # Shared libraries (K8s client, Alibaba Cloud, MySQL, Redis)
├── conf/            # Configuration files
├── controllers/     # API controllers
├── deploy/          # K8s deployment manifests
├── docker-compose/  # Docker Compose setup
├── docs/            # Documentation
├── frontend/        # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # React hooks
│   │   ├── layouts/     # Layout components
│   │   ├── lib/         # Utility libraries
│   │   ├── pages/       # Page components
│   │   └── types/       # TypeScript types
│   └── package.json
├── middleware/       # Middleware (Metrics)
├── models/          # Data models
├── routers/         # Route registration
├── specs/           # Feature specifications
├── tests/           # E2E tests
├── xadmin/          # RBAC permission management
├── go.mod
├── main.go
└── Dockerfile
```

## API Endpoints

| Module | Prefix | Description |
|--------|--------|-------------|
| K8s Resources | `/mrboard/k8s/v1/*` | Cluster, Pod, Node management |
| Logs | `/mrboard/log/v1/*` | Loki log queries |
| Tracing | `/mrboard/trace/v1/*` | Tempo trace queries |
| Monitoring | `/mrboard/prometheus/v1/*` | Prometheus metric queries |
| CI/CD | `/mrboard/cicd/v1/*` | Pipeline management |
| Wiki | `/wiki/v1/*` | Knowledge base |
| RBAC | `/mrboard/rbac/v1/*` | Permission management |

## License

Internal use only.
