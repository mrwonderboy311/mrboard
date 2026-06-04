// tempo_trace_model.go
// Tempo链路追踪模型 / Tempo distributed tracing model
package models

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"xkube/common"

	"github.com/beego/beego/v2/client/orm"
)

// TempoTrace 链路摘要 / Trace summary
type TempoTrace struct {
	TraceID       string `json:"traceID"`
	RootService   string `json:"rootService"`
	RootOperation string `json:"rootOperation"`
	Duration      int64  `json:"duration"`
	SpanCount     int    `json:"spanCount"`
	StartTime     int64  `json:"startTime"`
	Status        string `json:"status"`
}

// TempoSpan 链路跨度 / Trace span
type TempoSpan struct {
	SpanID        string            `json:"spanID"`
	TraceID       string            `json:"traceID"`
	ParentSpanID  string            `json:"parentSpanID"`
	OperationName string            `json:"operationName"`
	ServiceName   string            `json:"serviceName"`
	StartTime     int64             `json:"startTime"`
	Duration      int64             `json:"duration"`
	Status        string            `json:"status"`
	Tags          map[string]string `json:"tags"`
}

// TempoTraceDetail 链路详情 / Trace detail
type TempoTraceDetail struct {
	TraceID       string      `json:"traceID"`
	Spans         []TempoSpan `json:"spans"`
	Services      []string    `json:"services"`
	RootService   string      `json:"rootService"`
	RootOperation string      `json:"rootOperation"`
	Duration      int64       `json:"duration"`
}

// TempoDependency 服务依赖 / Service dependency
type TempoDependency struct {
	Parent       string  `json:"parent"`
	Child        string  `json:"child"`
	CallCount    int64   `json:"callCount"`
	Rpm          int64   `json:"rpm"`
	AvgLatencyMs float64 `json:"avgLatencyMs"`
	ErrorRate    float64 `json:"errorRate"`
}

// tempo API响应结构 / Tempo API response structures
type tempoSearchResponse struct {
	Traces []tempoSearchTrace `json:"traces"`
}

type tempoSearchTrace struct {
	TraceID           string            `json:"traceID"`
	RootServiceName   string            `json:"rootServiceName"`
	RootTraceName     string            `json:"rootTraceName"`
	StartTimeUnixNano string            `json:"startTimeUnixNano"`
	DurationMs        int64             `json:"durationMs"`
	SpanCount         int               `json:"spanCount"`
	SpanSets          []tempoSpanSet    `json:"spanSets"`
}

type tempoSpanSet struct {
	Spans []tempoSearchSpan `json:"spans"`
}

type tempoSearchSpan struct {
	SpanID            string         `json:"spanID"`
	StartTimeUnixNano string         `json:"startTimeUnixNano"`
	DurationNanos     int64          `json:"durationNanos"`
	Name              string         `json:"name"`
	Attributes        []tempoAttr    `json:"attributes"`
}

type tempoAttr struct {
	Key   string      `json:"key"`
	Value tempoValue  `json:"value"`
}

type tempoValue struct {
	StringValue string `json:"stringValue"`
}

type tempoTraceResponse struct {
	Batches []tempoBatch `json:"batches"`
}

type tempoBatch struct {
	Resource  tempoResource   `json:"resource"`
	ScopeSpans []tempoScopeSpan `json:"scopeSpans"`
}

type tempoResource struct {
	Attributes []tempoAttr `json:"attributes"`
}

type tempoScopeSpan struct {
	Spans []tempoRawSpan `json:"spans"`
}

type tempoRawSpan struct {
	TraceID           string      `json:"traceId"`
	SpanID            string      `json:"spanId"`
	ParentSpanID      string      `json:"parentSpanId"`
	Name              string      `json:"name"`
	StartTimeUnixNano string      `json:"startTimeUnixNano"`
	EndTimeUnixNano   string      `json:"endTimeUnixNano"`
	Attributes        []tempoAttr `json:"attributes"`
	Status            tempoStatus `json:"status"`
}

type tempoStatus struct {
	Code int `json:"code"`
}

type tempoTagsResponse struct {
	TagNames []string `json:"tagNames"`
}

type tempoTagValuesResponse struct {
	TagValues []string `json:"tagValues"`
}

