// loki_log_model.go
// Loki日志查询模型 / Loki log query model
package models

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"mrboard/common"

	"github.com/beego/beego/v2/client/orm"
)

// LogEntry 日志条目 / Log entry
type LogEntry struct {
	Timestamp string            `json:"timestamp"`
	Level     string            `json:"level"`
	Namespace string            `json:"namespace"`
	Pod       string            `json:"pod"`
	Container string            `json:"container"`
	App       string            `json:"app"`
	Message   string            `json:"message"`
	Labels    map[string]string `json:"labels"`
}

// HistogramBucket 直方图桶 / Histogram bucket
type HistogramBucket struct {
	Timestamp int64 `json:"timestamp"`
	Count     int64 `json:"count"`
}

// HistogramData 直方图数据 / Histogram data
type HistogramData struct {
	Buckets      []HistogramBucket            `json:"buckets"`
	LevelBuckets map[string][]HistogramBucket `json:"levelBuckets"`
}

// Loki API响应结构 / Loki API response structures
type lokiResponse struct {
	Status string   `json:"status"`
	Data   lokiData `json:"data"`
}

type lokiData struct {
	ResultType string          `json:"resultType"`
	Result     json.RawMessage `json:"result"`
}

type lokiStreamResult struct {
	Stream map[string]string  `json:"stream"`
	Values [][]interface{}    `json:"values"`
}

type lokiMatrixResult struct {
	Metric map[string]string `json:"metric"`
	Values [][]interface{}   `json:"values"`
}

// GetLokiUrl 获取集群的Loki地址 / Get Loki URL for cluster
func GetLokiUrl(clusterId string) (string, error) {
	// Redis缓存
	cacheKey := "lokiUrl:" + clusterId
	if cached := common.Get(cacheKey); cached != "" {
		return cached, nil
	}

	o := orm.NewOrm()
	var lokiUrl string
	err := o.Raw("SELECT loki_url FROM xkb_cluster WHERE cluster_id = ?", clusterId).QueryRow(&lokiUrl)
	if err != nil {
		return "", fmt.Errorf("query loki_url error: %v", err)
	}
	if lokiUrl == "" {
		return "", fmt.Errorf("loki_url is empty for cluster %s", clusterId)
	}

	// 缓存600秒
	_ = common.SetEx(cacheKey, lokiUrl, 600)
	return lokiUrl, nil
}

// LokiConfig Loki字段映射配置 / Loki field mapping configuration
type LokiConfig struct {
	StreamSelector struct {
		Namespace string `json:"namespace"`
		Service   string `json:"service"`
	} `json:"streamSelector"`
	FieldMapping struct {
		Pod       []string `json:"pod"`
		Container []string `json:"container"`
		App       []string `json:"app"`
		Level     []string `json:"level"`
	} `json:"fieldMapping"`
	LevelDetection struct {
		LabelKey         string            `json:"labelKey"`
		RegexFromMessage bool              `json:"regexFromMessage"`
		ValueMap         map[string]string `json:"valueMap"`
	} `json:"levelDetection"`
	MessageField   string `json:"messageField"`
	TimestampField string `json:"timestampField"`
}

// DefaultLokiConfig 返回默认配置 / Return default configuration
func DefaultLokiConfig() *LokiConfig {
	cfg := &LokiConfig{}
	cfg.StreamSelector.Namespace = "namespace"
	cfg.StreamSelector.Service = "service_name"
	cfg.FieldMapping.Pod = []string{"pod", "pod_name"}
	cfg.FieldMapping.Container = []string{"container", "container_name"}
	cfg.FieldMapping.App = []string{"app", "service_name"}
	cfg.FieldMapping.Level = []string{"level", "severity", "log_level"}
	cfg.LevelDetection.LabelKey = "level"
	cfg.LevelDetection.RegexFromMessage = true
	cfg.LevelDetection.ValueMap = map[string]string{
		"err": "error", "warning": "warn", "fatal": "error",
	}
	cfg.MessageField = ""
	cfg.TimestampField = ""
	return cfg
}

