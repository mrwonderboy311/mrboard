# AI 智能分析系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 mrboard 实现 AI 智能分析功能，支持告警触发分析、K8S 只读查询、结构化输出、记忆系统

**Architecture:** Go 后端 Agent 引擎调用 Anthropic 兼容 API，通过 tool_use 机制调用 Loki/Prometheus/Tempo/K8S 工具，输出结构化报告。前端独立页面展示。

**Tech Stack:** Go + Beego v2, React + shadcn/ui, Anthropic Messages API, MySQL, Redis

---

## 文件结构

### 后端新增
- `models/llm_config_model.go` — LLM 模型配置 CRUD
- `models/analysis_model.go` — 分析历史 + 告警记忆 + 集群知识 CRUD
- `controllers/ai_analysis.go` — AI 分析 API 控制器
- `controllers/ai_model.go` — LLM 模型配置控制器
- `ai/agent.go` — Agent 核心循环
- `ai/llm_client.go` — Anthropic API HTTP 客户端
- `ai/tools.go` — 工具注册表 + 工具定义
- `ai/tool_observability.go` — Loki/Prometheus/Tempo 工具实现
- `ai/tool_k8s.go` — K8S 只读工具实现
- `ai/tool_memory.go` — 记忆工具实现
- `ai/output.go` — 结构化输出解析

### 前端新增
- `frontend/src/types/ai.ts` — AI 相关类型定义
- `frontend/src/pages/ai/AIAnalysis.tsx` — 主页面
- `frontend/src/pages/ai/AlertList.tsx` — 左侧告警列表
- `frontend/src/pages/ai/AnalysisReport.tsx` — 分析报告展示
- `frontend/src/pages/ai/ChatPanel.tsx` — 追问对话
- `frontend/src/pages/ai/EvidenceCard.tsx` — 证据卡片
- `frontend/src/pages/ai/ModelSelector.tsx` — 模型选择器

---

### Task 1: DB 表创建

**Files:**
- Execute: SQL on MySQL

- [ ] **Step 1: 创建 llm_config 表**

