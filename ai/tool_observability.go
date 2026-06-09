package ai

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	m "mrboard/models"
)

func RegisterObservabilityTools(registry *ToolRegistry) {
	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "query_logs",
			Description: "查询 Loki 日志。输入 LogQL 查询表达式和可选的 limit。返回最近的日志条目。",
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
	if params.Limit <= 0 || params.Limit > 20 {
		params.Limit = 20
	}

	lokiUrl, err := m.GetLokiUrl(clusterId)
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

	promUrl, err := m.GetPrometheusUrl(clusterId)
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

	tempoUrl, err := m.GetTempoUrl(clusterId)
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
	return 3600
}
