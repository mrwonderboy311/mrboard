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
				// Log tool result size for debugging
				log.Printf("[AI] Tool %s result: %d bytes, error=%v", r.ToolUseId[:8], len(content), r.IsError)
				if len(content) > 0 && len(content) < 500 {
					log.Printf("[AI] Tool result content: %s", content)
				}
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
	return `你是一个 Kubernetes 集群智能分析助手。你的任务是分析告警问题，找出根因，提供具体可执行的解决方案。

## 可用工具
- get_pod_status: 查看指定命名空间的 Pod 状态（必用！先看 Pod 在什么状态）
- get_pod_logs: 查看 Pod 日志（必用！看容器为什么失败）
- get_events: 查看集群事件（必用！看调度、拉镜像、启动等错误）
- query_logs: 查询 Loki 日志
- query_metrics: 查询 Prometheus 指标
- search_memory: 搜索历史分析记忆
- save_memory: 保存分析结论

## 分析流程（必须严格按顺序执行，每一步都要调用工具）
1. 调用 search_memory(keyword="告警名称", fingerprint="指纹") — 搜索历史记忆（只调一次！）
2. 调用 get_pod_status(namespace="告警中的命名空间") — 看 Pod 在什么状态
3. 调用 get_events(namespace="告警中的命名空间") — 看事件中的错误原因
4. 调用 get_pod_logs(namespace="告警中的命名空间") — 看容器日志
5. 综合以上工具返回的实际数据，输出分析报告

禁止：每个工具最多调一次。不要重复调用同一工具。

## 核心规则
- 你的分析必须基于工具返回的实际数据，不要凭空猜测
- 如果工具返回了 "Back-off pulling image" 错误，root_cause 必须明确指出"镜像拉取失败"
- 如果工具返回了 "Insufficient cpu/memory"，root_cause 必须指出"资源不足"
- 如果工具返回了 "CrashLoopBackOff"，root_cause 必须包含具体的崩溃原因
- suggestions 中的 command 必须是具体的、可直接执行的命令
- 不要说"建议查看..."，而是直接把你看到的告诉用户

## 输出格式（必须严格遵守，不要添加其他字段，不要包裹在 markdown 代码块中）
你的最终输出必须是且仅是以下 JSON，不要在 JSON 前后添加任何文字或 markdown 标记：

{"summary":"一句话说明什么问题导致了什么现象","severity":"critical或warning或info","root_cause":"详细根因：基于工具返回的具体数据说明为什么会触发这个告警","evidence":[{"type":"log或metric或k8s","content":"工具返回的关键数据片段","source":"数据来源"}],"suggestions":[{"action":"具体操作步骤","risk":"low或medium或high","command":"可直接复制执行的kubectl命令"}],"related_incidents":[]}

## 根因分析要求
root_cause 必须包含：
1. 告警触发的直接原因（如：Pod 处于 Pending 状态）
2. 根本原因（如：节点资源不足导致调度失败，或镜像拉取失败）
3. 影响范围（如：导致 xxx 服务不可用）

## 建议操作要求
suggestions 中每个条目必须包含可直接执行的 command，如：
- kubectl describe pod xxx -n yyy
- kubectl logs xxx -n yyy --previous
- kubectl rollout restart deployment/xxx -n yyy

请用中文回答。`
}

func buildUserPrompt(trigger AlertTrigger) string {
	fingerprint := Fingerprint(trigger)
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("## 告警信息\n\n- 告警名称: %s\n- 严重级别: %s\n- 命名空间: %s\n- 集群: %s\n- 触发时间: %s\n- 指纹: %s\n",
		trigger.AlertName, trigger.Severity, trigger.Namespace, trigger.ClusterId, trigger.StartsAt, fingerprint))

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
						"alertName", "alert_name",
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
						"rootCause", "root_cause_analysis.primary_cause", "analysis.summary",
						"rootCauseAnalysis.summary", "conclusion",
						"alert_analysis.root_cause_analysis.primary_cause",
						"alert_analysis.rootCause",
						"告警分析.分析结论",
						"根因分析.直接原因", "根因分析.根本原因",
						"根因分析.primary_cause", "根因分析.root_cause")
					// Handle rootCause as object with category+summary
					if report.RootCause == "" {
						keys := []string{"rootCause", "root_cause"}
						// Also check inside alert_analysis wrapper
						if aa, ok := alt["alert_analysis"].(map[string]interface{}); ok {
							for _, key := range keys {
								if rc, ok := aa[key].(map[string]interface{}); ok {
									cat, _ := rc["category"].(string)
									sum, _ := rc["summary"].(string)
									if cat != "" && sum != "" {
										report.RootCause = cat + "：" + sum
									} else if sum != "" {
										report.RootCause = sum
									} else if cat != "" {
										report.RootCause = cat
									}
								}
							}
						}
						for _, key := range keys {
							if report.RootCause != "" {
								break
							}
							if rc, ok := alt[key].(map[string]interface{}); ok {
								cat, _ := rc["category"].(string)
								sum, _ := rc["summary"].(string)
								if cat != "" && sum != "" {
									report.RootCause = cat + "：" + sum
								} else if sum != "" {
									report.RootCause = sum
								} else if cat != "" {
									report.RootCause = cat
								}
							}
						}
					}
					// Try nested detailedAnalysis if still empty
					if report.RootCause == "" {
						if da, ok := alt["detailedAnalysis"].(map[string]interface{}); ok {
							if impact, ok := da["impact"].(string); ok {
								report.RootCause = impact
							}
						}
						if aa, ok := alt["alert_analysis"].(map[string]interface{}); ok {
							if da, ok := aa["detailedAnalysis"].(map[string]interface{}); ok {
								if impact, ok := da["impact"].(string); ok && report.RootCause == "" {
									report.RootCause = impact
								}
							}
						}
					}
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
						"immediateActions", "immediate_actions",
						"resolution_recommendations",
						"recommendedActions.immediateSteps",
						"recommendedActions.resolutionOptions",
						"recommendedActions.furtherInvestigation",
						"alert_analysis.immediateActions",
						"alert_analysis.recommendations",
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

		// Handle dict with sub-arrays (e.g., recommendations.immediate_actions)
		if dict, ok := current.(map[string]interface{}); ok {
			subKeys := []string{"immediate_actions", "immediateActions", "short_term_fixes", "preventive_measures", "follow_up", "steps", "actions"}
			for _, subKey := range subKeys {
				if subArr, ok := dict[subKey].([]interface{}); ok && len(subArr) > 0 {
					var suggestions []Suggestion
					for _, item := range subArr {
						if s, ok := item.(string); ok {
							suggestions = append(suggestions, Suggestion{Action: s, Risk: "medium"})
						} else if m, ok := item.(map[string]interface{}); ok {
							sug := Suggestion{Risk: "medium"}
							sug.Action, _ = m["action"].(string)
							sug.Command, _ = m["command"].(string)
							if sug.Action == "" {
								sug.Action, _ = m["description"].(string)
							}
							if sug.Action != "" {
								suggestions = append(suggestions, sug)
							}
						}
					}
					if len(suggestions) > 0 {
						return suggestions
					}
				}
			}
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