```sql
CREATE TABLE IF NOT EXISTS llm_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    provider VARCHAR(64) DEFAULT 'anthropic',
    api_url VARCHAR(512) NOT NULL,
    api_key VARCHAR(512) NOT NULL,
    model VARCHAR(128) NOT NULL,
    max_tokens INT DEFAULT 4096,
    temperature FLOAT DEFAULT 0.3,
    is_default BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: 创建 analysis_history 表**

```sql
CREATE TABLE IF NOT EXISTS analysis_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cluster_id VARCHAR(64) NOT NULL,
    trigger_type VARCHAR(32) NOT NULL,
    trigger_id VARCHAR(128),
    alert_name VARCHAR(255),
    severity VARCHAR(32),
    namespace VARCHAR(128),
    summary TEXT,
    root_cause TEXT,
    evidence_json TEXT,
    suggestions_json TEXT,
    model_used VARCHAR(128),
    tokens_used INT DEFAULT 0,
    rounds INT DEFAULT 0,
    feedback_score INT DEFAULT 0,
    feedback_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cluster (cluster_id),
    INDEX idx_trigger (trigger_type, trigger_id)
);
```

- [ ] **Step 3: 创建 alert_memory 表**

```sql
CREATE TABLE IF NOT EXISTS alert_memory (
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
```

- [ ] **Step 4: 创建 knowledge 表**

```sql
CREATE TABLE IF NOT EXISTS knowledge (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cluster_id VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cluster_category (cluster_id, category)
);
```

- [ ] **Step 5: 插入默认 LLM 配置**

```sql
INSERT INTO llm_config (name, provider, api_url, api_key, model, is_default)
VALUES ('Claude Sonnet', 'anthropic', 'https://api.anthropic.com', 'YOUR_API_KEY', 'claude-sonnet-4-20250514', TRUE);
```

- [ ] **Step 6: 验证表创建**

Run: `kubectl exec -n mrboard mysql-0 -- mysql -u root -pxkube_DB_123456 -e "SHOW TABLES FROM db_xkube LIKE '%llm%'; SHOW TABLES FROM db_xkube LIKE '%analysis%'; SHOW TABLES FROM db_xkube LIKE '%memory%'; SHOW TABLES FROM db_xkube LIKE '%knowledge%';"`

Expected: 4 tables listed

---

### Task 2: LLM 配置模型

**Files:**
- Create: `models/llm_config_model.go`

- [ ] **Step 1: 创建 LLM 配置模型文件**

```go
package models

import (
	"time"
	"github.com/beego/beego/v2/client/orm"
)

type LlmConfig struct {
	Id          int64   `json:"id" orm:"column(id);auto"`
	Name        string  `json:"name" orm:"column(name)"`
	Provider    string  `json:"provider" orm:"column(provider)"`
	ApiUrl      string  `json:"api_url" orm:"column(api_url)"`
	ApiKey      string  `json:"api_key" orm:"column(api_key)"`
	Model       string  `json:"model" orm:"column(model)"`
	MaxTokens   int     `json:"max_tokens" orm:"column(max_tokens)"`
	Temperature float64 `json:"temperature" orm:"column(temperature)"`
	IsDefault   bool    `json:"is_default" orm:"column(is_default)"`
	CreatedAt   string  `json:"created_at" orm:"column(created_at)"`
}

func (t *LlmConfig) TableName() string {
	return "llm_config"
}

func init() {
	orm.RegisterModel(new(LlmConfig))
}

func GetLlmConfigs() ([]LlmConfig, error) {
	o := orm.NewOrm()
	var configs []LlmConfig
	_, err := o.QueryTable(new(LlmConfig)).OrderBy("-is_default", "-id").All(&configs)
	return configs, err
}

func GetLlmConfig(id int64) (*LlmConfig, error) {
	o := orm.NewOrm()
	config := &LlmConfig{Id: id}
	err := o.Read(config)
	return config, err
}

func GetDefaultLlmConfig() (*LlmConfig, error) {
	o := orm.NewOrm()
	config := &LlmConfig{}
	err := o.QueryTable(new(LlmConfig)).Filter("is_default", true).One(config)
	if err != nil {
		// fallback to first config
		err = o.QueryTable(new(LlmConfig)).OrderBy("-id").Limit(1).One(config)
	}
	return config, err
}

func CreateLlmConfig(config *LlmConfig) error {
	config.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	o := orm.NewOrm()
	_, err := o.Insert(config)
	return err
}

func UpdateLlmConfig(config *LlmConfig) error {
	o := orm.NewOrm()
	_, err := o.Update(config, "name", "provider", "api_url", "api_key", "model", "max_tokens", "temperature", "is_default")
	return err
}

func DeleteLlmConfig(id int64) error {
	o := orm.NewOrm()
	_, err := o.Delete(&LlmConfig{Id: id})
	return err
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add models/llm_config_model.go
git commit -m "feat(ai): add LLM config model"
```

---

### Task 3: 分析历史 + 记忆模型

**Files:**
- Create: `models/analysis_model.go`

- [ ] **Step 1: 创建分析模型文件**

```go
package models

import (
	"time"
	"github.com/beego/beego/v2/client/orm"
)

type AnalysisHistory struct {
	Id             int64  `json:"id" orm:"column(id);auto"`
	ClusterId      string `json:"cluster_id" orm:"column(cluster_id)"`
	TriggerType    string `json:"trigger_type" orm:"column(trigger_type)"`
	TriggerId      string `json:"trigger_id" orm:"column(trigger_id)"`
	AlertName      string `json:"alert_name" orm:"column(alert_name)"`
	Severity       string `json:"severity" orm:"column(severity)"`
	Namespace      string `json:"namespace" orm:"column(namespace)"`
	Summary        string `json:"summary" orm:"column(summary)"`
	RootCause      string `json:"root_cause" orm:"column(root_cause)"`
	EvidenceJson   string `json:"evidence_json" orm:"column(evidence_json)"`
	SuggestionsJson string `json:"suggestions_json" orm:"column(suggestions_json)"`
	ModelUsed      string `json:"model_used" orm:"column(model_used)"`
	TokensUsed     int    `json:"tokens_used" orm:"column(tokens_used)"`
	Rounds         int    `json:"rounds" orm:"column(rounds)"`
	FeedbackScore  int    `json:"feedback_score" orm:"column(feedback_score)"`
	FeedbackNote   string `json:"feedback_note" orm:"column(feedback_note)"`
	CreatedAt      string `json:"created_at" orm:"column(created_at)"`
}

func (t *AnalysisHistory) TableName() string {
	return "analysis_history"
}

type AlertMemory struct {
	Id          int64  `json:"id" orm:"column(id);auto"`
	Fingerprint string `json:"fingerprint" orm:"column(fingerprint)"`
	AlertName   string `json:"alert_name" orm:"column(alert_name)"`
	Severity    string `json:"severity" orm:"column(severity)"`
	ClusterId   string `json:"cluster_id" orm:"column(cluster_id)"`
	Namespace   string `json:"namespace" orm:"column(namespace)"`
	AnalysisJson string `json:"analysis_json" orm:"column(analysis_json)"`
	FeedbackScore int   `json:"feedback_score" orm:"column(feedback_score)"`
	FeedbackNote  string `json:"feedback_note" orm:"column(feedback_note)"`
	CreatedAt   string `json:"created_at" orm:"column(created_at)"`
}

func (t *AlertMemory) TableName() string {
	return "alert_memory"
}

type Knowledge struct {
	Id        int64  `json:"id" orm:"column(id);auto"`
	ClusterId string `json:"cluster_id" orm:"column(cluster_id)"`
	Category  string `json:"category" orm:"column(category)"`
	Content   string `json:"content" orm:"column(content)"`
	CreatedAt string `json:"created_at" orm:"column(created_at)"`
}

func (t *Knowledge) TableName() string {
	return "knowledge"
}

func init() {
	orm.RegisterModel(new(AnalysisHistory), new(AlertMemory), new(Knowledge))
}

// --- AnalysisHistory CRUD ---

func CreateAnalysisHistory(h *AnalysisHistory) error {
	h.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	o := orm.NewOrm()
	_, err := o.Insert(h)
	return err
}

func GetAnalysisHistories(clusterId string, page, pageSize int64) ([]AnalysisHistory, int64, error) {
	o := orm.NewOrm()
	qs := o.QueryTable(new(AnalysisHistory))
	if clusterId != "" {
		qs = qs.Filter("cluster_id", clusterId)
	}
	total, _ := qs.Count()
	var results []AnalysisHistory
	qs.OrderBy("-created_at").Limit(pageSize, (page-1)*pageSize).All(&results)
	return results, total, nil
}

func GetAnalysisHistory(id int64) (*AnalysisHistory, error) {
	o := orm.NewOrm()
	h := &AnalysisHistory{Id: id}
	err := o.Read(h)
	return h, err
}

func UpdateAnalysisFeedback(id int64, score int, note string) error {
	o := orm.NewOrm()
	h := &AnalysisHistory{Id: id}
	if err := o.Read(h); err != nil {
		return err
	}
	h.FeedbackScore = score
	h.FeedbackNote = note
	_, err := o.Update(h, "feedback_score", "feedback_note")
	return err
}

// --- AlertMemory CRUD ---

func GetAlertMemoryByFingerprint(fingerprint string) (*AlertMemory, error) {
	o := orm.NewOrm()
	m := &AlertMemory{}
	err := o.QueryTable(new(AlertMemory)).Filter("fingerprint", fingerprint).OrderBy("-created_at").Limit(1).One(m)
	return m, err
}

func CreateAlertMemory(m *AlertMemory) error {
	m.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	o := orm.NewOrm()
	_, err := o.Insert(m)
	return err
}

// --- Knowledge CRUD ---

func GetKnowledgeByCluster(clusterId, category string) ([]Knowledge, error) {
	o := orm.NewOrm()
	qs := o.QueryTable(new(Knowledge)).Filter("cluster_id", clusterId)
	if category != "" {
		qs = qs.Filter("category", category)
	}
	var results []Knowledge
	qs.OrderBy("-created_at").Limit(20).All(&results)
	return results, nil
}

func CreateKnowledge(k *Knowledge) error {
	k.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	o := orm.NewOrm()
	_, err := o.Insert(k)
	return err
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add models/analysis_model.go
git commit -m "feat(ai): add analysis history and memory models"
```

---

### Task 4: Anthropic API 客户端

**Files:**
- Create: `ai/llm_client.go`

- [ ] **Step 1: 创建 LLM 客户端**

```go
package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type LLMConfig struct {
	ApiUrl      string
	ApiKey      string
	Model       string
	MaxTokens   int
	Temperature float64
}

type Message struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
}

type Tool struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	InputSchema interface{} `json:"input_schema"`
}

type ToolCall struct {
	Id    string          `json:"id"`
	Name  string          `json:"name"`
	Input json.RawMessage `json:"input"`
}

type LLMResponse struct {
	Content    []ContentBlock `json:"content"`
	StopReason string         `json:"stop_reason"`
	Usage      Usage          `json:"usage"`
}

type ContentBlock struct {
	Type  string          `json:"type"`
	Text  string          `json:"text,omitempty"`
	Id    string          `json:"id,omitempty"`
	Name  string          `json:"name,omitempty"`
	Input json.RawMessage `json:"input,omitempty"`
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type LLMClient struct {
	config     LLMConfig
	httpClient *http.Client
}

func NewLLMClient(config LLMConfig) *LLMClient {
	return &LLMClient{
		config: config,
		httpClient: &http.Client{Timeout: 120 * time.Second},
	}
}

func (c *LLMClient) Call(messages []Message, tools []Tool) (*LLMResponse, error) {
	body := map[string]interface{}{
		"model":      c.config.Model,
		"max_tokens": c.config.MaxTokens,
		"messages":   messages,
		"stream":     false,
	}
	if c.config.Temperature > 0 {
		body["temperature"] = c.config.Temperature
	}
	if len(tools) > 0 {
		body["tools"] = tools
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", c.config.ApiUrl+"/v1/messages", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.config.ApiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http call: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}

	var llmResp LLMResponse
	if err := json.Unmarshal(respBody, &llmResp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	return &llmResp, nil
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add ai/llm_client.go
git commit -m "feat(ai): add Anthropic API client"
```

---

### Task 5: 工具注册表 + 工具定义

**Files:**
- Create: `ai/tools.go`

- [ ] **Step 1: 创建工具注册表**

```go
package ai

import (
	"encoding/json"
	"log"
)

type ToolFunc func(clusterId string, input json.RawMessage) (string, error)

type ToolDef struct {
	Tool    Tool
	Handler ToolFunc
}

type ToolRegistry struct {
	tools map[string]*ToolDef
}

func NewToolRegistry() *ToolRegistry {
	return &ToolRegistry{tools: make(map[string]*ToolDef)}
}

func (r *ToolRegistry) Register(def ToolDef) {
	r.tools[def.Tool.Name] = &def
}

func (r *ToolRegistry) GetDefinitions() []Tool {
	var defs []Tool
	for _, t := range r.tools {
		defs = append(defs, t.Tool)
	}
	return defs
}

type ToolResult struct {
	ToolUseId string `json:"tool_use_id"`
	Content   string `json:"content"`
	IsError   bool   `json:"is_error,omitempty"`
}

func (r *ToolRegistry) Execute(clusterId string, calls []ToolCall) []ToolResult {
	var results []ToolResult
	for _, call := range calls {
		def, ok := r.tools[call.Name]
		if !ok {
			results = append(results, ToolResult{
				ToolUseId: call.Id,
				Content:   "unknown tool: " + call.Name,
				IsError:   true,
			})
			continue
		}
		result, err := def.Handler(clusterId, call.Input)
		if err != nil {
			log.Printf("[ERROR] tool %s: %v", call.Name, err)
			results = append(results, ToolResult{
				ToolUseId: call.Id,
				Content:   "error: " + err.Error(),
				IsError:   true,
			})
			continue
		}
		results = append(results, ToolResult{
			ToolUseId: call.Id,
			Content:   result,
		})
	}
	return results
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add ai/tools.go
git commit -m "feat(ai): add tool registry"
```

---

### Task 6: 可观测性工具实现

**Files:**
- Create: `ai/tool_observability.go`

- [ ] **Step 1: 创建 Loki/Prometheus/Tempo 工具**

```go
package ai

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"mrboard/common"
)

func RegisterObservabilityTools(registry *ToolRegistry) {
	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "query_logs",
			Description: "查询 Loki 日志。输入 LogQL 查询表达式和可选的 namespace 过滤。返回最近的日志条目。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{
						"type":        "string",
						"description": "LogQL 查询表达式，如 {namespace=\"production\"} |= \"error\"",
					},
					"limit": map[string]interface{}{
						"type":        "integer",
						"description": "返回条目数量，默认 50",
					},
				},
				"required": []string{"query"},
			},
		},
		Handler: handleQueryLogs,
	})

	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "query_metrics",
			Description: "查询 Prometheus 指标。输入 PromQL 表达式和时间范围。返回时序数据。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"query": map[string]interface{}{
						"type":        "string",
						"description": "PromQL 表达式，如 rate(http_requests_total[5m])",
					},
					"duration": map[string]interface{}{
						"type":        "string",
						"description": "查询时间范围，如 1h, 30m, 6h。默认 1h",
					},
				},
				"required": []string{"query"},
			},
		},
		Handler: handleQueryMetrics,
	})

	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "query_traces",
			Description: "搜索 Tempo 链路追踪。按服务名、操作名、持续时间搜索。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"service": map[string]interface{}{
						"type":        "string",
						"description": "服务名称",
					},
					"operation": map[string]interface{}{
						"type":        "string",
						"description": "操作名称",
					},
					"minDuration": map[string]interface{}{
						"type":        "string",
						"description": "最小持续时间，如 1s, 500ms",
					},
					"limit": map[string]interface{}{
						"type":        "integer",
						"description": "返回数量，默认 10",
					},
				},
			},
		},
		Handler: handleQueryTraces,
	})
}