// GetLokiConfig 获取集群的Loki配置 / Get Loki config for cluster
func GetLokiConfig(clusterId string) *LokiConfig {
	cacheKey := "lokiConfig:" + clusterId
	if cached := common.Get(cacheKey); cached != "" {
		cfg := &LokiConfig{}
		if json.Unmarshal([]byte(cached), cfg) == nil {
			return cfg
		}
	}

	o := orm.NewOrm()
	var configStr string
	err := o.Raw("SELECT loki_config FROM xkb_cluster WHERE cluster_id = ?", clusterId).QueryRow(&configStr)
	if err != nil || configStr == "" {
		return DefaultLokiConfig()
	}

	cfg := &LokiConfig{}
	if json.Unmarshal([]byte(configStr), cfg) != nil {
		return DefaultLokiConfig()
	}

	_ = common.SetEx(cacheKey, configStr, 600)
	return cfg
}

// lokiHttpGet Loki HTTP GET请求 / Loki HTTP GET request
func lokiHttpGet(url string) ([]byte, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
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

// QueryLabels 查询标签列表 / Query label list
func QueryLabels(clusterId, namespace, start, end string) ([]string, error) {
	lokiUrl, err := GetLokiUrl(clusterId)
	if err != nil {
		return nil, err
	}
	q := `{namespace=~".+"}`
	if namespace != "" {
		q = fmt.Sprintf(`{namespace="%s"}`, namespace)
	}
	reqUrl := fmt.Sprintf("%s/loki/api/v1/labels?query=%s&start=%s&end=%s", lokiUrl, url.QueryEscape(q), start, end)
	body, err := lokiHttpGet(reqUrl)
	if err != nil {
		return nil, err
	}
	var result struct {
		Status string   `json:"status"`
		Data   []string `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse labels response error: %v", err)
	}
	if result.Status != "success" {
		return nil, fmt.Errorf("loki query labels failed: %s", result.Status)
	}
	return result.Data, nil
}

// QueryLabelValues 查询标签值 / Query label values
func QueryLabelValues(clusterId, namespace, label, start, end string) ([]string, error) {
	lokiUrl, err := GetLokiUrl(clusterId)
	if err != nil {
		return nil, err
	}
	q := `{namespace=~".+"}`
	if namespace != "" {
		q = fmt.Sprintf(`{namespace="%s"}`, namespace)
	}
	reqUrl := fmt.Sprintf("%s/loki/api/v1/label/%s/values?query=%s&start=%s&end=%s", lokiUrl, label, url.QueryEscape(q), start, end)
	body, err := lokiHttpGet(reqUrl)
	if err != nil {
		return nil, err
	}
	var result struct {
		Status string   `json:"status"`
		Data   []string `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse label values response error: %v", err)
	}
	if result.Status != "success" {
		return nil, fmt.Errorf("loki query label values failed: %s", result.Status)
	}
	return result.Data, nil
}

// buildLogQL 构建LogQL查询语句 / Build LogQL query
// rawLogQL: if non-empty, used as the full LogQL query (overrides other filters except namespace/services)
// resolveLabel 从候选标签列表中找到第一个有值的 / Find first non-empty label from candidates
func resolveLabel(labels map[string]string, candidates []string) string {
	for _, key := range candidates {
		if val, ok := labels[key]; ok && val != "" {
			return val
		}
	}
	return ""
}

func buildLogQL(namespace string, services []string, levels []string, searchText string, rawLogQL string) string {
	return buildLogQLWithConfig(namespace, services, levels, searchText, rawLogQL, DefaultLokiConfig())
}

func buildLogQLWithConfig(namespace string, services []string, levels []string, searchText string, rawLogQL string, cfg *LokiConfig) string {
	nsLabel := cfg.StreamSelector.Namespace
	if nsLabel == "" {
		nsLabel = "namespace"
	}
	svcLabel := cfg.StreamSelector.Service
	if svcLabel == "" {
		svcLabel = "service_name"
	}

	// Build stream selector
	selector := fmt.Sprintf(`{%s=~".+"}`, nsLabel)
	if namespace != "" && len(services) > 0 {
		selector = fmt.Sprintf(`{%s="%s", %s=~"%s"}`, nsLabel, namespace, svcLabel, strings.Join(services, "|"))
	} else if namespace != "" {
		selector = fmt.Sprintf(`{%s="%s"}`, nsLabel, namespace)
	} else if len(services) > 0 {
		selector = fmt.Sprintf(`{%s=~".+", %s=~"%s"}`, nsLabel, svcLabel, strings.Join(services, "|"))
	}

	if rawLogQL != "" {
		return selector + " " + rawLogQL
	}

	query := selector
	if searchText != "" {
		query += fmt.Sprintf(` |= "%s"`, searchText)
	}
	return query
}

// detectLogLevel 检测日志级别 / Detect log level
func detectLogLevel(entry map[string]interface{}) string {
	return detectLogLevelWithConfig(entry, DefaultLokiConfig())
}

// detectLogLevelWithConfig 使用配置检测日志级别 / Detect log level using config
func detectLogLevelWithConfig(entry map[string]interface{}, cfg *LokiConfig) string {
	if labels, ok := entry["labels"].(map[string]string); ok {
		// Try each configured level label
		for _, labelKey := range cfg.FieldMapping.Level {
			if val, ok := labels[labelKey]; ok {
				normalized := normalizeLevelWithMap(val, cfg.LevelDetection.ValueMap)
				if normalized != "unknown" {
					return normalized
				}
			}
		}
		// Fallback to configured label key
		if cfg.LevelDetection.LabelKey != "" {
			if level, ok := labels[cfg.LevelDetection.LabelKey]; ok {
				return normalizeLevelWithMap(level, cfg.LevelDetection.ValueMap)
			}
		}
	}
	// Regex from message
	if cfg.LevelDetection.RegexFromMessage {
		if msg, ok := entry["message"].(string); ok {
			re := regexp.MustCompile(`(?i)\b(ERROR|WARN|WARNING|INFO|DEBUG|TRACE|FATAL)\b`)
			matches := re.FindStringSubmatch(msg)
			if len(matches) > 1 {
				return normalizeLevel(matches[1])
			}
		}
	}
	return "unknown"
}

// normalizeLevel 标准化日志级别 / Normalize log level
func normalizeLevel(level string) string {
	return normalizeLevelWithMap(level, nil)
}

// normalizeLevelWithMap 使用自定义映射标准化日志级别 / Normalize with custom value map
func normalizeLevelWithMap(level string, valueMap map[string]string) string {
	lower := strings.ToLower(level)
	// Apply custom value map first
	if valueMap != nil {
		if mapped, ok := valueMap[lower]; ok {
			lower = strings.ToLower(mapped)
		}
	}
	switch lower {
	case "error":
		return "error"
	case "warn", "warning":
		return "warn"
	case "info":
		return "info"
	case "debug":
		return "debug"
	case "trace":
		return "trace"
	case "fatal":
		return "error"
	default:
		return "unknown"
	}
}

// QueryLogs 查询日志 / Query logs
func QueryLogs(clusterId, namespace string, services []string, levels []string, searchText string, rawLogQL string, start, end string, limit int, direction string) ([]LogEntry, int, error) {
	lokiUrl, err := GetLokiUrl(clusterId)
	if err != nil {
		return nil, 0, err
	}

	cfg := GetLokiConfig(clusterId)
	query := buildLogQLWithConfig(namespace, services, levels, searchText, rawLogQL, cfg)
	reqUrl := fmt.Sprintf("%s/loki/api/v1/query_range?query=%s&start=%s&end=%s&limit=%d&direction=%s",
		lokiUrl, url.QueryEscape(query), start, end, limit, direction)

	body, err := lokiHttpGet(reqUrl)
	if err != nil {
		return nil, 0, err
	}

	var resp lokiResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, 0, fmt.Errorf("parse query_range response error: %v", err)
	}
	if resp.Status != "success" {
		return nil, 0, fmt.Errorf("loki query failed: %s", resp.Status)
	}

	var streams []lokiStreamResult
	if err := json.Unmarshal(resp.Data.Result, &streams); err != nil {
		return nil, 0, fmt.Errorf("parse streams error: %v", err)
	}

	var entries []LogEntry
	for _, stream := range streams {
		app := resolveLabel(stream.Stream, cfg.FieldMapping.App)
		container := resolveLabel(stream.Stream, cfg.FieldMapping.Container)
		pod := resolveLabel(stream.Stream, cfg.FieldMapping.Pod)
		ns := namespace
		if ns == "" {
			ns = stream.Stream[cfg.StreamSelector.Namespace]
		}

		for _, val := range stream.Values {
			if len(val) < 2 {
				continue
			}
			ts := fmt.Sprintf("%v", val[0])
			msg := fmt.Sprintf("%v", val[1])
			entry := LogEntry{
				Timestamp: ts,
				Message:   msg,
				Namespace: ns,
				Pod:       pod,
				Container: container,
				App:       app,
				Labels:    stream.Stream,
			}
			entry.Level = detectLogLevelWithConfig(map[string]interface{}{
				"labels":  stream.Stream,
				"message": msg,
			}, cfg)
			entries = append(entries, entry)
		}
	}

	// 按级别过滤 / Filter by level
	if len(levels) > 0 {
		levelSet := make(map[string]bool)
		for _, l := range levels {
			levelSet[normalizeLevel(l)] = true
		}
		var filtered []LogEntry
		for _, e := range entries {
			if levelSet[e.Level] {
				filtered = append(filtered, e)
			}
		}
		entries = filtered
	}

	total := len(entries)
	return entries, total, nil
}

