# Alerting Integration Design

**日期**: 2026-06-04
**状态**: 已确认
**参考**: Prometheus Alertmanager, Grafana Alerting

## 概述

为 MRBoard 接入告警功能，支持 Prometheus 指标告警和 Loki 日志告警。对接 Alertmanager 作为告警引擎，MRBoard 提供全生命周期管理（规则 CRUD + 告警展示 + Webhook 转发）。

## 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 告警来源 | Prometheus + Loki | 覆盖 90% K8s 告警场景 |
| 通知渠道 | Webhook 通用推送 | 钉钉/飞书/企微/Slack 均支持 webhook |
| 告警引擎 | 对接 Alertmanager | Prometheus 生态成熟，不重复造轮子 |
| MRBoard 角色 | 全生命周期管理 | 统一运维平台的核心价值 |
| UI 形式 | 独立页面 + 监控嵌入 | 管理 + 状态感知兼顾 |
| 环境 | kube-prometheus-stack | 最流行的 K8s 监控方案 |
| 连接方式 | 直连 Alertmanager URL | 灵活，与现有 prometheus_url 模式一致 |
| 规则写入 | CRD + Rules API 自动检测 | 适配不同集群环境 |
| 推送方式 | Webhook + 主动查询混合 | 实时性 + 可靠性兼得 |