func handleQueryLogs(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Query string `json:"query"`
		Limit int    `json:"limit"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", err
	}
	if params.Limit <= 0 {
		params.Limit = 50
	}

	lokiUrl, err := common.GetLokiUrl(clusterId)
	if err != nil {
		return "", fmt.Errorf("get loki url: %w", err)
	}

	end := time.Now().UnixNano()
	start := time.Now().Add(-1 * time.Hour).UnixNano()
	reqUrl := fmt.Sprintf("%s/loki/api/v1/query_range?query=%s&start=%d&end=%d&limit=%d",
		strings.TrimRight(lokiUrl, "/"),
		url.QueryEscape(params.Query),
		start, end, params.Limit)

	body, err := httpGet(reqUrl)
	if err != nil {
		return "", err
	}
	return string(body), nil
}

func handleQueryMetrics(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Query    string `json:"query"`
		Duration string `json:"duration"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", err
	}
	if params.Duration == "" {
		params.Duration = "1h"
	}

	promUrl, err := common.GetPrometheusUrl(clusterId)
	if err != nil {
		return "", fmt.Errorf("get prometheus url: %w", err)
	}

	end := time.Now().Unix()
	start := end - parseDuration(params.Duration)
	reqUrl := fmt.Sprintf("%s/api/v1/query_range?query=%s&start=%d&end=%d&step=60",
		strings.TrimRight(promUrl, "/"),
		url.QueryEscape(params.Query),
		start, end)

	body, err := httpGet(reqUrl)
	if err != nil {
		return "", err
	}
	return string(body), nil
}

