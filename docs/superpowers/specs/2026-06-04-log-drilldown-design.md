# Log Drilldown 设计文档

**日期**: 2026-06-04
**状态**: 已确认
**参考**: Grafana Logs Drilldown (Explore Logs)

## 概述

替换现有 `LogViewer.tsx`，实现类似 Grafana Logs Drilldown 的渐进式日志探索体验。核心能力：Label Facet 过滤、Detected Fields、Pattern Detection、Field Breakdown。

## 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 架构方案 | 完全替换 LogViewer | LogViewer 已 697 行，加 4 个功能会膨胀到 1500+，不可维护 |
| Pattern Detection | 混合（Loki 原生 + Go 降级） | 优先利用 Loki 能力，降级保证兼容性 |
| Facet UI | 组合（左侧面板 + 顶部 tag bar） | Grafana 验证过的交互模式，职责清晰 |
| Detected Fields 格式 | JSON + logfmt | 覆盖大多数结构化日志场景 |
| Detected Fields 后端 | 混合（Loki 原生 + Go 降级） | 同 Pattern Detection 策略 |

## 工作流

渐进式下钻，点击驱动，无需写 LogQL：

```
总览(Volume) → Labels(流选择) → Fields(结构化字段) → Patterns(模式聚类) → 日志行
```

## 布局

```
┌─────────────────────────────────────────────────────────┐
│  Cluster [▼]  TimeRange [1h ▼]  [Auto-refresh] [搜索]  │
│  已选筛选: [namespace:prod ×] [level:error ×] [...]     │
├──────────────┬──────────────────────────────────────────┤
│  Labels      │  ┌─ Histogram (量级直方图) ─────────────┐ │
│  ├ namespace │  │  ██████ ████ ████████████            │ │
│  │  prod (12k)│  │  ████ ██████ ████████              │ │
│  │  dev  (3k) │  └────────────────────────────────────┘ │
│  ├ pod       │                                          │
│  │  app-1(5k)│  ┌─ Patterns (模式聚类) ───────────────┐ │
│  │  app-2(3k)│  │  ▸ GET /api/users/{id} 200  (45%)   │ │
│  │  ...      │  │  ▸ POST /api/login 200      (23%)   │ │
│  ├ container │  │  ▸ ERROR connection timeout   (8%)   │ │
│  │  ...      │  └────────────────────────────────────┘ │
│             │                                          │
│  Fields     │  ┌─ Log Entries ────────────────────────┐ │
│  ├ user_id  │  │  12:00:01 ERROR app-1 connection...  │ │
│  │  123(800)│  │  12:00:02 WARN  app-2 timeout...     │ │
│  │  456(200)│  │  12:00:03 INFO  app-1 request ok     │ │
│  ├ action   │  │  ...                                 │ │
│  │  login(5k)│  └────────────────────────────────────┘ │
│  │  ...     │                                          │
│             │  ┌─ Field Breakdown (选中字段时显示) ────┐ │
│  Levels     │  │  pod: app-1 ████████ 60%             │ │
│  ├ error(2k)│  │       app-2 ████     30%             │ │
│  ├ warn (1k)│  │       app-3 ██       10%             │ │
│  ├ info (8k)│  └────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────┘
```

- 左侧面板每个 facet 值可点击筛选（点击=include，shift+点击=exclude）
- 顶部 tag bar 显示已选筛选条件，点击×移除
- 点击直方图柱子可缩放到该时间段
- Patterns 区域可展开查看该模式下的日志行
- LogQL 输入框默认隐藏，高级用户可展开

## 主题约束

- 纯中性灰度色板（oklch 色彩空间，chroma=0）
- 唯一彩色：destructive（红色）+ dark-mode sidebar-primary（蓝色）
- 复用所有 shadcn tokens：`bg-card`、`text-foreground`、`border-border`、`bg-muted`、`chart-*`
- 日志 level 颜色：error=destructive（红），warn/info/debug=灰度梯度
- Chart 使用 `--chart-1` 到 `--chart-5` 灰度 tokens

## 后端 API

### 新增接口

#### 1. DetectedFields

```
GET /mrboard/log/v1/DetectedFields
```

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clusterId | string | 是 | 集群 ID |
| namespace | string | 否 | 命名空间筛选 |
| services | string | 否 | 服务名（逗号分隔） |
| start | int64 | 是 | 开始时间戳 |
| end | int64 | 是 | 结束时间戳 |

响应：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "fields": [
      {
        "name": "user_id",
        "type": "string",
        "values": [
          {"value": "123", "count": 800},
          {"value": "456", "count": 200}
        ]
      }
    ]
  }
}
```

实现策略（混合）：
1. 优先：调用 Loki `query_range` + `| json` 或 `| logfmt` pipeline，采样 200 条
2. 降级：后端解析 JSON/logfmt 提取字段名，统计 top N 值及计数

#### 2. Patterns

```
GET /mrboard/log/v1/Patterns
```

参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clusterId | string | 是 | 集群 ID |
| namespace | string | 否 | 命名空间筛选 |
| services | string | 否 | 服务名 |
| levels | string | 否 | 日志级别筛选 |
| start | int64 | 是 | 开始时间戳 |
| end | int64 | 是 | 结束时间戳 |

响应：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "patterns": [
      {
        "pattern": "GET /api/users/{id} 200",
        "count": 4500,
        "percentage": 45.0,
        "sample": "GET /api/users/123 200"
      }
    ]
  }
}
```

