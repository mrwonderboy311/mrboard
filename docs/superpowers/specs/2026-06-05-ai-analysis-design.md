# AI 智能分析系统设计文档

**日期**: 2026-06-05
**状态**: 设计完成，待实现

## 1. 概述

为 mrboard 平台增加 AI 智能分析功能，支持告警自动触发分析和用户手动分析。Agent 能读取日志、指标、链路数据，调用 K8S API 查询集群状态，输出结构化分析报告，并具备记忆和自主进化能力。

## 2. 核心需求

| 维度 | 设计 |
|------|------|
| 触发方式 | 告警自动 + 用户手动 |
| LLM | 兼容 Anthropic Messages API 规范（支持 Claude、Bedrock、DeepSeek 等） |
| K8S 查询 | 只读（get/describe/logs/top/events） |
| 输出格式 | 结构化报告（问题摘要/根因/建议/证据） |
| UI 布局 | 独立页面，左侧告警列表，右侧分析结果 |
| 交互 | 可追问 + 可调用工具动态补充信息 |
| 记忆 | 告警记忆 + 集群知识 + 用户反馈学习 |

## 3. 架构设计

```
┌─────────────────────────────────────────────────────┐
│                    mrboard Frontend                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ 告警列表  │  │ 分析报告  │  │ 对话交互(可追问) │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└───────────────────────┬─────────────────────────────┘
                        │ SSE 流式（第二阶段）
┌───────────────────────┴─────────────────────────────┐
│                  Go Backend (Agent)                   │
│  ┌──────────────────────────────────────────────┐   │
│  │           AI Agent Engine (核心循环)           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌───────────────┐  │   │
│  │  │感知模块  │→│推理模块  │→│ 结构化输出模块 │  │   │
│  │  └─────────┘ └─────────┘ └───────────────┘  │   │
│  │       ↑           ↓                          │   │
│  │  ┌─────────────────────────────────────┐    │   │
│  │  │           Tool Registry              │    │   │
│  │  │  Loki │ Prometheus │ Tempo │ K8S API │    │   │
│  │  └─────────────────────────────────────┘    │   │
│  │       ↑           ↓                          │   │
│  │  ┌─────────────────────────────────────┐    │   │
│  │  │           Memory System              │    │   │
│  │  │  告警记忆 │ 集群知识 │ 用户反馈       │    │   │
│  │  └─────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────┘   │
│                        ↓                             │
│  ┌──────────────────────────────────────────────┐   │
│  │         Anthropic API (兼容规范)               │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 4. Agent 核心循环

```go
func (a *Agent) Analyze(ctx context.Context, trigger AlertTrigger) (*AnalysisReport, error) {
    // 1. 感知：收集初始上下文
    context := a.Perception.Gather(trigger)
    //    - 告警详情（名称、severity、时间、labels）
    //    - 历史记忆（类似告警的过往分析）
    //    - 集群知识（服务拓扑、常见问题）

    // 2. 推理循环（最多 N 轮，防止无限循环）
    messages := []Message{{
        Role: "user",
        Content: buildAnalysisPrompt(trigger, context, memory),
    }}

    for i := 0; i < maxRounds; i++ {
        resp, err := a.Anthropic.Call(messages, tools)

        // 如果 API 返回纯文本 → 最终分析结果
        if resp.StopReason == "end_turn" {
            return a.Output.Format(resp.Content), nil
        }

        // 如果 API 要调用工具 → 执行并继续
        if resp.StopReason == "tool_use" {
            results := a.ToolRegistry.Execute(resp.ToolCalls)
            messages = append(messages, resp.AsMessage(), results.AsMessage())
            continue
        }
    }
}
```

### 4.1 可用工具

| 工具 | 功能 | 数据源 |
|------|------|--------|
| `query_logs` | 查询日志（支持 LogQL） | Loki |
| `query_metrics` | 查询指标（支持 PromQL） | Prometheus |
| `query_traces` | 查询链路 | Tempo |
| `get_pod_status` | 查看 Pod 状态 | K8S API |
| `get_pod_logs` | 查看 Pod 容器日志 | K8S API |
| `get_events` | 查看集群事件 | K8S API |
| `get_resource_usage` | 查看资源使用 | K8S API |
| `search_memory` | 搜索历史分析记忆 | 记忆系统 |
| `save_memory` | 保存分析结论 | 记忆系统 |

### 4.2 结构化输出格式

```json
{
  "summary": "问题一句话摘要",
  "severity": "critical|warning|info",
  "root_cause": "根因分析",
  "evidence": [
    {"type": "log", "content": "...", "source": "loki"},
    {"type": "metric", "content": "...", "source": "prometheus"},
    {"type": "trace", "content": "...", "source": "tempo"},
    {"type": "k8s", "content": "...", "source": "k8s"}
  ],
  "suggestions": [
    {"action": "建议操作", "risk": "low|medium|high", "command": "kubectl ..."}
  ],
  "related_incidents": ["历史相关事件ID"]
}
```

## 5. 记忆系统

### 5.1 三层记忆结构

| 层级 | 名称 | 存储 | TTL | 用途 |
|------|------|------|-----|------|
| L1 | 短期记忆 (Session) | Redis | 1 小时 | 当前分析的对话上下文和工具结果 |
| L2 | 告警记忆 (Incident) | MySQL `alert_memory` | 永久 | 每次告警分析的完整记录 |
| L3 | 集群知识 (Knowledge) | MySQL `knowledge` | 永久 | 服务拓扑、常见问题模式、用户反馈 |

### 5.2 告警指纹

用于匹配相似告警，避免重复分析。

```go
func Fingerprint(alert Alert) string {
    key := alert.Name + ":" + alert.Severity + ":" + alert.Labels["namespace"]
    return sha256(key)[:16]
}
```

### 5.3 记忆匹配流程

```
新告警 → 生成指纹 → 查 alert_memory
  ├── 命中 → 把历史分析注入 prompt（"上次类似告警的根因是..."）
  └── 未命中 → 正常分析流程
