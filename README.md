# MRBoard

Kubernetes 多集群管理平台，提供集群资源管理、日志查询、链路追踪、CI/CD、监控指标等一站式运维能力。

## 功能特性

### K8s 资源管理
- 集群接入与管理（多集群支持）
- Deployment、StatefulSet、DaemonSet、Job、CronJob 管理
- Pod、Node、Namespace、Service、Ingress、ConfigMap、Secret 管理
- PV/PVC、StorageClass、HPA 管理
- Gateway API（Gateway、HTTPRoute、GRPCRoute、TCPRoute、UDPRoute）
- RBAC（ClusterRole、Role、ClusterRoleBinding、RoleBinding、ServiceAccount）

### 日志查询（Log Drilldown）
- Grafana Logs Drilldown 风格的日志探索界面
- Label Facet 过滤（动态加载所有 stream labels）
- Detected Fields（自动解析 JSON/logfmt 结构化字段）
- Pattern Detection（日志模式聚类，Loki 原生 + Go 降级）
- Field Breakdown（按字段维度聚合分析）
- 实时日志流（WebSocket Tail）
- 自定义 LogQL 查询

### 链路追踪
- Tempo 链路搜索与详情查看
- 服务依赖图（Service Graph）
- Trace-Log 关联
- RED Metrics（请求速率、错误率、延迟）

### 监控指标
- Prometheus 指标面板
- K8s 资源指标（CPU/内存/网络）时序折线图
- 应用服务指标（请求速率/P99 延迟/错误率）
- 从集群到 Pod 的层级下钻
- 自动刷新与时间范围控制

### CI/CD
- Pipeline 管理与执行
- Jenkins 集成
- 制品管理

### 其他
- Wiki 知识库
- 收藏夹
- 备份管理
- 阿里云 Flow 集成

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Go 1.25 + Beego v2 |
| 前端 | React 18 + TypeScript + Vite |
| UI | shadcn/ui (base-nova) + Tailwind CSS v4 + Lucide Icons |
| 图表 | Recharts |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis |
| 日志 | Loki |
| 链路 | Tempo |
| 监控 | Prometheus |
| 测试 | Playwright (E2E) |

## 快速开始

### 环境要求

- Go 1.25+
- Node.js 20+
- MySQL 8.0
- Redis

### 后端

```bash
# 安装依赖
go mod tidy

# 配置数据库
cp conf/app.conf.example conf/app.conf
# 编辑 conf/app.conf 填写数据库和 Redis 连接信息

# 运行
go run main.go
```

### 前端

```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

### Docker 部署

```bash
# 使用 docker-compose
cd docker-compose
docker-compose up -d
```

## 项目结构

```
mrboard/
├── common/          # 公共库（K8s 客户端、阿里云、MySQL、Redis）
├── conf/            # 配置文件
├── controllers/     # API 控制器
├── deploy/          # K8s 部署清单
├── docker-compose/  # Docker Compose 配置
├── docs/            # 文档
├── frontend/        # React 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── hooks/       # React Hooks
│   │   ├── layouts/     # 布局组件
│   │   ├── lib/         # 工具库
│   │   ├── pages/       # 页面组件
│   │   └── types/       # TypeScript 类型
│   └── package.json
├── middleware/       # 中间件（Metrics）
├── models/          # 数据模型
├── routers/         # 路由注册
├── specs/           # 功能规格文档
├── tests/           # E2E 测试
├── xadmin/          # RBAC 权限管理
├── go.mod
├── main.go
└── Dockerfile
```

## API 端点

| 模块 | 端点前缀 | 说明 |
|------|----------|------|
| K8s 资源 | `/mrboard/k8s/v1/*` | 集群、Pod、Node 等管理 |
| 日志 | `/mrboard/log/v1/*` | Loki 日志查询 |
| 链路 | `/mrboard/trace/v1/*` | Tempo 链路追踪 |
| 监控 | `/mrboard/prometheus/v1/*` | Prometheus 指标查询 |
| CI/CD | `/mrboard/cicd/v1/*` | Pipeline 管理 |
| Wiki | `/wiki/v1/*` | 知识库 |
| RBAC | `/mrboard/rbac/v1/*` | 权限管理 |

## License

Internal use only.
