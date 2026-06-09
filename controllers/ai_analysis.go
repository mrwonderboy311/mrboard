package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"

	"mrboard/ai"
	m "mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
)

type AIAnalysisController struct {
	beego.Controller
}

func (this *AIAnalysisController) Analyze() {
	clusterId := this.GetString("clusterId")
	if clusterId == "" {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "clusterId required"}
		this.ServeJSON()
		return
	}

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

	trigger := ai.AlertTrigger{
		AlertName: req.AlertName,
		Severity:  req.Severity,
		Namespace: req.Namespace,
		ClusterId: clusterId,
		Labels:    req.Labels,
		Message:   req.Message,
	}

	agent := ai.NewAgent(ai.LLMConfig{
		ApiUrl:      llmConfig.ApiUrl,
		ApiKey:      llmConfig.ApiKey,
		Model:       llmConfig.Model,
		MaxTokens:   llmConfig.MaxTokens,
		Temperature: llmConfig.Temperature,
	})

	report, err := agent.Analyze(this.Ctx.Request.Context(), trigger, func(e ai.ProgressEvent) {})
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

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

// AnalyzeStream SSE endpoint for real-time analysis progress
func (this *AIAnalysisController) AnalyzeStream() {
	clusterId := this.GetString("clusterId")
	if clusterId == "" {
		this.Ctx.Output.SetStatus(400)
		this.Ctx.WriteString("clusterId required")
		return
	}

	var req struct {
		AlertName string            `json:"alert_name"`
		Severity  string            `json:"severity"`
		Namespace string            `json:"namespace"`
		Labels    map[string]string `json:"labels"`
		Message   string            `json:"message"`
		ModelId   int64             `json:"model_id"`
	}
	json.Unmarshal(this.Ctx.Input.RequestBody, &req)

	var llmConfig *m.LlmConfig
	var err error
	if req.ModelId > 0 {
		llmConfig, err = m.GetLlmConfig(req.ModelId)
	} else {
		llmConfig, err = m.GetDefaultLlmConfig()
	}
	if err != nil {
		this.Ctx.Output.SetStatus(400)
		this.Ctx.WriteString("LLM config not found")
		return
	}

	// Set SSE headers
	w := this.Ctx.ResponseWriter
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.Flush()

	sendEvent := func(eventType string, data interface{}) {
		jsonData, _ := json.Marshal(data)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", eventType, string(jsonData))
		w.Flush()
	}

	trigger := ai.AlertTrigger{
		AlertName: req.AlertName,
		Severity:  req.Severity,
		Namespace: req.Namespace,
		ClusterId: clusterId,
		Labels:    req.Labels,
		Message:   req.Message,
	}

	agent := ai.NewAgent(ai.LLMConfig{
		ApiUrl:      llmConfig.ApiUrl,
		ApiKey:      llmConfig.ApiKey,
		Model:       llmConfig.Model,
		MaxTokens:   llmConfig.MaxTokens,
		Temperature: llmConfig.Temperature,
	})

	report, err := agent.Analyze(this.Ctx.Request.Context(), trigger, func(e ai.ProgressEvent) {
		sendEvent("progress", e)
	})

	if err != nil {
		sendEvent("error", map[string]string{"message": err.Error()})
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

	sendEvent("result", report)
}

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

func (this *AIAnalysisController) DeleteHistory() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}
	if err := m.DeleteAnalysisHistory(id); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success"}
	this.ServeJSON()
}

func (this *AIAnalysisController) CleanHistory() {
	clusterId := this.GetString("clusterId")
	days, _ := this.GetInt("days", 1)
	count, err := m.CleanOldAnalysisHistory(clusterId, days)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "deleted": count}
	this.ServeJSON()
}

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

	report, err := agent.Analyze(this.Ctx.Request.Context(), trigger, func(e ai.ProgressEvent) {})
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": report}
	this.ServeJSON()
}

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

// AlertWebhook receives Alertmanager webhook and auto-triggers AI analysis
func (this *AIAnalysisController) AlertWebhook() {
	var alerts []struct {
		Labels      map[string]string `json:"labels"`
		Annotations map[string]string `json:"annotations"`
		StartsAt    string            `json:"startsAt"`
		EndsAt      string            `json:"endsAt"`
		Status      string            `json:"status"`
	}
	if err := json.Unmarshal(this.Ctx.Input.RequestBody, &alerts); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid payload"}
		this.ServeJSON()
		return
	}

	clusterId := this.GetString("clusterId")
	if clusterId == "" {
		clusterId = "local-cluster"
	}

	for _, alert := range alerts {
		if alert.Status != "firing" {
			continue
		}
		go func(a struct {
			Labels      map[string]string `json:"labels"`
			Annotations map[string]string `json:"annotations"`
			StartsAt    string            `json:"startsAt"`
			EndsAt      string            `json:"endsAt"`
			Status      string            `json:"status"`
		}) {
			llmConfig, err := m.GetDefaultLlmConfig()
			if err != nil {
				log.Printf("[AI] AlertWebhook: no LLM config: %v", err)
				return
			}
			trigger := ai.AlertTrigger{
				AlertName: a.Labels["alertname"],
				Severity:  a.Labels["severity"],
				Namespace: a.Labels["namespace"],
				ClusterId: clusterId,
				Labels:    a.Labels,
				StartsAt:  a.StartsAt,
				Message:   a.Annotations["message"],
			}
			agent := ai.NewAgent(ai.LLMConfig{
				ApiUrl:      llmConfig.ApiUrl,
				ApiKey:      llmConfig.ApiKey,
				Model:       llmConfig.Model,
				MaxTokens:   llmConfig.MaxTokens,
				Temperature: llmConfig.Temperature,
			})
			report, err := agent.Analyze(context.Background(), trigger, func(e ai.ProgressEvent) {})
			if err != nil {
				log.Printf("[AI] AlertWebhook analyze error: %v", err)
				return
			}
			evidenceJson, _ := json.Marshal(report.Evidence)
			suggestionsJson, _ := json.Marshal(report.Suggestions)
			history := &m.AnalysisHistory{
				ClusterId:       clusterId,
				TriggerType:     "webhook",
				AlertName:       a.Labels["alertname"],
				Severity:        report.Severity,
				Namespace:       a.Labels["namespace"],
				Summary:         report.Summary,
				RootCause:       report.RootCause,
				EvidenceJson:    string(evidenceJson),
				SuggestionsJson: string(suggestionsJson),
				ModelUsed:       llmConfig.Model,
				TokensUsed:      report.TokensUsed,
				Rounds:          report.Rounds,
			}
			m.CreateAnalysisHistory(history)
			log.Printf("[AI] AlertWebhook: auto-analyzed %s, summary: %s", a.Labels["alertname"], report.Summary)
		}(alert)
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "accepted"}
	this.ServeJSON()
}