```

### 5.4 用户反馈机制

分析结果页面显示反馈按钮（👍有用 / 👎不准确 / ✏️补充）。用户点 👎 后弹出输入框，存入 feedback 表。Agent 下次分析时读取 feedback 作为参考。

### 5.5 DB 表设计

```sql
-- 告警记忆
CREATE TABLE alert_memory (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fingerprint VARCHAR(64) NOT NULL,
    alert_name VARCHAR(255),
    severity VARCHAR(32),
    cluster_id VARCHAR(64),
    namespace VARCHAR(128),
    analysis_json TEXT,
    feedback_score INT DEFAULT 0,
    feedback_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fingerprint (fingerprint)
);

-- 集群知识
CREATE TABLE knowledge (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cluster_id VARCHAR(64),
    category VARCHAR(64),
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cluster_category (cluster_id, category)
);

-- LLM 模型配置
CREATE TABLE llm_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    provider VARCHAR(64),
    api_url VARCHAR(512) NOT NULL,
    api_key VARCHAR(512) NOT NULL,
    model VARCHAR(128) NOT NULL,
    max_tokens INT DEFAULT 4096,
    temperature FLOAT DEFAULT 0.3,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 6. 告警自动触发

### 6.1 自动触发流程

```
Alertmanager Webhook → /mrboard/alert/v1/webhook (已有)
    ↓
写入 alert_history (已有)
    ↓
异步触发 AI 分析 (新增)
    ↓
go analyzeAlert(alert)
  1. 生成告警指纹
  2. 查记忆（相似历史）
  3. 调用 Agent 分析
  4. 存入 alert_memory
  5. 推送分析结果到告警通道
```

### 6.2 手动分析入口

- 告警详情页新增「AI 分析」按钮
- AI 分析页面支持自由提问（不关联告警）
- 分析中可手动添加日志片段、指标截图等上下文

## 7. LLM 配置

### 7.1 调用方式

纯 HTTP 调用，兼容 Anthropic Messages API 规范，不依赖 SDK。

