package models

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"mrboard/common"

	"github.com/beego/beego/v2/client/orm"
)

// prometheusQueryTemplates PromQL模板 / PromQL query templates
var prometheusQueryTemplates = map[string]string{
	"cpu":               "sum(rate(container_cpu_usage_seconds_total{%s}[5m])) by (%s)",
	"memory":            "sum(container_memory_working_set_bytes{%s}) by (%s)",
	"network_receive":   "sum(rate(container_network_receive_bytes_total{%s}[5m])) by (%s)",
	"network_transmit":  "sum(rate(container_network_transmit_bytes_total{%s}[5m])) by (%s)",
	"request_rate":      "sum(rate(http_requests_total{%s}[5m])) by (code)",
	"request_latency_p99": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{%s}[5m])) by (le))",
}

// prometheusHttpGet Prometheus HTTP GET请求 / Prometheus HTTP GET request
func prometheusHttpGet(reqUrl string) ([]byte, error) {
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

// buildPromQLFilters 构建PromQL过滤器 / Build PromQL filter string
func buildPromQLFilters(namespace, pod, node, service string) string {
	var filters []string
	if namespace != "" {
		filters = append(filters, fmt.Sprintf(`namespace="%s"`, namespace))
	}
	if pod != "" {
		filters = append(filters, fmt.Sprintf(`pod="%s"`, pod))
	}
	if node != "" {
		filters = append(filters, fmt.Sprintf(`node="%s"`, node))
	}
	if service != "" {
		filters = append(filters, fmt.Sprintf(`service="%s"`, service))
	}
	if len(filters) == 0 {
		return ""
	}
	return strings.Join(filters, ",")
}

// GetPrometheusUrl 获取集群的Prometheus地址 / Get Prometheus URL for a cluster
func GetPrometheusUrl(clusterId string) (string, error) {
	// Redis缓存
	cacheKey := "prometheusUrl:" + clusterId
	if cached := common.Get(cacheKey); cached != "" {
		return cached, nil
	}

	o := orm.NewOrm()
	var prometheusUrl string
	err := o.Raw("SELECT prometheus_url FROM xkb_cluster WHERE cluster_id = ?", clusterId).QueryRow(&prometheusUrl)
	if err != nil {
		return "", fmt.Errorf("query prometheus_url error: %v", err)
	}
	if prometheusUrl == "" {
		return "", fmt.Errorf("prometheus_url is empty for cluster %s", clusterId)
	}

	// 缓存600秒
	_ = common.SetEx(cacheKey, prometheusUrl, 600)
	return prometheusUrl, nil
}

// isRawPromQL 判断是否为原始PromQL表达式 / Check if the metric string is raw PromQL
func isRawPromQL(metric string) bool {
	return strings.ContainsAny(metric, "{([]")
}

// PrometheusQueryRange Prometheus范围查询 / Prometheus range query
func PrometheusQueryRange(clusterId, metric, namespace, pod, node, service string, start, end, step int64) (map[string]interface{}, error) {
	prometheusUrl, err := GetPrometheusUrl(clusterId)
	if err != nil {
		return nil, err
	}

	var query string

	if isRawPromQL(metric) {
		// 原始PromQL表达式，直接使用 / Raw PromQL expression, use directly
		query = metric
	} else {
		// 模板key，查找模板 / Template key, look up template
		tmpl, ok := prometheusQueryTemplates[metric]
		if !ok {
			return nil, fmt.Errorf("unsupported metric: %s", metric)
		}

		filters := buildPromQLFilters(namespace, pod, node, service)

		var byGroup string
		switch metric {
		case "cpu", "memory":
			if pod != "" {
				byGroup = "pod"
			} else if node != "" {
				byGroup = "node"
			} else {
				byGroup = "namespace"
			}
		case "network_receive", "network_transmit":
			if pod != "" {
				byGroup = "pod"
			} else if node != "" {
				byGroup = "node"
			} else {
				byGroup = "namespace"
			}
		case "request_rate":
			byGroup = "code"
		case "request_latency_p99":
			byGroup = "le"
		default:
			byGroup = "namespace"
		}

		query = fmt.Sprintf(tmpl, filters, byGroup)
	}

	reqUrl := fmt.Sprintf("%s/api/v1/query_range?query=%s&start=%d&end=%d&step=%d",
		strings.TrimRight(prometheusUrl, "/"),
		url.QueryEscape(query),
		start, end, step)

	body, err := prometheusHttpGet(reqUrl)
	if err != nil {
		return nil, fmt.Errorf("prometheus query_range error: %v", err)
	}

	result := make(map[string]interface{})
	result["raw"] = string(body)
	result["query"] = query
	return result, nil
}

// PrometheusLabelValues 获取标签值列表 / Get label values
func PrometheusLabelValues(clusterId, label, match string) ([]string, error) {
	prometheusUrl, err := GetPrometheusUrl(clusterId)
	if err != nil {
		return nil, err
	}

	reqUrl := fmt.Sprintf("%s/api/v1/label/%s/values", strings.TrimRight(prometheusUrl, "/"), url.PathEscape(label))
	if match != "" {
		reqUrl += "?match[]=" + url.QueryEscape(match)
	}

	body, err := prometheusHttpGet(reqUrl)
	if err != nil {
		return nil, fmt.Errorf("prometheus label values error: %v", err)
	}

	// 解析Prometheus API响应 / Parse Prometheus API response
	// Response format: {"status":"success","data":["value1","value2",...]}
	var resp struct {
		Status string   `json:"status"`
		Data   []string `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse label values error: %v", err)
	}
	if resp.Status != "success" {
		return nil, fmt.Errorf("prometheus API error: %s", string(body))
	}
	return resp.Data, nil
}