func handleQueryTraces(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Service     string `json:"service"`
		Operation   string `json:"operation"`
		MinDuration string `json:"minDuration"`
		Limit       int    `json:"limit"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", err
	}
	if params.Limit <= 0 {
		params.Limit = 10
	}

	tempoUrl, err := common.GetTempoUrl(clusterId)
	if err != nil {
		return "", fmt.Errorf("get tempo url: %w", err)
	}

	qs := url.Values{}
	if params.Service != "" {
		qs.Set("service", params.Service)
	}
	if params.Operation != "" {
		qs.Set("operation", params.Operation)
	}
	if params.MinDuration != "" {
		qs.Set("minDuration", params.MinDuration)
	}
	qs.Set("limit", fmt.Sprintf("%d", params.Limit))

	reqUrl := fmt.Sprintf("%s/api/search?%s", strings.TrimRight(tempoUrl, "/"), qs.Encode())
	body, err := httpGet(reqUrl)
	if err != nil {
		return "", err
	}
	return string(body), nil
}

func httpGet(reqUrl string) ([]byte, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(reqUrl)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("http %d: %s", resp.StatusCode, string(body[:min(len(body), 500)]))
	}
	return body, nil
}

func parseDuration(s string) int64 {
	s = strings.TrimSpace(s)
	if strings.HasSuffix(s, "h") {
		var h int
		fmt.Sscanf(s, "%dh", &h)
		return int64(h) * 3600
	}
	if strings.HasSuffix(s, "m") {
		var m int
		fmt.Sscanf(s, "%dm", &m)
		return int64(m) * 60
	}
	return 3600 // default 1h
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add ai/tool_observability.go
git commit -m "feat(ai): add Loki/Prometheus/Tempo tools"
```

---

### Task 7: K8S 只读工具实现

**Files:**
- Create: `ai/tool_k8s.go`

- [ ] **Step 1: 创建 K8S 工具**

```go
package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"mrboard/common"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func RegisterK8STools(registry *ToolRegistry) {
	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "get_pod_status",
			Description: "查看指定命名空间的 Pod 状态，包括运行状态、重启次数、资源使用。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"namespace": map[string]interface{}{
						"type":        "string",
						"description": "命名空间，留空查看所有",
					},
					"podName": map[string]interface{}{
						"type":        "string",
						"description": "Pod 名称（可选，模糊匹配）",
					},
				},
			},
		},
		Handler: handleGetPodStatus,
	})

	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "get_pod_logs",
			Description: "查看 Pod 的容器日志。用于查看应用崩溃前的错误信息。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"namespace": map[string]interface{}{
						"type":        "string",
						"description": "命名空间",
					},
					"podName": map[string]interface{}{
						"type":        "string",
						"description": "Pod 名称",
					},
					"tailLines": map[string]interface{}{
						"type":        "integer",
						"description": "返回最后几行，默认 100",
					},
				},
				"required": []string{"namespace", "podName"},
			},
		},
		Handler: handleGetPodLogs,
	})

	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "get_events",
			Description: "查看集群事件，用于排查调度失败、镜像拉取错误等问题。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"namespace": map[string]interface{}{
						"type":        "string",
						"description": "命名空间，留空查看所有",
					},
					"fieldSelector": map[string]interface{}{
						"type":        "string",
						"description": "字段过滤，如 involvedObject.name=pod-name",
					},
				},
			},
		},
		Handler: handleGetEvents,
	})
}

func handleGetPodStatus(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Namespace string `json:"namespace"`
		PodName   string `json:"podName"`
	}
	json.Unmarshal(input, &params)

	clientset := common.ClientSet(clusterId)
	if clientset == nil {
		return "", fmt.Errorf("k8s client not available for cluster %s", clusterId)
	}

	ns := params.Namespace
	if ns == "" {
		ns = ""
	}

	pods, err := clientset.CoreV1().Pods(ns).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return "", err
	}

	var results []map[string]interface{}
	for _, pod := range pods.Items {
		if params.PodName != "" && !strings.Contains(pod.Name, params.PodName) {
			continue
		}
		status := string(pod.Status.Phase)
		restarts := int32(0)
		for _, cs := range pod.Status.ContainerStatuses {
			restarts += cs.RestartCount
		}
		results = append(results, map[string]interface{}{
			"name":      pod.Name,
			"namespace": pod.Namespace,
			"status":    status,
			"restarts":  restarts,
			"node":      pod.Spec.NodeName,
			"ip":        pod.Status.PodIP,
		})
		if len(results) >= 30 {
			break
		}
	}

	data, _ := json.MarshalIndent(results, "", "  ")
	return string(data), nil
}

func handleGetPodLogs(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Namespace string `json:"namespace"`
		PodName   string `json:"podName"`
		TailLines int64  `json:"tailLines"`
	}
	json.Unmarshal(input, &params)
	if params.TailLines <= 0 {
		params.TailLines = 100
	}

	clientset := common.ClientSet(clusterId)
	if clientset == nil {
		return "", fmt.Errorf("k8s client not available")
	}

	opts := &corev1.PodLogOptions{TailLines: &params.TailLines}
	req := clientset.CoreV1().Pods(params.Namespace).GetLogs(params.PodName, opts)
	stream, err := req.Stream(context.Background())
	if err != nil {
		return "", err
	}
	defer stream.Close()

	buf := new(strings.Builder)
	io.Copy(buf, stream)
	if buf.Len() > 10000 {
		return buf.String()[:10000] + "\n...(truncated)", nil
	}
	return buf.String(), nil
}

func handleGetEvents(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Namespace     string `json:"namespace"`
		FieldSelector string `json:"fieldSelector"`
	}
	json.Unmarshal(input, &params)

	clientset := common.ClientSet(clusterId)
	if clientset == nil {
		return "", fmt.Errorf("k8s client not available")
	}

	ns := params.Namespace
	events, err := clientset.CoreV1().Events(ns).List(context.Background(), metav1.ListOptions{
		FieldSelector: params.FieldSelector,
	})
	if err != nil {
		return "", err
	}

	var results []map[string]interface{}
	for i, event := range events.Items {
		if i >= 50 {
			break
		}
		results = append(results, map[string]interface{}{
			"type":      event.Type,
			"reason":    event.Reason,
			"message":   event.Message,
			"object":    fmt.Sprintf("%s/%s", event.InvolvedObject.Kind, event.InvolvedObject.Name),
			"namespace": event.Namespace,
			"time":      event.LastTimestamp.Time.Format("2006-01-02 15:04:05"),
		})
	}

	data, _ := json.MarshalIndent(results, "", "  ")
	return string(data), nil
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add ai/tool_k8s.go
git commit -m "feat(ai): add K8S read-only tools"
```

---

### Task 8: 记忆工具实现

**Files:**
- Create: `ai/tool_memory.go`

- [ ] **Step 1: 创建记忆工具**

```go
package ai

import (
	"encoding/json"
	"fmt"

	m "mrboard/models"
)

func RegisterMemoryTools(registry *ToolRegistry) {
	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "search_memory",
			Description: "搜索历史分析记忆，查找类似告警的历史分析结果。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"fingerprint": map[string]interface{}{
						"type":        "string",
						"description": "告警指纹",
					},
					"keyword": map[string]interface{}{
						"type":        "string",
						"description": "搜索关键词",
					},
				},
			},
		},
		Handler: handleSearchMemory,
	})

	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "save_memory",
			Description: "保存分析结论到记忆系统，用于未来类似告警的参考。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"fingerprint": map[string]interface{}{
						"type":        "string",
						"description": "告警指纹",
					},
					"alertName": map[string]interface{}{
						"type":        "string",
						"description": "告警名称",
					},
					"conclusion": map[string]interface{}{
						"type":        "string",
						"description": "分析结论摘要",
					},
				},
				"required": []string{"fingerprint", "conclusion"},
			},
		},
		Handler: handleSaveMemory,
	})
}

func handleSearchMemory(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Fingerprint string `json:"fingerprint"`
		Keyword     string `json:"keyword"`
	}
	json.Unmarshal(input, &params)

	if params.Fingerprint != "" {
		mem, err := m.GetAlertMemoryByFingerprint(params.Fingerprint)
		if err != nil {
			return "未找到历史记忆", nil
		}
		data, _ := json.MarshalIndent(mem, "", "  ")
		return string(data), nil
	}

	return "请提供 fingerprint 或 keyword 进行搜索", nil
}

func handleSaveMemory(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Fingerprint string `json:"fingerprint"`
		AlertName   string `json:"alertName"`
		Conclusion  string `json:"conclusion"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", err
	}

	mem := &m.AlertMemory{
		Fingerprint:  params.Fingerprint,
		AlertName:    params.AlertName,
		ClusterId:    clusterId,
		AnalysisJson: params.Conclusion,
	}
	if err := m.CreateAlertMemory(mem); err != nil {
		return "", fmt.Errorf("save memory: %w", err)
	}
	return "记忆已保存", nil
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add ai/tool_memory.go
git commit -m "feat(ai): add memory tools"
```

---

### Task 9: Agent 核心循环

**Files:**
- Create: `ai/agent.go`

- [ ] **Step 1: 创建 Agent 核心**

```go
package ai

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	m "mrboard/models"
)