```go
type AnthropicRequest struct {
    Model     string    `json:"model"`
    MaxTokens int       `json:"max_tokens"`
    Messages  []Message `json:"messages"`
    Tools     []Tool    `json:"tools,omitempty"`
    Stream    bool      `json:"stream"`
}

func (a *Agent) callLLM(messages []Message, tools []Tool) (*Response, error) {
    body := AnthropicRequest{
        Model:     a.config.Model,
        MaxTokens: a.config.MaxTokens,
        Messages:  messages,
        Tools:     tools,
        Stream:    false,
    }
    resp, err := http.Post(a.config.ApiUrl+"/v1/messages", ...)
    // 解析响应，处理 tool_use
}
```

### 7.2 模型管理

管理员可在页面配置多个 LLM（API 地址、Key、模型名），支持设置默认模型。分析时可切换模型。

## 8. API 路由

```
POST   /mrboard/ai/v1/analyze          -- 触发分析
GET    /mrboard/ai/v1/history           -- 分析历史列表
GET    /mrboard/ai/v1/history/:id       -- 分析详情
POST   /mrboard/ai/v1/chat              -- 追问对话
POST   /mrboard/ai/v1/feedback          -- 提交反馈
GET    /mrboard/ai/v1/models            -- 获取模型列表
POST   /mrboard/ai/v1/models            -- 添加模型配置
PUT    /mrboard/ai/v1/models/:id        -- 更新模型配置
DELETE /mrboard/ai/v1/models/:id        -- 删除模型配置
```

## 9. 前端页面

### 9.1 页面布局

```
┌──────────────────────────────────────────────────────────┐
│  AI 智能分析                                    [新建分析] │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│  告警列表 │  分析报告                                     │
│          │  ┌─────────────────────────────────────────┐  │
│  🔴 OOM  │  │ 问题摘要: Pod 内存溢出                   │  │
│  🟡 CPU高│  │ 根因: 应用内存泄漏...                    │  │
│  🟢 正常 │  │ 证据: [日志] [指标] [链路] [K8S]         │  │
│          │  │ 建议: 1. 扩容 2. 排查泄漏...             │  │
│          │  └─────────────────────────────────────────┘  │
│          │                                               │
│          │  对话区域（可追问）                            │
│          │  ┌─────────────────────────────────────────┐  │
│          │  │ 用户: 帮我查下这个 Pod 最近的日志       │  │
│          │  │ AI: [调用 query_logs] 找到 3 条错误...   │  │
│          │  └─────────────────────────────────────────┘  │
│          │  [输入框]                           [发送]     │
├──────────┴───────────────────────────────────────────────┤
│  模型: [Claude Sonnet ▼]  历史分析: 3 条  反馈: 👍2 👎1   │
└──────────────────────────────────────────────────────────┘
```

### 9.2 前端组件

```
frontend/src/pages/ai/
├── AIAnalysis.tsx          -- 主页面（左右布局）
├── AlertList.tsx           -- 左侧告警列表
├── AnalysisReport.tsx      -- 右侧分析报告
├── ChatPanel.tsx           -- 追问对话区域
├── EvidenceCard.tsx        -- 证据卡片（日志/指标/链路/K8S）
└── ModelSelector.tsx       -- 模型选择器
```

### 9.3 路由

- `/ai/analysis` — AI 分析主页面
- `/ai/models` — 模型配置页面（管理员）

## 10. 实施阶段

### 第一阶段：基础 Agent
- [ ] DB 表创建（alert_memory, knowledge, llm_config）
- [ ] LLM 配置管理（CRUD）
- [ ] Agent 核心循环（非流式）
- [ ] 工具注册（query_logs, query_metrics, query_traces, get_pod_status, get_events）
- [ ] 结构化输出
- [ ] API 路由（analyze, history, chat）
- [ ] 前端 AI 分析页面
- [ ] 告警详情页「AI 分析」按钮

### 第二阶段：记忆系统
- [ ] 告警指纹 + 记忆匹配
- [ ] 短期记忆（Redis session）
- [ ] 用户反馈机制
- [ ] 集群知识积累

### 第三阶段：增强体验
- [ ] SSE 流式输出
- [ ] 工具调用过程实时展示
- [ ] 分析报告导出
- [ ] 告警自动分析 + 推送到告警通道