// GetTempoUrl 获取集群的Tempo地址 / Get Tempo URL for cluster
func GetTempoUrl(clusterId string) (string, error) {
	// Redis缓存
	cacheKey := "tempoUrl:" + clusterId
	if cached := common.Get(cacheKey); cached != "" {
		return cached, nil
	}

	o := orm.NewOrm()
	var tempoUrl string
	err := o.Raw("SELECT tempo_url FROM xkb_cluster WHERE cluster_id = ?", clusterId).QueryRow(&tempoUrl)
	if err != nil {
		return "", fmt.Errorf("query tempo_url error: %v", err)
	}
	if tempoUrl == "" {
		return "", fmt.Errorf("tempo_url is empty for cluster %s", clusterId)
	}

	// 缓存600秒
	_ = common.SetEx(cacheKey, tempoUrl, 600)
	return tempoUrl, nil
}

// tempoHttpGet Tempo HTTP GET请求 / Tempo HTTP GET request
func tempoHttpGet(reqUrl string) ([]byte, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(reqUrl)
	if err != nil {
		return nil, fmt.Errorf("http get error: %v", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body error: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("http status %d: %s", resp.StatusCode, string(body))
	}
	return body, nil
}

// getAttrValue 从属性列表中获取值 / Get value from attribute list
func getAttrValue(attrs []tempoAttr, key string) string {
	for _, a := range attrs {
		if a.Key == key {
			return a.Value.StringValue
		}
	}
	return ""
}

// SearchTraces 搜索链路 / Search traces
func SearchTraces(clusterId, service, operation, tags, start, end, limit, minDuration, maxDuration string) ([]TempoTrace, error) {
	tempoUrl, err := GetTempoUrl(clusterId)
	if err != nil {
		return nil, err
	}

	params := url.Values{}
	if service != "" {
		params.Set("service.name", service)
	}
	if operation != "" {
		params.Set("name", operation)
	}
	if tags != "" {
		params.Set("tags", tags)
	}
	if start != "" {
		params.Set("start", start)
	}
	if end != "" {
		params.Set("end", end)
	}
	if limit != "" {
		params.Set("limit", limit)
	} else {
		params.Set("limit", "20")
	}
	if minDuration != "" {
		params.Set("minDuration", minDuration)
	}
	if maxDuration != "" {
		params.Set("maxDuration", maxDuration)
	}

	reqUrl := fmt.Sprintf("%s/api/search?%s", tempoUrl, params.Encode())
	body, err := tempoHttpGet(reqUrl)
	if err != nil {
		return nil, err
	}

	var resp tempoSearchResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse search response error: %v", err)
	}

	var traces []TempoTrace
	for _, t := range resp.Traces {
		trace := TempoTrace{
			TraceID:       t.TraceID,
			RootService:   t.RootServiceName,
			RootOperation: t.RootTraceName,
			Duration:      t.DurationMs * 1000000, // ms → ns for frontend compatibility
			SpanCount:     t.SpanCount,
			Status:        "ok",
		}
		// Parse start time
		if t.StartTimeUnixNano != "" {
			var ts int64
			fmt.Sscanf(t.StartTimeUnixNano, "%d", &ts)
			trace.StartTime = ts
		}
		traces = append(traces, trace)
	}

	return traces, nil
}

// GetTraceDetail 获取链路详情 / Get trace detail
func GetTraceDetail(clusterId, traceId string) (*TempoTraceDetail, error) {
	tempoUrl, err := GetTempoUrl(clusterId)
	if err != nil {
		return nil, err
	}

	reqUrl := fmt.Sprintf("%s/api/traces/%s", tempoUrl, traceId)
	body, err := tempoHttpGet(reqUrl)
	if err != nil {
		return nil, err
	}

	var resp tempoTraceResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse trace response error: %v", err)
	}

	detail := &TempoTraceDetail{
		TraceID: traceId,
	}
	serviceSet := make(map[string]bool)

	for _, batch := range resp.Batches {
		serviceName := getAttrValue(batch.Resource.Attributes, "service.name")
		if serviceName == "" {
			serviceName = "unknown"
		}
		serviceSet[serviceName] = true

		for _, scope := range batch.ScopeSpans {
			for _, s := range scope.Spans {
				span := TempoSpan{
					SpanID:        s.SpanID,
					TraceID:       s.TraceID,
					ParentSpanID:  s.ParentSpanID,
					OperationName: s.Name,
					ServiceName:   serviceName,
					Tags:          make(map[string]string),
				}

				// Parse start time
				if s.StartTimeUnixNano != "" {
					var ts int64
					fmt.Sscanf(s.StartTimeUnixNano, "%d", &ts)
					span.StartTime = ts
				}

				// Parse end time for duration
				if s.EndTimeUnixNano != "" && s.StartTimeUnixNano != "" {
					var startNs, endNs int64
					fmt.Sscanf(s.StartTimeUnixNano, "%d", &startNs)
					fmt.Sscanf(s.EndTimeUnixNano, "%d", &endNs)
					span.Duration = endNs - startNs
				}

				// Parse status
				if s.Status.Code == 2 {
					span.Status = "error"
				} else {
					span.Status = "ok"
				}

				// Parse attributes as tags
				for _, attr := range s.Attributes {
					span.Tags[attr.Key] = attr.Value.StringValue
				}

				// Check for error in attributes
				if getAttrValue(s.Attributes, "otel.status_code") == "ERROR" {
					span.Status = "error"
				}

				detail.Spans = append(detail.Spans, span)
			}
		}
	}

	// Build services list
	for svc := range serviceSet {
		detail.Services = append(detail.Services, svc)
	}

	// Find root span (no parent) for root info
	for _, span := range detail.Spans {
		if span.ParentSpanID == "" || span.ParentSpanID == "0000000000000000" {
			detail.RootService = span.ServiceName
			detail.RootOperation = span.OperationName
			break
		}
	}

	// Calculate total duration from root span
	for _, span := range detail.Spans {
		if span.ParentSpanID == "" || span.ParentSpanID == "0000000000000000" {
			detail.Duration = span.Duration
			break
		}
	}

	return detail, nil
}