const maxRounds = 10

type AlertTrigger struct {
	AlertName string            `json:"alert_name"`
	Severity  string            `json:"severity"`
	Namespace string            `json:"namespace"`
	ClusterId string            `json:"cluster_id"`
	Labels    map[string]string `json:"labels"`
	StartsAt  string            `json:"starts_at"`
	Message   string            `json:"message"`
}

type AnalysisReport struct {
	Summary       string       `json:"summary"`
	Severity      string       `json:"severity"`
	RootCause     string       `json:"root_cause"`
	Evidence      []Evidence   `json:"evidence"`
	Suggestions   []Suggestion `json:"suggestions"`
	RelatedIncs   []string     `json:"related_incidents"`
	RawResponse   string       `json:"raw_response"`
	TokensUsed    int          `json:"tokens_used"`
	Rounds        int          `json:"rounds"`
}

type Evidence struct {
	Type    string `json:"type"`
	Content string `json:"content"`
	Source  string `json:"source"`
}

type Suggestion struct {
	Action  string `json:"action"`
	Risk    string `json:"risk"`
	Command string `json:"command"`
}

type Agent struct {
	llmClient *LLMClient
	registry  *ToolRegistry
}

func NewAgent(config LLMConfig) *Agent {
	registry := NewToolRegistry()
	RegisterObservabilityTools(registry)
	RegisterK8STools(registry)
	RegisterMemoryTools(registry)

	return &Agent{
		llmClient: NewLLMClient(config),
		registry:  registry,
	}
}

func (a *Agent) Analyze(ctx context.Context, trigger AlertTrigger) (*AnalysisReport, error) {
	// 1. Build system prompt
	systemPrompt := buildSystemPrompt()

	// 2. Build user prompt with context
	userPrompt := buildUserPrompt(trigger)

	// 3. Agent loop
	messages := []Message{
		{Role: "user", Content: userPrompt},
	}
	tools := a.registry.GetDefinitions()

	var totalTokens int
	for round := 0; round < maxRounds; round++ {
		log.Printf("[AI] Round %d, messages: %d", round+1, len(messages))

		resp, err := a.llmClient.Call(append([]Message{{Role: "system", Content: systemPrompt}}, messages...), tools)
		if err != nil {
			return nil, fmt.Errorf("LLM call round %d: %w", round+1, err)
		}

		totalTokens += resp.Usage.InputTokens + resp.Usage.OutputTokens

		// Check for tool use
		if resp.StopReason == "tool_use" {
			// Extract tool calls
			var toolCalls []ToolCall
			var assistantContent []map[string]interface{}
			for _, block := range resp.Content {
				if block.Type == "tool_use" {
					toolCalls = append(toolCalls, ToolCall{
						Id:    block.Id,
						Name:  block.Name,
						Input: block.Input,
					})
					assistantContent = append(assistantContent, map[string]interface{}{
						"type":  "tool_use",
						"id":    block.Id,
						"name":  block.Name,
						"input": json.RawMessage(block.Input),
					})
				} else if block.Type == "text" {
					assistantContent = append(assistantContent, map[string]interface{}{
						"type": "text",
						"text": block.Text,
					})
				}
			}

			// Add assistant message
			messages = append(messages, Message{Role: "assistant", Content: assistantContent})

			// Execute tools
			results := a.registry.Execute(trigger.ClusterId, toolCalls)

			// Add tool results message
			var toolResultContent []map[string]interface{}
			for _, r := range results {
				toolResultContent = append(toolResultContent, map[string]interface{}{
					"type":      "tool_result",
					"tool_use_id": r.ToolUseId,
					"content":   r.Content,
					"is_error":  r.IsError,
				})
			}
			messages = append(messages, Message{Role: "user", Content: toolResultContent})
			continue
		}

		// End turn - extract final text
		var finalText string
		for _, block := range resp.Content {
			if block.Type == "text" {
				finalText += block.Text
			}
		}

		report := parseReport(finalText)
		report.TokensUsed = totalTokens
		report.Rounds = round + 1
		report.RawResponse = finalText
		return report, nil
	}

	return nil, fmt.Errorf("max rounds (%d) exceeded", maxRounds)
}

func Fingerprint(alert AlertTrigger) string {
	key := alert.AlertName + ":" + alert.Severity + ":" + alert.Namespace
	hash := sha256.Sum256([]byte(key))
	return fmt.Sprintf("%x", hash[:8])
}

func buildSystemPrompt() string {
	return `你是一个 Kubernetes 集群智能分析助手。你的任务是分析告警问题，找出根因，提供解决建议。

你可以使用以下工具：
- query_logs: 查询 Loki 日志
- query_metrics: 查询 Prometheus 指标
- query_traces: 查询 Tempo 链路
- get_pod_status: 查看 Pod 状态
- get_pod_logs: 查看 Pod 日志
- get_events: 查看集群事件
- search_memory: 搜索历史分析记忆
- save_memory: 保存分析结论

分析流程：
1. 先搜索记忆，看是否有类似告警的历史分析
2. 根据告警类型，查询相关的日志、指标、链路
3. 查看 Pod 状态和事件，确认集群层面的情况
4. 综合所有信息，给出结构化分析报告

输出格式（JSON）：
{
  "summary": "问题一句话摘要",
  "severity": "critical|warning|info",
  "root_cause": "详细的根因分析",
  "evidence": [
    {"type": "log|metric|trace|k8s", "content": "证据内容", "source": "数据来源"}
  ],
  "suggestions": [
    {"action": "建议操作", "risk": "low|medium|high", "command": "kubectl 命令（可选）"}
  ],
  "related_incidents": ["历史相关事件ID（可选）"]
}

请用中文回答。`
}

func buildUserPrompt(trigger AlertTrigger) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## 告警信息\n\n- 告警名称: %s\n- 严重级别: %s\n- 命名空间: %s\n- 集群: %s\n- 触发时间: %s\n",
		trigger.AlertName, trigger.Severity, trigger.Namespace, trigger.ClusterId, trigger.StartsAt))

	if len(trigger.Labels) > 0 {
		sb.WriteString("- Labels:\n")
		for k, v := range trigger.Labels {
			sb.WriteString(fmt.Sprintf("  - %s: %s\n", k, v))
		}
	}

	if trigger.Message != "" {
		sb.WriteString(fmt.Sprintf("\n## 告警描述\n%s\n", trigger.Message))
	}

	sb.WriteString("\n请分析这个告警的根因，并给出解决建议。先搜索历史记忆，然后查询相关数据。")
	return sb.String()
}