// GetHistogram 获取日志直方图 / Get log histogram
func GetHistogram(clusterId, namespace string, services []string, levels []string, start, end, step string) (*HistogramData, error) {
	lokiUrl, err := GetLokiUrl(clusterId)
	if err != nil {
		return nil, err
	}

	cfg := GetLokiConfig(clusterId)
	query := buildLogQLWithConfig(namespace, services, levels, "", "", cfg)
	logQuery := fmt.Sprintf(`count_over_time(%s[%s])`, query, step)
	reqUrl := fmt.Sprintf("%s/loki/api/v1/query_range?query=%s&start=%s&end=%s&step=%s",
		lokiUrl, url.QueryEscape(logQuery), start, end, step)

	body, err := lokiHttpGet(reqUrl)
	if err != nil {
		return nil, err
	}

	var resp lokiResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse histogram response error: %v", err)
	}
	if resp.Status != "success" {
		return nil, fmt.Errorf("loki histogram query failed: %s", resp.Status)
	}

	var matrix []lokiMatrixResult
	if err := json.Unmarshal(resp.Data.Result, &matrix); err != nil {
		return nil, fmt.Errorf("parse matrix error: %v", err)
	}

	histogram := &HistogramData{
		LevelBuckets: make(map[string][]HistogramBucket),
	}

	// 汇总所有流的桶 / Aggregate buckets from all streams
	bucketMap := make(map[int64]int64)
	for _, m := range matrix {
		for _, val := range m.Values {
			if len(val) < 2 {
				continue
			}
			ts, ok := val[0].(float64)
			if !ok {
				continue
			}
			countStr := fmt.Sprintf("%v", val[1])
			count, err := strconv.ParseFloat(countStr, 64)
			if err != nil {
				continue
			}
			tsInt := int64(ts)
			bucketMap[tsInt] += int64(count)
		}
	}

	for ts, count := range bucketMap {
		histogram.Buckets = append(histogram.Buckets, HistogramBucket{
			Timestamp: ts,
			Count:     count,
		})
	}

	// 按级别查询 / Query by level
	if len(levels) > 0 {
		for _, level := range levels {
			levelQuery := fmt.Sprintf(`count_over_time(%s |(?i) level="%s"[%s])`, query, level, step)
			levelUrl := fmt.Sprintf("%s/loki/api/v1/query_range?query=%s&start=%s&end=%s&step=%s",
				lokiUrl, url.QueryEscape(levelQuery), start, end, step)

			levelBody, err := lokiHttpGet(levelUrl)
			if err != nil {
				log.Printf("[WARN] query level %s histogram error: %v\n", level, err)
				continue
			}

			var levelResp lokiResponse
			if err := json.Unmarshal(levelBody, &levelResp); err != nil {
				continue
			}

			var levelMatrix []lokiMatrixResult
			if err := json.Unmarshal(levelResp.Data.Result, &levelMatrix); err != nil {
				continue
			}

			levelBucketMap := make(map[int64]int64)
			for _, m := range levelMatrix {
				for _, val := range m.Values {
					if len(val) < 2 {
						continue
					}
					ts, ok := val[0].(float64)
					if !ok {
						continue
					}
					countStr := fmt.Sprintf("%v", val[1])
					count, err := strconv.ParseFloat(countStr, 64)
					if err != nil {
						continue
					}
					levelBucketMap[int64(ts)] += int64(count)
				}
			}

			for ts, count := range levelBucketMap {
				histogram.LevelBuckets[level] = append(histogram.LevelBuckets[level], HistogramBucket{
					Timestamp: ts,
					Count:     count,
				})
			}
		}
	}

	return histogram, nil
}

