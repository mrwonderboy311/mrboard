package ai

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"strings"
)

const maxRounds = 5

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
	Summary     string       `json:"summary"`
	Severity    string       `json:"severity"`
	RootCause   string       `json:"root_cause"`
	Evidence    []Evidence   `json:"evidence"`
	Suggestions []Suggestion `json:"suggestions"`
	RelatedIncs []string     `json:"related_incidents"`
	RawResponse string       `json:"raw_response"`
	TokensUsed  int          `json:"tokens_used"`
	Rounds      int          `json:"rounds"`
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

// ProgressEvent represents a progress update during analysis
type ProgressEvent struct {
	Type    string `json:"type"`    // "step", "tool_call", "tool_result", "text", "done", "error"
	Step    string `json:"step"`    // human-readable step description
	Tool    string `json:"tool"`    // tool name if applicable
	Content string `json:"content"` // result content or text
	Round   int    `json:"round"`   // current round number
}

type ProgressFunc func(event ProgressEvent)

func (a *Agent) Analyze(ctx context.Context, trigger AlertTrigger, onProgress ProgressFunc) (*AnalysisReport, error) {
	systemPrompt := buildSystemPrompt()
	userPrompt := buildUserPrompt(trigger)

	messages := []Message{
		{Role: "user", Content: userPrompt},
	}
	tools := a.registry.GetDefinitions()

	var totalTokens int
	for round := 0; round < maxRounds; round++ {
		log.Printf("[AI] Round %d, messages: %d", round+1, len(messages))
		onProgress(ProgressEvent{Type: "step", Step: fmt.Sprintf("第 %d 轮推理...", round+1), Round: round + 1})

		fullMessages := append([]Message{{Role: "system", Content: systemPrompt}}, messages...)
		resp, err := a.llmClient.Call(fullMessages, tools)
		if err != nil {
			onProgress(ProgressEvent{Type: "error", Step: fmt.Sprintf("LLM 调用失败: %v", err)})
			return nil, fmt.Errorf("LLM call round %d: %w", round+1, err)
		}

		totalTokens += resp.Usage.InputTokens + resp.Usage.OutputTokens
		log.Printf("[AI] Round %d: stop_reason=%s, content_blocks=%d, tokens=%d+%d", round+1, resp.StopReason, len(resp.Content), resp.Usage.InputTokens, resp.Usage.OutputTokens)

		// Force answer on second-to-last round
		if resp.StopReason == "tool_use" && round == maxRounds-2 {
			onProgress(ProgressEvent{Type: "step", Step: "已收集足够信息，正在生成最终报告..."})
			messages = append(messages, Message{
				Role:    "user",
				Content: "你已经收集了足够的信息。现在请立即输出 JSON 格式的分析报告，不要再调用任何工具。",
			})
			continue
		}

		if resp.StopReason == "tool_use" {
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

			messages = append(messages, Message{Role: "assistant", Content: assistantContent})

			// Report tool calls with human-readable names
			toolNames := map[string]string{
				"query_logs":     "查询 Loki 日志",
				"query_metrics":  "查询 Prometheus 指标",
				"query_traces":   "查询 Tempo 链路",
				"get_pod_status": "查看 Pod 状态",
				"get_pod_logs":   "查看 Pod 日志",
				"get_events":     "查看集群事件",
				"search_memory":  "搜索历史记忆",
				"save_memory":    "保存分析结论",
			}
			for _, tc := range toolCalls {
				name := toolNames[tc.Name]
				if name == "" {
					name = tc.Name
				}
				onProgress(ProgressEvent{Type: "tool_call", Tool: tc.Name, Step: name, Round: round + 1})
			}

			results := a.registry.Execute(trigger.ClusterId, toolCalls)

			var toolResultContent []map[string]interface{}
			for _, r := range results {
				content := r.Content
				// Truncate large tool results to prevent context overflow
				if len(content) > 2000 {
					content = content[:2000] + "\n...(truncated)"
				}
				toolResultContent = append(toolResultContent, map[string]interface{}{
					"type":       "tool_result",
					"tool_use_id": r.ToolUseId,
					"content":    content,
					"is_error":   r.IsError,
				})
			}
			messages = append(messages, Message{Role: "user", Content: toolResultContent})
			continue
		}

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
		onProgress(ProgressEvent{Type: "done", Step: "分析完成"})
		return report, nil
	}

	onProgress(ProgressEvent{Type: "error", Step: "达到最大推理轮次"})
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

分析流程（最多调用 3-5 个工具，然后必须输出最终分析报告）：
1. 先搜索记忆，看是否有类似告警的历史分析
2. 根据告警类型，选择最关键的 1-2 个数据源查询（日志或指标，不要全部查）
3. 如果需要，查看 Pod 状态或事件
4. 立即综合已有信息，输出结构化分析报告

重要：不要过度收集数据。调用 3-5 个工具后，必须输出 JSON 格式的分析报告。不要继续调用工具。

输出格式（严格使用以下 JSON 结构，不要使用其他字段名）：
{"summary":"问题一句话摘要","severity":"critical或warning或info","root_cause":"详细的根因分析","evidence":[{"type":"log或metric或k8s","content":"证据内容","source":"数据来源"}],"suggestions":[{"action":"建议操作","risk":"low或medium或high","command":"kubectl命令"}],"related_incidents":[]}

请用中文回答。必须输出上述 JSON 格式，不要包裹在 markdown 代码块中。`
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

	// Try to extract JSON from the response (handle markdown code blocks)
	cleaned := text
	// Remove ```json ... ``` wrappers
	for {
		start := strings.Index(cleaned, "```")
		if start < 0 {
			break
		}
		end := strings.Index(cleaned[start+3:], "```")
		if end < 0 {
			break
		}
		inner := cleaned[start+3 : start+3+end]
		// Remove "json" language tag if present
		inner = strings.TrimPrefix(inner, "json\n")
		inner = strings.TrimPrefix(inner, "JSON\n")
		cleaned = strings.TrimSpace(inner)
	}

	jsonStart := strings.Index(cleaned, "{")
	jsonEnd := strings.LastIndex(cleaned, "}")
	if jsonStart >= 0 && jsonEnd > jsonStart {
		jsonStr := cleaned[jsonStart : jsonEnd+1]
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

			// Handle alternative JSON structures from LLM
			if report.Summary == "" || report.RootCause == "" {
				var alt map[string]interface{}
				json.Unmarshal([]byte(jsonStr), &alt)

				// Extract summary (English + Chinese field names)
				if report.Summary == "" {
					report.Summary = extractString(alt, "summary",
						"alert_summary.name", "alert.name", "analysis.summary",
						"alert_analysis_report.alert_info.name",
						"rootCauseAnalysis.summary", "conclusion",
						"alert_analysis.analysis_summary",
						"告警分析.分析结论", "告警分析.告警名称",
						"告警概述.告警名称", "告警概述.alert_name",
						"总结", "conclusion")
				}

				// Extract severity
				if report.Severity == "warning" {
					if s := extractString(alt, "severity", "alert.severity",
						"alert_summary.severity", "告警分析.严重级别",
						"alert_analysis.alert_info.severity",
						"告警概述.严重级别"); s != "" {
						report.Severity = s
					}
				}

				// Extract root cause (English + Chinese)
				if report.RootCause == "" {
					report.RootCause = extractString(alt, "root_cause",
						"root_cause_analysis.primary_cause", "analysis.summary",
						"rootCauseAnalysis.summary", "conclusion",
						"alert_analysis.root_cause_analysis.primary_cause",
						"告警分析.分析结论",
						"根因分析.直接原因", "根因分析.根本原因",
						"根因分析.primary_cause", "根因分析.root_cause")
					if report.RootCause == "" {
						report.RootCause = extractStringArray(alt,
							"analysis.possibleRootCauses", "possible_reasons",
							"root_cause_analysis.possible_reasons",
							"rootCauseAnalysis.possibleCauses",
							"alert_analysis.root_cause_analysis.contributing_factors",
							"可能原因", "根因分析.可能原因", "根因分析.证据链")
					}
				}

				// Extract suggestions (English + Chinese)
				if report.Suggestions == nil {
					report.Suggestions = extractSuggestions(alt, "recommendations",
						"resolution_recommendations", "immediate_actions",
						"recommendedActions.immediateSteps",
						"recommendedActions.resolutionOptions",
						"recommendedActions.furtherInvestigation",
						"alert_analysis.recommended_actions.immediate_actions",
						"alert_analysis.recommended_actions.short_term_fixes",
						"alert_analysis.recommended_actions.long_term_optimizations",
						"解决建议", "紧急处理", "预防措施")
				}
			}
			// Fallback: if summary or root_cause still empty after all parsing, use raw text
			if report.Summary == "" {
				report.Summary = truncateText(text, 200)
			}
			if report.RootCause == "" {
				report.RootCause = text
			}
			return report
		}
	}

	report.Summary = truncateText(text, 200)
	report.RootCause = text
	return report
}