// prometheusQueryResponse Prometheus query API响应
type prometheusQueryResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Metric struct {
				Client string `json:"client"`
				Server string `json:"server"`
			} `json:"metric"`
			Value [2]interface{} `json:"value"`
		} `json:"result"`
	} `json:"data"`
}

// GetDependencies 获取服务依赖 / Get service dependencies (via Prometheus service graph metrics)
func GetDependencies(clusterId, start, end string) ([]TempoDependency, error) {
	// Service graph metrics are written to Prometheus by Tempo's metrics-generator
	promUrl := "http://kps-kube-prometheus-stack-prometheus.observability.svc.cluster.local:9090"

	// Query 1: total call counts
	query := "traces_service_graph_request_total"
	reqUrl := fmt.Sprintf("%s/api/v1/query?query=%s", promUrl, query)

	body, err := tempoHttpGet(reqUrl)
	if err != nil {
		return nil, err
	}

	var resp prometheusQueryResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse prometheus response error: %v", err)
	}

	// Build deps map keyed by parent+child
	depMap := make(map[string]*TempoDependency)
	for _, r := range resp.Data.Result {
		var count int64
		if s, ok := r.Value[1].(string); ok {
			fmt.Sscanf(s, "%d", &count)
		}
		key := r.Metric.Client + "|" + r.Metric.Server
		depMap[key] = &TempoDependency{
			Parent:    r.Metric.Client,
			Child:     r.Metric.Server,
			CallCount: count,
		}
	}

	// Query 2: rpm via rate (multiply by 60 for per-minute)
	rpmQuery := "rate(traces_service_graph_request_total[1m]) * 60"
	rpmUrl := fmt.Sprintf("%s/api/v1/query?query=%s", promUrl, rpmQuery)
	if rpmBody, err := tempoHttpGet(rpmUrl); err == nil {
		var rpmResp prometheusQueryResponse
		if json.Unmarshal(rpmBody, &rpmResp) == nil {
			for _, r := range rpmResp.Data.Result {
				key := r.Metric.Client + "|" + r.Metric.Server
				if dep, ok := depMap[key]; ok {
					if s, ok := r.Value[1].(string); ok {
						var rpm float64
						fmt.Sscanf(s, "%f", &rpm)
						dep.Rpm = int64(rpm + 0.5)
					}
				}
			}
		}
	}

	// Query 3: average latency from duration histogram
	latencyQuery := "traces_service_graph_request_duration_seconds_sum / traces_service_graph_request_duration_seconds_count * 1000"
	latencyUrl := fmt.Sprintf("%s/api/v1/query?query=%s", promUrl, latencyQuery)
	if latencyBody, err := tempoHttpGet(latencyUrl); err == nil {
		var latencyResp prometheusQueryResponse
		if json.Unmarshal(latencyBody, &latencyResp) == nil {
			for _, r := range latencyResp.Data.Result {
				key := r.Metric.Client + "|" + r.Metric.Server
				if dep, ok := depMap[key]; ok {
					if s, ok := r.Value[1].(string); ok {
						fmt.Sscanf(s, "%f", &dep.AvgLatencyMs)
					}
				}
			}
		}
	}

	// Query 4: error rate = failed / total
	errorQuery := "traces_service_graph_request_failed_total / traces_service_graph_request_total"
	errorUrl := fmt.Sprintf("%s/api/v1/query?query=%s", promUrl, errorQuery)
	if errorBody, err := tempoHttpGet(errorUrl); err == nil {
		var errorResp prometheusQueryResponse
		if json.Unmarshal(errorBody, &errorResp) == nil {
			for _, r := range errorResp.Data.Result {
				key := r.Metric.Client + "|" + r.Metric.Server
				if dep, ok := depMap[key]; ok {
					if s, ok := r.Value[1].(string); ok {
						fmt.Sscanf(s, "%f", &dep.ErrorRate)
					}
				}
			}
		}
	}

	var deps []TempoDependency
	for _, dep := range depMap {
		deps = append(deps, *dep)
	}

	return deps, nil
}