// calcStep 计算直方图步长 / Calculate histogram step
func CalcStep(start, end string) string {
	startInt, err := strconv.ParseInt(start, 10, 64)
	if err != nil {
		return "30s"
	}
	endInt, err := strconv.ParseInt(end, 10, 64)
	if err != nil {
		return "30s"
	}
	duration := time.Duration(endInt-startInt) * time.Second
	switch {
	case duration <= 5*time.Minute:
		return "5s"
	case duration <= 15*time.Minute:
		return "15s"
	case duration <= 1*time.Hour:
		return "30s"
	case duration <= 6*time.Hour:
		return "2m"
	case duration <= 24*time.Hour:
		return "5m"
	case duration <= 7*24*time.Hour:
		return "30m"
	default:
		return "1h"
	}
}

// Levels 获取日志级别统计 / Get log level counts
func Levels(clusterId, namespace string, services []string, start, end string) (map[string]int64, error) {
	lokiUrl, err := GetLokiUrl(clusterId)
	if err != nil {
		return nil, err
	}

	cfg := GetLokiConfig(clusterId)
	query := buildLogQLWithConfig(namespace, services, nil, "", "", cfg)
	step := CalcStep(start, end)
	logQuery := fmt.Sprintf(`count_over_time(%s[%s])`, query, step)
	reqUrl := fmt.Sprintf("%s/loki/api/v1/query_range?query=%s&start=%s&end=%s&step=%s",
		lokiUrl, url.QueryEscape(logQuery), start, end, step)

	body, err := lokiHttpGet(reqUrl)
	if err != nil {
		return nil, err
	}

	var resp lokiResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse levels response error: %v", err)
	}
	if resp.Status != "success" {
		return nil, fmt.Errorf("loki levels query failed: %s", resp.Status)
	}

	var streams []lokiStreamResult
	if err := json.Unmarshal(resp.Data.Result, &streams); err != nil {
		return nil, fmt.Errorf("parse streams error: %v", err)
	}

	levelCounts := make(map[string]int64)
	for _, stream := range streams {
		level := normalizeLevel(stream.Stream["level"])
		if level == "unknown" {
			if svc, ok := stream.Stream["service_name"]; ok {
				level = normalizeLevel(svc)
			}
		}
		var total int64
		for _, val := range stream.Values {
			if len(val) < 2 {
				continue
			}
			countStr := fmt.Sprintf("%v", val[1])
			count, err := strconv.ParseFloat(countStr, 64)
			if err != nil {
				continue
			}
			total += int64(count)
		}
		levelCounts[level] += total
	}

	// 如果没有level标签，从日志内容检测 / If no level label, detect from log content
	if len(levelCounts) == 0 || (len(levelCounts) == 1 && levelCounts["unknown"] > 0) {
		entries, _, err := QueryLogs(clusterId, namespace, services, nil, "", "", start, end, 5000, "forward")
		if err != nil {
			return levelCounts, nil
		}
		levelCounts = make(map[string]int64)
		for _, e := range entries {
			levelCounts[e.Level]++
		}
	}

	return levelCounts, nil
}