// truncateText truncates text to maxLen characters
func truncateText(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen] + "..."
}

// extractString tries to get a string value from a map using multiple dot-separated paths
func extractString(m map[string]interface{}, paths ...string) string {
	for _, path := range paths {
		parts := strings.Split(path, ".")
		var current interface{} = m
		found := true
		for _, part := range parts {
			cm, ok := current.(map[string]interface{})
			if !ok {
				found = false
				break
			}
			current, found = cm[part]
			if !found {
				break
			}
		}
		if found {
			if s, ok := current.(string); ok && s != "" {
				return s
			}
		}
	}
	return ""
}

// extractStringArray tries to get a string array from a map and joins it
func extractStringArray(m map[string]interface{}, paths ...string) string {
	for _, path := range paths {
		parts := strings.Split(path, ".")
		var current interface{} = m
		found := true
		for _, part := range parts {
			cm, ok := current.(map[string]interface{})
			if !ok {
				found = false
				break
			}
			current, found = cm[part]
			if !found {
				break
			}
		}
		if found {
			if arr, ok := current.([]interface{}); ok && len(arr) > 0 {
				pieces := make([]string, 0, len(arr))
				for _, item := range arr {
					if s, ok := item.(string); ok {
						pieces = append(pieces, "- "+s)
					}
				}
				return strings.Join(pieces, "\n")
			}
		}
	}
	return ""
}