// SearchTags 查询标签列表 / Search available tags
func SearchTags(clusterId, service string) ([]string, error) {
	tempoUrl, err := GetTempoUrl(clusterId)
	if err != nil {
		return nil, err
	}

	params := url.Values{}
	if service != "" {
		params.Set("service.name", service)
		params.Set("scope", "resource")
	}

	reqUrl := fmt.Sprintf("%s/api/search/tags?%s", tempoUrl, params.Encode())
	body, err := tempoHttpGet(reqUrl)
	if err != nil {
		return nil, err
	}

	var resp tempoTagsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		// Try alternative format: direct string array
		var tags []string
		if err2 := json.Unmarshal(body, &tags); err2 == nil {
			return tags, nil
		}
		return nil, fmt.Errorf("parse tags response error: %v", err)
	}

	return resp.TagNames, nil
}

// SearchTagValues 查询标签值 / Search tag values
func SearchTagValues(clusterId, tag, service string) ([]string, error) {
	tempoUrl, err := GetTempoUrl(clusterId)
	if err != nil {
		return nil, err
	}

	params := url.Values{}
	if service != "" {
		params.Set("service.name", service)
		params.Set("scope", "resource")
	}

	// URL-encode the tag name for the path
	encodedTag := url.PathEscape(tag)
	reqUrl := fmt.Sprintf("%s/api/search/tag/%s/values?%s", tempoUrl, encodedTag, params.Encode())
	body, err := tempoHttpGet(reqUrl)
	if err != nil {
		return nil, err
	}

	var resp tempoTagValuesResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		// Try alternative format: direct string array
		var values []string
		if err2 := json.Unmarshal(body, &values); err2 == nil {
			return values, nil
		}
		return nil, fmt.Errorf("parse tag values response error: %v", err)
	}

	return resp.TagValues, nil
}

// SearchServices 查询服务列表 / Search service list (convenience wrapper)
func SearchServices(clusterId string) ([]string, error) {
	values, err := SearchTagValues(clusterId, "service.name", "")
	if err != nil {
		return nil, err
	}
	return values, nil
}

// TraceIDToNs 将trace ID的hex字符串转为OTLP格式 / Convert trace ID hex to OTLP format
func TraceIDToNs(traceID string) string {
	traceID = strings.TrimSpace(traceID)
	if len(traceID) < 16 {
		return ""
	}
	return traceID
}

// GetTraceBySpanID 通过SpanID查找链路 / Get trace ID by span ID
func GetTraceBySpanID(clusterId, spanID string) (string, error) {
	tempoUrl, err := GetTempoUrl(clusterId)
	if err != nil {
		return "", err
	}

	params := url.Values{}
	params.Set("tags", "span.id="+spanID)
	params.Set("limit", "1")

	reqUrl := fmt.Sprintf("%s/api/search?%s", tempoUrl, params.Encode())
	body, err := tempoHttpGet(reqUrl)
	if err != nil {
		return "", err
	}

	var resp tempoSearchResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", fmt.Errorf("parse search response error: %v", err)
	}

	if len(resp.Traces) == 0 {
		return "", fmt.Errorf("未找到该 SpanID 对应的链路")
	}

	return resp.Traces[0].TraceID, nil
}

// ServiceOverview 服务概览 / Service overview with metrics and recent traces
type ServiceOverview struct {
	ServiceName   string       `json:"serviceName"`
	Rpm           int64        `json:"rpm"`
	AvgLatencyMs  float64      `json:"avgLatencyMs"`
	P99LatencyMs  float64      `json:"p99LatencyMs"`
	ErrorRate     float64      `json:"errorRate"`
	ErrorCount    int64        `json:"errorCount"`
	LastActive    int64        `json:"lastActive"`
	RecentTraces  []TempoTrace `json:"recentTraces"`
}

