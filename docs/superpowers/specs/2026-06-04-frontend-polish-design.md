# Frontend Polish Design

**日期**: 2026-06-04
**状态**: 已确认

## 概述

将 MRBoard 前端从 demo 级别优化为成熟产品。分 4 批执行：基础组件 → 列表页 → 详情页 → 侧边栏/登录页/首页。

## 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 优化范围 | 分阶段，第一阶段全做 | 覆盖所有页面 |
| 分页方式 | 后端分页 | K8s 资源可能数百个 |
| 详情页 | 逐个实现 | 每个资源有独特展示需求 |
| 组织方式 | 混合（组件→列表→详情→侧边栏） | 基础设施先行 |

## 第一批：新增 shadcn 组件 + 统一 Wrapper

### 新增 shadcn 组件

| 组件 | 用途 |
|------|------|
| `skeleton` | 加载骨架屏 |
| `pagination` | 列表分页 |
| `tooltip` | 按钮提示 |
| `switch` | 开关 |
| `checkbox` | 多选 |
| `avatar` | 用户头像 |
| `progress` | 进度条 |
| `label` | 表单标签 |
| `scroll-area` | 可滚动区域 |

### 统一 Wrapper 组件

新建 `frontend/src/components/shared/` 目录：

**PageHeader.tsx** — 统一页面标题 + 操作按钮

**DataTable.tsx** — 通用数据表格（Table + 分页 + 骨架屏 + 空状态）

**EmptyState.tsx** — 统一空状态（图标 + 标题 + 描述 + 操作按钮）

**LoadingSkeleton.tsx** — 表格骨架屏

**StatusBadge.tsx** — 统一状态颜色映射（Running=绿, Pending=黄, Failed=红）

## 第二批：列表页优化

### 统一列表页布局

```
PageHeader: 标题 + 描述 + [创建] 按钮
筛选栏: [命名空间 ▼] [搜索...] [状态 ▼]
DataTable: 表格 + 分页 + 骨架屏 + 空状态
```

### 后端分页接口改造

所有列表接口添加 `page` 和 `limit` 参数，返回 `{code, msg, count, data}`。

需改造的接口：
- K8s 资源（~30 个）
- CI/CD（5 个）
- RBAC（8 个）
- 运维（3 个）
- Wiki（2 个）

## 第三批：详情页实现

### 统一详情页布局

```
PageHeader: 资源名称 + 状态 Badge + [删除] [编辑YAML]
Tabs: [概览] [YAML] [事件] [日志]
```

### Tab 内容

| Tab | 内容 | 数据来源 |
|-----|------|----------|
| 概览 | 基本信息、标签、注解、关联资源 | K8s API |
| YAML | 资源 YAML | 现有 YAML viewer |
| 事件 | 关联 K8s Events | `/mrboard/k8s/v1/event` |
| 日志 | Pod 日志（仅 Pod） | WebSocket Tail |

### 详情页列表

**高优先级：** Pod、Node、Deployment、Service、Ingress

**中优先级：** StatefulSet、DaemonSet、Job、CronJob、ConfigMap、Secret、PV、PVC、HPA

**低优先级：** Gateway、HTTPRoute 等网关资源

## 第四批：侧边栏 + 登录页 + 首页

### 侧边栏优化

- 分组标题增加视觉层次
- 活跃菜单项增加左侧指示条
- 折叠/展开动画更平滑
- 底部用户菜单增加头像
- 搜索增加 ⌘K 快捷键提示

### 登录页优化

- 增加品牌 Logo 和标语
- 背景增加渐变 + 微妙网格动画
- 表单增加记住我功能

### 首页优化

替换静态占位为真实数据驱动的 Dashboard：
- 统计卡片：集群数、节点数、Pod 数、告警数（真实 API 数据）
- 最近告警：`/mrboard/alert/v1/history?limit=5`
- 集群状态：每个集群健康检查
- 快捷入口：创建部署、查看日志、监控面板、链路追踪、告警管理

## 文件结构

```
frontend/src/components/
├── shared/
│   ├── PageHeader.tsx
│   ├── DataTable.tsx
│   ├── EmptyState.tsx
│   ├── LoadingSkeleton.tsx
│   └── StatusBadge.tsx
├── ui/
│   ├── skeleton.tsx      (新增)
│   ├── pagination.tsx    (新增)
│   ├── tooltip.tsx       (新增)
│   ├── switch.tsx        (新增)
│   ├── checkbox.tsx      (新增)
│   ├── avatar.tsx        (新增)
│   ├── progress.tsx      (新增)
│   ├── label.tsx         (新增)
│   └── scroll-area.tsx   (新增)
```