// extractSuggestions tries to extract suggestions from various LLM output formats
func extractSuggestions(m map[string]interface{}, keys ...string) []Suggestion {
	for _, key := range keys {
		parts := strings.Split(key, ".")
		var current interface{} = m
		found := true
		for _, part := range parts {
			cm, ok := current.(map[string]interface{})
			if !ok {
				found = false
				break
			}
			current, found = cm[part]
			if !found {
				break
			}
		}
		if !found {
			continue
		}

		arr, ok := current.([]interface{})
		if !ok || len(arr) == 0 {
			continue
		}

		var suggestions []Suggestion
		for _, item := range arr {
			switch v := item.(type) {
			case map[string]interface{}:
				s := Suggestion{Risk: "medium"}
				// English fields
				if a, ok := v["action"].(string); ok {
					s.Action = a
				}
				if c, ok := v["command"].(string); ok {
					s.Command = c
				}
				if c, ok := v["command_example"].(string); ok && s.Command == "" {
					s.Command = c
				}
				if d, ok := v["details"].(string); ok && s.Action != "" {
					s.Action = s.Action + " — " + d
				}
				if p, ok := v["purpose"].(string); ok && s.Action != "" {
					s.Action = s.Action + " (" + p + ")"
				}
				// Chinese fields
				if desc, ok := v["描述"].(string); ok && s.Action == "" {
					s.Action = desc
				}
				if op, ok := v["操作"].(string); ok && s.Action == "" {
					s.Action = op
				}
				if cmd, ok := v["命令"].(string); ok && s.Command == "" {
					s.Command = cmd
				}
				if purpose, ok := v["目的"].(string); ok && s.Action != "" {
					s.Action = s.Action + " — " + purpose
				}
				if s.Action != "" {
					suggestions = append(suggestions, s)
				}
			case string:
				// Handle "1. xxx" format strings
				cleaned := v
				if len(cleaned) > 2 && cleaned[0] >= '0' && cleaned[0] <= '9' && cleaned[1] == '.' {
					cleaned = strings.TrimSpace(cleaned[2:])
				}
				if cleaned != "" {
					suggestions = append(suggestions, Suggestion{Action: cleaned, Risk: "medium"})
				}
			}
		}
		if len(suggestions) > 0 {
			return suggestions
		}
	}
	return nil
}