// GetServiceOverview 获取服务概览 / Get service overview with metrics and recent traces
func GetServiceOverview(clusterId, serviceName string) (*ServiceOverview, error) {
	if serviceName == "" {
		return nil, fmt.Errorf("service_name is required")
	}

	overview := &ServiceOverview{
		ServiceName:  serviceName,
		RecentTraces: []TempoTrace{},
	}

	// Query Prometheus for service metrics
	promUrl := "http://kps-kube-prometheus-stack-prometheus.observability.svc.cluster.local:9090"

	// RPM: rate of calls to this service as server
	rpmQuery := fmt.Sprintf(`sum(rate(traces_service_graph_request_total{server="%s"}[1m])) * 60`, serviceName)
	rpmUrl := fmt.Sprintf("%s/api/v1/query?query=%s", promUrl, url.QueryEscape(rpmQuery))
	if body, err := tempoHttpGet(rpmUrl); err == nil {
		var resp prometheusQueryResponse
		if json.Unmarshal(body, &resp) == nil && len(resp.Data.Result) > 0 {
			if s, ok := resp.Data.Result[0].Value[1].(string); ok {
				var rpm float64
				fmt.Sscanf(s, "%f", &rpm)
				overview.Rpm = int64(rpm + 0.5)
			}
		}
	}

	// Avg latency
	avgQuery := fmt.Sprintf(`sum(rate(traces_service_graph_request_duration_seconds_sum{server="%s"}[5m])) / sum(rate(traces_service_graph_request_duration_seconds_count{server="%s"}[5m])) * 1000`, serviceName, serviceName)
	avgUrl := fmt.Sprintf("%s/api/v1/query?query=%s", promUrl, url.QueryEscape(avgQuery))
	if body, err := tempoHttpGet(avgUrl); err == nil {
		var resp prometheusQueryResponse
		if json.Unmarshal(body, &resp) == nil && len(resp.Data.Result) > 0 {
			if s, ok := resp.Data.Result[0].Value[1].(string); ok {
				fmt.Sscanf(s, "%f", &overview.AvgLatencyMs)
			}
		}
	}

	// P99 latency
	p99Query := fmt.Sprintf(`histogram_quantile(0.99, sum(rate(traces_service_graph_request_duration_seconds_bucket{server="%s"}[5m])) by (le)) * 1000`, serviceName)
	p99Url := fmt.Sprintf("%s/api/v1/query?query=%s", promUrl, url.QueryEscape(p99Query))
	if body, err := tempoHttpGet(p99Url); err == nil {
		var resp prometheusQueryResponse
		if json.Unmarshal(body, &resp) == nil && len(resp.Data.Result) > 0 {
			if s, ok := resp.Data.Result[0].Value[1].(string); ok {
				fmt.Sscanf(s, "%f", &overview.P99LatencyMs)
			}
		}
	}

	// Error rate and count
	errRateQuery := fmt.Sprintf(`sum(rate(traces_service_graph_request_failed_total{server="%s"}[5m])) / sum(rate(traces_service_graph_request_total{server="%s"}[5m]))`, serviceName, serviceName)
	errRateUrl := fmt.Sprintf("%s/api/v1/query?query=%s", promUrl, url.QueryEscape(errRateQuery))
	if body, err := tempoHttpGet(errRateUrl); err == nil {
		var resp prometheusQueryResponse
		if json.Unmarshal(body, &resp) == nil && len(resp.Data.Result) > 0 {
			if s, ok := resp.Data.Result[0].Value[1].(string); ok {
				fmt.Sscanf(s, "%f", &overview.ErrorRate)
			}
		}
	}

	errCountQuery := fmt.Sprintf(`sum(rate(traces_service_graph_request_failed_total{server="%s"}[1h])) * 3600`, serviceName)
	errCountUrl := fmt.Sprintf("%s/api/v1/query?query=%s", promUrl, url.QueryEscape(errCountQuery))
	if body, err := tempoHttpGet(errCountUrl); err == nil {
		var resp prometheusQueryResponse
		if json.Unmarshal(body, &resp) == nil && len(resp.Data.Result) > 0 {
			if s, ok := resp.Data.Result[0].Value[1].(string); ok {
				var cnt float64
				fmt.Sscanf(s, "%f", &cnt)
				overview.ErrorCount = int64(cnt + 0.5)
			}
		}
	}

	// Recent traces from Tempo
	traces, err := SearchTraces(clusterId, serviceName, "", "", "", "", "10", "", "")
	if err == nil {
		overview.RecentTraces = traces
		if len(traces) > 0 && traces[0].StartTime > 0 {
			overview.LastActive = traces[0].StartTime
		}
	}

	return overview, nil
}
