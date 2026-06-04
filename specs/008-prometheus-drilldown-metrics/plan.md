# Implementation Plan: Prometheus Drilldown Metrics Dashboard

**Branch**: `008-prometheus-drilldown-metrics` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-prometheus-drilldown-metrics/spec.md`

## Summary

为 xkube 新增 Prometheus 指标面板，支持 K8s 资源指标（CPU/内存/网络）和应用服务指标（请求速率/延迟/错误率）的时序折线图展示。支持从集群到 Pod 的标准 K8s 层级下钻，按命名空间和服务筛选，快捷时间范围选择和自动刷新。

## Technical Context

**Language/Version**: Go 1.25.4 (backend), TypeScript + React 18 (frontend)

**Primary Dependencies**: Beego v2 (backend), shadcn/ui + Tailwind CSS (frontend), recharts (新增)

**Storage**: MySQL 8.0 (集群配置新增 prometheus_url 字段)

**Testing**: 无自动化测试，手动 UI 验证

**Target Platform**: Linux K8s 集群，浏览器访问

**Project Type**: Web application (Go backend + React SPA)

**Performance Goals**: 页面加载 < 3s，图表刷新 < 2s

**Constraints**: Prometheus 地址需从集群内网可达，无额外认证

**Scale/Scope**: 支持 1-10 个集群，每集群数百个 Pod

## Constitution Check

| 原则 | 状态 | 说明 |
|------|------|------|
| Simplicity First | ✅ | 使用 recharts 而非重量级方案 |
| Surgical Changes | ✅ | 新增文件为主，最小化修改现有文件 |
| Multi-Cluster Safety | ✅ | 所有查询通过 clusterId 路由到对应 Prometheus |
| RBAC Enforcement | ✅ | 新 API 端点走 RBAC 中间件 |
| Backward Compatibility | ✅ | 仅新增字段和路由，不修改现有 API |

**注意**: Constitution 中 "Frontend: Server-rendered HTML with Layui" 已过时。项目已在 006-frontend-backend-split 中迁移到 React + shadcn/ui。本计划遵循实际的 React 架构。

## Project Structure

### Documentation (this feature)

```text
specs/008-prometheus-drilldown-metrics/
├── plan.md              # 本文件
├── research.md          # 技术决策
├── data-model.md        # 数据模型
├── quickstart.md        # 快速验证指南
├── contracts/
│   └── api.md           # API 接口定义
└── tasks.md             # 任务清单（由 /speckit-tasks 生成）
```

### Source Code (repository root)

```text
controllers/
└── prometheus_query.go          # 新增：Prometheus 查询代理

models/
└── prometheus_model.go          # 新增：PromQL 模板和查询逻辑

routers/
└── router.go                    # 修改：注册新路由

conf/
└── app.conf                     # 无需修改（RBAC 在 router 层）

frontend/
├── package.json                 # 修改：新增 recharts 依赖
├── src/
│   ├── pages/monitor/
│   │   ├── PrometheusMetrics.tsx    # 新增：主页面
│   │   ├── TimeSeriesChart.tsx      # 新增：时序折线图组件
│   │   ├── MetricCard.tsx           # 新增：当前值卡片
│   │   └── ResourceTable.tsx        # 新增：资源列表表格
│   ├── hooks/
│   │   └── usePrometheus.ts         # 新增：数据获取 hook
│   ├── lib/
│   │   └── promql.ts                # 新增：单位格式化
│   ├── App.tsx                      # 修改：添加路由
│   ├── layouts/MainLayout.tsx       # 修改：菜单入口
│   └── types/index.ts               # 修改：Cluster 类型
└── src/pages/cluster/
    └── ClusterEdit.tsx              # 修改：prometheus_url 输入框
```

## Complexity Tracking

无违反。所有改动遵循现有架构模式（controller → model → API）。