## 架构

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   MRBoard    │     │  Alertmanager   │     │  Prometheus  │
│              │◄────│                 │     │              │
│  /webhook    │     │  推送告警        │     │  规则评估     │
│              │────►│                 │     │              │
│  告警规则管理 │     │  静默/抑制       │     │  PromQL 查询  │
│  + CRD 写入  │     └─────────────────┘     └──────────────┘
│              │                                       ▲
│  通知渠道管理 │───────────────────────────────────────┘
│  + Webhook   │     通过 PrometheusRule CRD 或 Rules API 写入规则
│  转发        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  外部 Webhook│
│  钉钉/飞书等  │
└──────────────┘
```

### 告警流程

**Prometheus 指标告警：**
1. 用户在 MRBoard UI 创建告警规则
2. MRBoard 写入 `alert_rule` 表
3. 检测集群是否有 PrometheusRule CRD → 有则创建 CRD，无则写入 rules 文件 + reload
4. Prometheus 评估规则 → 触发 → 推送到 Alertmanager
5. Alertmanager POST 到 MRBoard `/mrboard/alert/v1/webhook`
6. MRBoard 写入 `alert_history` + 转发到配置的 Webhook 渠道

**Loki 日志告警：**
1. 用户在 MRBoard UI 创建 Loki 告警规则（LogQL 表达式）
2. MRBoard 写入 `alert_rule` 表（`source=loki`）
3. MRBoard 后台 goroutine 每 30 秒评估 Loki 规则
4. 触发 → 写入 `alert_history` + 转发通知渠道

## 数据模型

### 集群配置扩展

`xkb_cluster` 表新增字段：
- `alertmanager_url` varchar — Alertmanager 地址

### `alert_rule` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int AUTO_INCREMENT | 主键 |
| cluster_id | varchar(64) | 集群 ID |
| name | varchar(128) | 规则名称（唯一） |
| expr | text | PromQL / LogQL 表达式 |
| source | varchar(16) | `prometheus` 或 `loki` |
| duration | varchar(16) | 持续时间（如 `5m`） |
| severity | varchar(16) | `critical`、`warning`、`info` |
| labels | json | 自定义标签 |
| annotations | json | 注解（summary、description） |
| enabled | tinyint(1) | 是否启用 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

### `alert_history` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int AUTO_INCREMENT | 主键 |
| cluster_id | varchar(64) | 集群 ID |
| rule_name | varchar(128) | 规则名称 |
| severity | varchar(16) | 严重级别 |
| status | varchar(16) | `firing` 或 `resolved` |
| labels | json | 触发时的标签 |
| annotations | json | 触发时的注解 |
| starts_at | datetime | 开始时间 |
| ends_at | datetime | 结束时间 |
| notified | tinyint(1) | 是否已通知 |
| created_at | datetime | 记录时间 |

### `alert_channel` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int AUTO_INCREMENT | 主键 |
| name | varchar(64) | 渠道名称 |
| type | varchar(16) | `webhook` |
| url | text | Webhook URL |
| headers | json | 自定义请求头 |
| enabled | tinyint(1) | 是否启用 |
| created_at | datetime | 创建时间 |

## 后端 API

### 告警规则管理

```
POST   /mrboard/alert/v1/rules              — 创建规则
GET    /mrboard/alert/v1/rules              — 列表（clusterId 筛选）
GET    /mrboard/alert/v1/rules/:id          — 详情
PUT    /mrboard/alert/v1/rules/:id          — 更新
DELETE /mrboard/alert/v1/rules/:id          — 删除
POST   /mrboard/alert/v1/rules/:id/toggle   — 启用/禁用
```

**创建规则流程：**
1. 写入 `alert_rule` 表
2. 检测 `monitoring.coreos.com/v1` API group 是否存在
   - 存在 → 创建/更新 PrometheusRule CRD
   - 不存在 → 写入 Prometheus rules 文件 + `/-/reload`
3. 返回结果

### 告警查询

```
GET /mrboard/alert/v1/active               — 当前活跃告警（Alertmanager API）
GET /mrboard/alert/v1/history              — 告警历史（DB 查询）
```

**活跃告警查询：**
- 调用 Alertmanager `GET /api/v2/alerts`
- 缓存 10 秒避免频繁调用

### 通知渠道管理

```
POST   /mrboard/alert/v1/channels          — 创建渠道
GET    /mrboard/alert/v1/channels          — 列表
PUT    /mrboard/alert/v1/channels/:id      — 更新
DELETE /mrboard/alert/v1/channels/:id      — 删除
POST   /mrboard/alert/v1/channels/:id/test — 测试发送
```

### Webhook 接收

```
POST /mrboard/alert/v1/webhook             — Alertmanager 推送端点
```

**接收流程：**
1. 解析 Alertmanager webhook payload
2. 写入 `alert_history`
3. 遍历启用的 `alert_channel`，异步转发（goroutine + channel）
4. 转发失败重试 3 次

### Loki 日志规则评估

后台 goroutine（30 秒间隔）：
1. 查询 `source=loki AND enabled=true` 的规则
2. 对每条规则执行 LogQL 查询
3. 结果超阈值 → 触发告警
4. 写入 `alert_history` + 转发通知

## 前端 UI

### 文件结构

```
frontend/src/pages/alerts/
├── AlertDashboard.tsx          # 主页面（4 个 tab）
├── AlertDashboard/
│   ├── ActiveAlerts.tsx        # 活跃告警列表
│   ├── AlertRuleList.tsx       # 告警规则管理
│   ├── AlertRuleForm.tsx       # 规则创建/编辑表单
│   ├── AlertChannelList.tsx    # 通知渠道管理
│   ├── AlertChannelForm.tsx    # 渠道创建/编辑表单
│   └── AlertHistory.tsx        # 告警历史
frontend/src/components/
├── AlertStatusBadge.tsx        # 告警状态指示器
```

### 页面布局

**告警管理页面 `/alerts`：**

4 个 Tab：
1. **活跃告警** — 从 Alertmanager 拉取，按严重级别排序，显示规则名/命名空间/持续时间/集群
2. **告警规则** — 表格展示，支持 CRUD、启用/禁用、按集群筛选
3. **通知渠道** — 表格展示，支持 CRUD、测试发送
4. **告警历史** — 表格展示，支持按时间/级别/状态筛选

**监控页面嵌入：**

在 PrometheusMetrics.tsx 顶部新增告警状态条：
- 显示当前集群的 critical/warning 告警数量
- 点击跳转到告警管理页面

### 规则创建表单

- 名称（必填）
- 来源（Prometheus / Loki 单选）
- 集群选择器
- 表达式（PromQL / LogQL 文本框）
- 持续时间（默认 5m）
- 严重级别（critical / warning / info）
- 注解（summary、description）

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| Alertmanager 不可达 | 活跃告警显示"无法连接"，不影响规则管理 |
| Prometheus 不可达 | 规则创建失败，提示连接错误 |
| Webhook 转发失败 | `notified=false`，后台重试 3 次 |
| PrometheusRule CRD 不可用 | 降级到 Rules API |
| Loki 规则评估失败 | 跳过该规则，日志记录 |
| 重复告警 | 通过 fingerprint 判断，更新而非重复插入 |
| 未配置 Alertmanager URL | 告警功能不可用，显示配置提示 |

## 性能策略

- 活跃告警查询：缓存 10 秒
- Loki 规则评估：30 秒间隔，串行
- 告警历史：保留 30 天，定期清理
- Webhook 转发：异步 goroutine + channel

## 兼容性

- 集群配置页面新增 `alertmanager_url` 输入框
- 侧边菜单新增"告警管理"入口
- PrometheusMetrics 页面新增告警状态条
- 复用现有集群选择器和时间范围组件