func parseReport(text string) *AnalysisReport {
	report := &AnalysisReport{
		Severity: "warning",
	}

	// Try to extract JSON from the response
	jsonStart := strings.Index(text, "{")
	jsonEnd := strings.LastIndex(text, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		jsonStr := text[jsonStart : jsonEnd+1]
		var parsed struct {
			Summary     string       `json:"summary"`
			Severity    string       `json:"severity"`
			RootCause   string       `json:"root_cause"`
			Evidence    []Evidence   `json:"evidence"`
			Suggestions []Suggestion `json:"suggestions"`
			RelatedIncs []string     `json:"related_incidents"`
		}
		if err := json.Unmarshal([]byte(jsonStr), &parsed); err == nil {
			report.Summary = parsed.Summary
			report.Severity = parsed.Severity
			report.RootCause = parsed.RootCause
			report.Evidence = parsed.Evidence
			report.Suggestions = parsed.Suggestions
			report.RelatedIncs = parsed.RelatedIncs
			return report
		}
	}

	// Fallback: use raw text as summary
	report.Summary = text
	report.RootCause = text
	return report
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add ai/agent.go
git commit -m "feat(ai): add agent core loop with tool use"
```

---

### Task 10: AI 分析控制器

**Files:**
- Create: `controllers/ai_analysis.go`

- [ ] **Step 1: 创建分析控制器**

```go
package controllers

import (
	"encoding/json"
	"strconv"

	"mrboard/ai"
	m "mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
)

type AIAnalysisController struct {
	beego.Controller
}

// POST /mrboard/ai/v1/analyze
func (this *AIAnalysisController) Analyze() {
	clusterId := this.GetString("clusterId")
	if clusterId == "" {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "clusterId required"}
		this.ServeJSON()
		return
	}

	// Parse request body
	var req struct {
		AlertId   int64             `json:"alert_id"`
		AlertName string            `json:"alert_name"`
		Severity  string            `json:"severity"`
		Namespace string            `json:"namespace"`
		Labels    map[string]string `json:"labels"`
		Message   string            `json:"message"`
		ModelId   int64             `json:"model_id"`
	}
	json.Unmarshal(this.Ctx.Input.RequestBody, &req)

	// Get LLM config
	var llmConfig *m.LlmConfig
	var err error
	if req.ModelId > 0 {
		llmConfig, err = m.GetLlmConfig(req.ModelId)
	} else {
		llmConfig, err = m.GetDefaultLlmConfig()
	}
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "LLM config not found"}
		this.ServeJSON()
		return
	}

	// Build trigger
	trigger := ai.AlertTrigger{
		AlertName: req.AlertName,
		Severity:  req.Severity,
		Namespace: req.Namespace,
		ClusterId: clusterId,
		Labels:    req.Labels,
		Message:   req.Message,
	}

	// Run agent
	agent := ai.NewAgent(ai.LLMConfig{
		ApiUrl:      llmConfig.ApiUrl,
		ApiKey:      llmConfig.ApiKey,
		Model:       llmConfig.Model,
		MaxTokens:   llmConfig.MaxTokens,
		Temperature: llmConfig.Temperature,
	})

	report, err := agent.Analyze(this.Ctx.Request.Context(), trigger)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	// Save to history
	evidenceJson, _ := json.Marshal(report.Evidence)
	suggestionsJson, _ := json.Marshal(report.Suggestions)
	history := &m.AnalysisHistory{
		ClusterId:       clusterId,
		TriggerType:     "manual",
		AlertName:       req.AlertName,
		Severity:        report.Severity,
		Namespace:       req.Namespace,
		Summary:         report.Summary,
		RootCause:       report.RootCause,
		EvidenceJson:    string(evidenceJson),
		SuggestionsJson: string(suggestionsJson),
		ModelUsed:       llmConfig.Model,
		TokensUsed:      report.TokensUsed,
		Rounds:          report.Rounds,
	}
	m.CreateAnalysisHistory(history)

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": report}
	this.ServeJSON()
}

// GET /mrboard/ai/v1/history
func (this *AIAnalysisController) History() {
	clusterId := this.GetString("clusterId")
	page, _ := this.GetInt64("page", 1)
	pageSize, _ := this.GetInt64("limit", 20)

	results, total, err := m.GetAnalysisHistories(clusterId, page, pageSize)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "count": total, "data": results}
	this.ServeJSON()
}

// GET /mrboard/ai/v1/history/:id
func (this *AIAnalysisController) HistoryDetail() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}

	result, err := m.GetAnalysisHistory(id)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": result}
	this.ServeJSON()
}

// POST /mrboard/ai/v1/chat
func (this *AIAnalysisController) Chat() {
	clusterId := this.GetString("clusterId")
	if clusterId == "" {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "clusterId required"}
		this.ServeJSON()
		return
	}

	var req struct {
		AnalysisId int64  `json:"analysis_id"`
		Message    string `json:"message"`
		ModelId    int64  `json:"model_id"`
	}
	json.Unmarshal(this.Ctx.Input.RequestBody, &req)

	// Get LLM config
	var llmConfig *m.LlmConfig
	var err error
	if req.ModelId > 0 {
		llmConfig, err = m.GetLlmConfig(req.ModelId)
	} else {
		llmConfig, err = m.GetDefaultLlmConfig()
	}
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "LLM config not found"}
		this.ServeJSON()
		return
	}

	// Build a simple trigger for follow-up
	trigger := ai.AlertTrigger{
		ClusterId: clusterId,
		Message:   req.Message,
	}

	agent := ai.NewAgent(ai.LLMConfig{
		ApiUrl:      llmConfig.ApiUrl,
		ApiKey:      llmConfig.ApiKey,
		Model:       llmConfig.Model,
		MaxTokens:   llmConfig.MaxTokens,
		Temperature: llmConfig.Temperature,
	})

	report, err := agent.Analyze(this.Ctx.Request.Context(), trigger)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": report}
	this.ServeJSON()
}

// POST /mrboard/ai/v1/feedback
func (this *AIAnalysisController) Feedback() {
	var req struct {
		AnalysisId int64  `json:"analysis_id"`
		Score      int    `json:"score"`
		Note       string `json:"note"`
	}
	json.Unmarshal(this.Ctx.Input.RequestBody, &req)

	if err := m.UpdateAnalysisFeedback(req.AnalysisId, req.Score, req.Note); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success"}
	this.ServeJSON()
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add controllers/ai_analysis.go
git commit -m "feat(ai): add AI analysis controller"
```

---

### Task 11: LLM 模型配置控制器

**Files:**
- Create: `controllers/ai_model.go`

- [ ] **Step 1: 创建模型配置控制器**

```go
package controllers

import (
	"encoding/json"
	"strconv"

	m "mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
)

type AIModelController struct {
	beego.Controller
}

// GET /mrboard/ai/v1/models
func (this *AIModelController) List() {
	configs, err := m.GetLlmConfigs()
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": configs}
	this.ServeJSON()
}

// POST /mrboard/ai/v1/models
func (this *AIModelController) Add() {
	var config m.LlmConfig
	json.Unmarshal(this.Ctx.Input.RequestBody, &config)
	if config.Name == "" || config.ApiUrl == "" || config.Model == "" {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "name, api_url, model required"}
		this.ServeJSON()
		return
	}
	if err := m.CreateLlmConfig(&config); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": config}
	this.ServeJSON()
}