实现策略（混合）：
1. 优先：调用 Loki pattern API（Loki 2.9+）
2. 降级：后端拉取样本日志，用模板匹配算法聚类（将数字/UUID/IP 替换为占位符）

### 现有接口增强

**Labels 接口增强** — 返回值中增加每个 label 的 top values 和计数：

```json
{
  "code": 0,
  "data": {
    "labels": [
      {
        "name": "namespace",
        "values": [
          {"value": "prod", "count": 12000},
          {"value": "dev", "count": 3000},
          {"value": "monitoring", "count": 500}
        ]
      },
      {
        "name": "pod",
        "values": [
          {"value": "app-1", "count": 5000},
          {"value": "app-2", "count": 3000},
          {"value": "app-3", "count": 2000}
        ]
      }
    ]
  }
}
```

## 前端组件

### 文件结构

```
frontend/src/pages/log/
├── LogDrilldown.tsx              # 主页面（替换 LogViewer.tsx）
├── LogDrilldown/
│   ├── FacetPanel.tsx            # 左侧 facet 面板
│   ├── FacetGroup.tsx            # 单个 facet 组
│   ├── FilterTagBar.tsx          # 顶部筛选 tag bar
│   ├── VolumeHistogram.tsx       # 量级直方图
│   ├── PatternList.tsx           # 模式聚类列表
│   ├── LogEntryList.tsx          # 日志条目列表
│   ├── LogEntryRow.tsx           # 单条日志行
│   ├── FieldBreakdown.tsx        # 字段聚合图表
│   ├── LogQLInput.tsx            # LogQL 输入框
│   └── TimeRangeSelector.tsx     # 时间范围选择器
├── TraceViewer.tsx               # 保留
├── TraceDetail.tsx               # 保留
├── ServiceGraph.tsx              # 保留
├── ServiceNode.tsx               # 保留
└── ServiceOverviewPanel.tsx      # 保留
```

### 组件职责

**LogDrilldown.tsx**（主页面，~400 行）
- 状态管理：filterState、timeRange、autoRefresh、logql
- 数据获取：调用所有后端 API
- 布局：顶部 FilterTagBar + 工具栏 → 中间 VolumeHistogram → 左 FacetPanel + 右内容区

**FacetPanel.tsx**（~200 行）
- 接收 labels、fields、levels 数据
- 渲染多个 FacetGroup
- 点击值 = include，shift+点击 = exclude

**FacetGroup.tsx**（~80 行）
- 标题 + 计数 + 展开/折叠
- 值列表，支持 include/exclude 选中态
- 超过 10 个值显示 "Show more"

**FilterTagBar.tsx**（~60 已选筛选条件 Badge，include=默认灰，exclude=destructive 红，点击×移除）

**VolumeHistogram.tsx**（~120 行）
- recharts BarChart，按 level 着色
- 点击柱子缩放时间段
- 使用 `--chart-*` tokens

**PatternList.tsx**（~100 行）
- 模式列表：pattern、计数、百分比、sample
- 点击 pattern = 添加为 filter

**LogEntryList.tsx**（~150 行）
- 从原 LogViewer 提取
- timestamp + level badge + service + message
- 展开显示 labels + detected fields

**FieldBreakdown.tsx**（~100 行）
- 选中 field 时显示
- 按 top values 聚合，水平条形图

**LogQLInput.tsx**（~60 行）
- 默认折叠，点击展开编辑
- 支持手动 LogQL 执行

**TimeRangeSelector.tsx**（~60 行）
- 快捷：5m / 15m / 1h / 6h / 24h
- 自定义 start/end

### 状态管理

```typescript
interface FilterState {
  labels: Record<string, string[]>;        // { namespace: ["prod"] }
  excludeLabels: Record<string, string[]>; // shift+点击排除
  fields: Record<string, string[]>;        // { user_id: ["123"] }
  excludeFields: Record<string, string[]>;
  levels: string[];                        // ["error", "warn"]
  search: string;
  logql: string;
}
```

URL 参数同步：filterState 序列化到 URL params，支持分享和刷新。

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 集群未配置 Loki 地址 | Card 提示 + 跳转链接 |
| Loki 不可达 | 错误提示 Card，不影响其他功能 |
| DetectedFields 失败 | 不显示 Fields facet，其余正常 |
| Patterns 失败 | 不显示 Patterns 区域，其余正常 |
| 无 pattern API | 后端降级为 Go 聚类 |
| 查询超时 | 提示缩小时间范围 |
| 日志为空 | "暂无数据" 空状态 |
| Facet 值过多 | 默认显示 top 10，点击 "Show more" 展开到 top 20 |

## 性能策略

- Detected Fields 采样 200 条
- Patterns 采样最多 5000 条
- Facet 值默认显示 top 10，"Show more" 展开到 top 20
- 直方图 step 自动计算（复用 CalcStep）
- Facet 筛选变更 300ms 防抖

## 兼容性

- WebSocket Tail 保留
- LogQL 手动输入保留（默认折叠）
- Trace 联动保留（更新路由引用）
- 路由 `/log/viewer` 替换为 `/log/drilldown`（原路由不再保留）