// PUT /mrboard/ai/v1/models/:id
func (this *AIModelController) Update() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}

	var config m.LlmConfig
	json.Unmarshal(this.Ctx.Input.RequestBody, &config)
	config.Id = id
	if err := m.UpdateLlmConfig(&config); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success"}
	this.ServeJSON()
}

// DELETE /mrboard/ai/v1/models/:id
func (this *AIModelController) Delete() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}
	if err := m.DeleteLlmConfig(id); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success"}
	this.ServeJSON()
}
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add controllers/ai_model.go
git commit -m "feat(ai): add LLM model config controller"
```

---

### Task 12: 注册路由

**Files:**
- Modify: `routers/router.go`

- [ ] **Step 1: 在 router.go 中添加路由**

在文件末尾的 `}` 之前添加：

```go
	// AI 智能分析相关路由 | AI analysis related routes
	beego.Router("/mrboard/ai/v1/analyze", &controllers.AIAnalysisController{}, "post:Analyze")
	beego.Router("/mrboard/ai/v1/history", &controllers.AIAnalysisController{}, "get:History")
	beego.Router("/mrboard/ai/v1/history/:id", &controllers.AIAnalysisController{}, "get:HistoryDetail")
	beego.Router("/mrboard/ai/v1/chat", &controllers.AIAnalysisController{}, "post:Chat")
	beego.Router("/mrboard/ai/v1/feedback", &controllers.AIAnalysisController{}, "post:Feedback")
	beego.Router("/mrboard/ai/v1/models", &controllers.AIModelController{}, "get:List;post:Add")
	beego.Router("/mrboard/ai/v1/models/:id", &controllers.AIModelController{}, "put:Update;delete:Delete")
```

- [ ] **Step 2: 验证编译**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add routers/router.go
git commit -m "feat(ai): register AI analysis routes"
```

---

### Task 13: 前端类型定义

**Files:**
- Create: `frontend/src/types/ai.ts`

- [ ] **Step 1: 创建类型定义**

```typescript
export interface AnalysisReport {
  summary: string
  severity: 'critical' | 'warning' | 'info'
  root_cause: string
  evidence: Evidence[]
  suggestions: Suggestion[]
  related_incidents: string[]
  raw_response: string
  tokens_used: number
  rounds: number
}

export interface Evidence {
  type: 'log' | 'metric' | 'trace' | 'k8s'
  content: string
  source: string
}

export interface Suggestion {
  action: string
  risk: 'low' | 'medium' | 'high'
  command: string
}

export interface AnalysisHistory {
  id: number
  cluster_id: string
  trigger_type: string
  trigger_id: string
  alert_name: string
  severity: string
  namespace: string
  summary: string
  root_cause: string
  evidence_json: string
  suggestions_json: string
  model_used: string
  tokens_used: number
  rounds: number
  feedback_score: number
  feedback_note: string
  created_at: string
}

export interface LlmConfig {
  id: number
  name: string
  provider: string
  api_url: string
  api_key: string
  model: string
  max_tokens: number
  temperature: number
  is_default: boolean
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/ai.ts
git commit -m "feat(ai): add frontend type definitions"
```

---

### Task 14: 前端 AI 分析页面

**Files:**
- Create: `frontend/src/pages/ai/AIAnalysis.tsx`

- [ ] **Step 1: 创建主页面组件**

```tsx
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Brain, Plus, RefreshCw } from 'lucide-react'
import type { AnalysisHistory, AnalysisReport, ApiResponse } from '@/types'
import AlertList from './AlertList'
import AnalysisReportView from './AnalysisReport'
import ChatPanel from './ChatPanel'

export default function AIAnalysis() {
  const [clusterId, setClusterId] = useState(localStorage.getItem('clusterId') || '')
  const [histories, setHistories] = useState<AnalysisHistory[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch history
  const fetchHistory = async () => {
    try {
      const res = await api<ApiResponse<AnalysisHistory[]>>(`/mrboard/ai/v1/history?clusterId=${clusterId}`)
      setHistories(res.data || [])
    } catch {}
  }

  useEffect(() => {
    if (clusterId) fetchHistory()
  }, [clusterId])

  // New analysis
  const handleNewAnalysis = async (alertName: string, severity: string, namespace: string) => {
    setLoading(true)
    try {
      const res = await api<ApiResponse<AnalysisReport>>('/mrboard/ai/v1/analyze?' + new URLSearchParams({ clusterId }), {
        method: 'POST',
        body: JSON.stringify({ alert_name: alertName, severity, namespace }),
      })
      setReport(res.data)
      toast.success('分析完成')
      fetchHistory()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Load history detail
  const loadDetail = async (id: number) => {
    setSelectedId(id)
    const h = histories.find(h => h.id === id)
    if (h) {
      try {
        setReport({
          summary: h.summary,
          severity: h.severity as any,
          root_cause: h.root_cause,
          evidence: JSON.parse(h.evidence_json || '[]'),
          suggestions: JSON.parse(h.suggestions_json || '[]'),
          related_incidents: [],
          raw_response: '',
          tokens_used: h.tokens_used,
          rounds: h.rounds,
        })
      } catch {}
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AI 智能分析</h1>
            <p className="text-xs text-muted-foreground">基于日志、指标、链路的智能告警分析</p>
          </div>
        </div>
        <Button onClick={() => setReport(null)} size="sm" className="gap-1.5">
          <Plus size={14} />新建分析
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-200px)]">
        {/* Left: alert list + history */}
        <div className="w-[300px] shrink-0 space-y-3 overflow-auto">
          <AlertList
            clusterId={clusterId}
            histories={histories}
            selectedId={selectedId}
            onSelect={loadDetail}
            onAnalyze={handleNewAnalysis}
            loading={loading}
          />
        </div>

        {/* Right: report + chat */}
        <div className="flex-1 min-w-0 space-y-4 overflow-auto">
          {report ? (
            <>
              <AnalysisReportView report={report} />
              <ChatPanel
                clusterId={clusterId}
                analysisId={selectedId}
                onReply={setReport}
              />
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center space-y-2">
                  <Brain size={48} className="text-muted-foreground/20 mx-auto" />
                  <p className="text-muted-foreground text-sm">选择告警或点击「新建分析」开始</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 AlertList 组件**

Create `frontend/src/pages/ai/AlertList.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Brain, RefreshCw } from 'lucide-react'
import type { AnalysisHistory, ApiResponse } from '@/types'

interface AlertItem {
  fingerprint: string
  labels: Record<string, string>
  status: string
  startsAt: string
}

interface Props {
  clusterId: string
  histories: AnalysisHistory[]
  selectedId: number | null
  onSelect: (id: number) => void
  onAnalyze: (alertName: string, severity: string, namespace: string) => void
  loading: boolean
}

export default function AlertList({ clusterId, histories, selectedId, onSelect, onAnalyze, loading }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'alerts' | 'history'>('alerts')

  useEffect(() => {
    if (!clusterId) return
    api<ApiResponse<AlertItem[]>>(`/mrboard/alert/v1/active?clusterId=${clusterId}`)
      .then(res => setAlerts(res.data || []))
      .catch(() => {})
  }, [clusterId])

  const severityColor = (s: string) => {
    if (s === 'critical') return 'bg-red-100 text-red-700 border-red-200'
    if (s === 'warning') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        <Button variant={tab === 'alerts' ? 'default' : 'outline'} size="sm" onClick={() => setTab('alerts')} className="flex-1">
          活跃告警
        </Button>
        <Button variant={tab === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setTab('history')} className="flex-1">
          历史分析
        </Button>
      </div>

      {tab === 'alerts' ? (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">暂无活跃告警</div>
          ) : (
            alerts.map((alert, i) => {
              const name = alert.labels?.alertname || 'Unknown'
              const severity = alert.labels?.severity || 'info'
              const ns = alert.labels?.namespace || ''
              return (
                <Card key={i} className="cursor-pointer hover:border-primary/30 transition-all">
                  <CardContent className="p-3" onClick={() => onAnalyze(name, severity, ns)}>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className={`text-[10px] ${severityColor(severity)}`}>
                        {severity}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{name}</div>
                        <div className="text-[10px] text-muted-foreground">{ns}</div>
                      </div>
                      <Button size="sm" variant="ghost" disabled={loading} className="h-6 px-2">
                        <Brain size={12} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {histories.map(h => (
            <Card
              key={h.id}
              className={`cursor-pointer transition-all ${selectedId === h.id ? 'border-primary' : 'hover:border-primary/30'}`}
              onClick={() => onSelect(h.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className={`text-[10px] ${severityColor(h.severity)}`}>
                    {h.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{h.alert_name || '自由分析'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{h.summary}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 创建 AnalysisReport 组件**

Create `frontend/src/pages/ai/AnalysisReport.tsx`:

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown, FileText, Activity, Globe, Server } from 'lucide-react'
import type { AnalysisReport } from '@/types'

interface Props {
  report: AnalysisReport
}

export default function AnalysisReportView({ report }: Props) {
  const severityColor = (s: string) => {
    if (s === 'critical') return 'bg-red-100 text-red-700 border-red-200'
    if (s === 'warning') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const evidenceIcon = (type: string) => {
    switch (type) {
      case 'log': return <FileText size={14} />
      case 'metric': return <Activity size={14} />
      case 'trace': return <Globe size={14} />
      case 'k8s': return <Server size={14} />
      default: return <FileText size={14} />
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={severityColor(report.severity)}>
              {report.severity}
            </Badge>
            <h2 className="text-base font-bold">{report.summary}</h2>
          </div>
          <div className="text-sm text-foreground/80 whitespace-pre-wrap">{report.root_cause}</div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Token: {report.tokens_used}</span>
            <span>轮次: {report.rounds}</span>
          </div>
        </CardContent>
      </Card>

      {/* Evidence */}
      {report.evidence.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="text-sm font-medium mb-2">证据</div>
            {report.evidence.map((e, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                <div className="text-muted-foreground mt-0.5">{evidenceIcon(e.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-muted-foreground mb-1">{e.source}</div>
                  <div className="text-xs font-mono whitespace-pre-wrap break-all max-h-[200px] overflow-auto">{e.content}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {report.suggestions.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="text-sm font-medium mb-2">建议操作</div>
            {report.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                <Badge variant="outline" className={`text-[10px] ${s.risk === 'high' ? 'text-red-600' : s.risk === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                  {s.risk}
                </Badge>
                <div className="flex-1">
                  <div className="text-xs">{s.action}</div>
                  {s.command && <code className="text-[10px] text-muted-foreground font-mono">{s.command}</code>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">这个分析有帮助吗？</span>
        <Button variant="outline" size="sm" className="h-7 gap-1">
          <ThumbsUp size={12} />有用
        </Button>
        <Button variant="outline" size="sm" className="h-7 gap-1">
          <ThumbsDown size={12} />不准确
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 创建 ChatPanel 组件**

Create `frontend/src/pages/ai/ChatPanel.tsx`:

```tsx
import { useState } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Send, Brain } from 'lucide-react'
import type { AnalysisReport, ApiResponse } from '@/types'

interface Props {
  clusterId: string
  analysisId: number | null
  onReply: (report: AnalysisReport) => void
}

export default function ChatPanel({ clusterId, analysisId, onReply }: Props) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return
    setLoading(true)
    try {
      const res = await api<ApiResponse<AnalysisReport>>('/mrboard/ai/v1/chat?' + new URLSearchParams({ clusterId }), {
        method: 'POST',
        body: JSON.stringify({ analysis_id: analysisId, message: message.trim() }),
      })
      onReply(res.data)
      setMessage('')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-muted-foreground shrink-0" />
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="继续提问，如：帮我查下这个 Pod 最近的日志"
            className="h-9"
            disabled={loading}
          />
          <Button size="sm" onClick={handleSend} disabled={loading || !message.trim()} className="h-9 px-3 shrink-0">
            {loading ? '分析中...' : <Send size={14} />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: 验证 TypeScript 编译**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1`
Expected: no output

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ai/
git commit -m "feat(ai): add AI analysis page components"
```

---

### Task 15: 注册前端路由

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 添加 import**

在 App.tsx 的 lazy imports 区域添加：

```typescript
const AIAnalysis = lazy(() => import('@/pages/ai/AIAnalysis'))
```

- [ ] **Step 2: 添加路由**

在 Routes 中添加：

```tsx
        {/* AI Analysis */}
        <Route path="/ai/analysis" element={
          <ProtectedRoute><MainLayout><AIAnalysis /></MainLayout></ProtectedRoute>
        } />
```

- [ ] **Step 3: 添加侧边栏菜单**

在 MainLayout.tsx 的菜单数组中，在「AI助手」之前添加：

```typescript
    { label: 'AI 分析', icon: <Brain size={18} />, path: '/ai/analysis' },
```

- [ ] **Step 4: 验证编译**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/layouts/MainLayout.tsx
git commit -m "feat(ai): add AI analysis route and menu"
```

---

### Task 16: 构建部署验证

- [ ] **Step 1: 构建后端镜像**

Run: `cd /root/mrboard && mkdir -p views && nerdctl build -t mrboard:latest . 2>&1 | tail -3`

- [ ] **Step 2: 构建前端镜像**

Run: `cd /root/mrboard/frontend && nerdctl build -t xkube-frontend:latest -f Dockerfile . 2>&1 | tail -3`

- [ ] **Step 3: 部署到 K8S**

Run: `kubectl rollout restart deployment/mrboard deployment/xkube-frontend -n mrboard`

- [ ] **Step 4: 验证后端健康**

Run: `kubectl exec -n mrboard deploy/mrboard -- wget -qO- http://localhost:8080/public/check`
Expected: `{"info":"ok","status":true}`

- [ ] **Step 5: 验证 AI API**

Run: `kubectl exec -n mrboard deploy/mrboard -- wget -qO- 'http://localhost:8080/mrboard/ai/v1/models'`
Expected: `{"code":0,"msg":"success","data":[...]}`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ai): AI analysis system complete - phase 1"
```
