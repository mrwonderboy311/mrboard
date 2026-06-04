// alert_model.go
// 告警规则模型 / Alert rule model
package models

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"mrboard/common"

	"github.com/beego/beego/v2/client/orm"
)

// AlertRule 告警规则 / Alert rule
type AlertRule struct {
	Id          int64  `json:"id"`
	ClusterId   string `json:"cluster_id"`
	Name        string `json:"name"`
	Expr        string `json:"expr"`
	Source      string `json:"source"`
	Duration    string `json:"duration"`
	Severity    string `json:"severity"`
	Labels      string `json:"labels"`
	Annotations string `json:"annotations"`
	Enabled     bool   `json:"enabled"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

func (r *AlertRule) TableName() string {
	return "alert_rule"
}

func init() {
	orm.RegisterModel(new(AlertRule))
}

// GetAlertRules 获取告警规则列表 / Get alert rules
func GetAlertRules(clusterId string, page, pageSize int64) ([]AlertRule, int64, error) {
	o := orm.NewOrm()
	qs := o.QueryTable(new(AlertRule))
	if clusterId != "" {
		qs = qs.Filter("ClusterId", clusterId)
	}
	total, _ := qs.Count()
	var rules []AlertRule
	_, err := qs.OrderBy("-CreatedAt").Limit(pageSize, (page-1)*pageSize).All(&rules)
	return rules, total, err
}

// GetAlertRule 获取单个告警规则 / Get single alert rule
func GetAlertRule(id int64) (*AlertRule, error) {
	o := orm.NewOrm()
	rule := &AlertRule{Id: id}
	err := o.Read(rule)
	return rule, err
}

// CreateAlertRule 创建告警规则 / Create alert rule
func CreateAlertRule(rule *AlertRule) error {
	o := orm.NewOrm()
	_, err := o.Insert(rule)
	return err
}

// UpdateAlertRule 更新告警规则 / Update alert rule
func UpdateAlertRule(rule *AlertRule) error {
	o := orm.NewOrm()
	_, err := o.Update(rule, "Name", "Expr", "Source", "Duration", "Severity", "Labels", "Annotations", "Enabled")
	return err
}

// DeleteAlertRule 删除告警规则 / Delete alert rule
func DeleteAlertRule(id int64) error {
	o := orm.NewOrm()
	_, err := o.Delete(&AlertRule{Id: id})
	return err
}

// ToggleAlertRule 启用/禁用告警规则 / Toggle alert rule
func ToggleAlertRule(id int64) error {
	o := orm.NewOrm()
	rule := &AlertRule{Id: id}
	if err := o.Read(rule); err != nil {
		return err
	}
	rule.Enabled = !rule.Enabled
	_, err := o.Update(rule, "Enabled")
	return err
}

// GetEnabledLokiRules 获取所有启用的 Loki 告警规则 / Get enabled Loki rules
func GetEnabledLokiRules() ([]AlertRule, error) {
	o := orm.NewOrm()
	var rules []AlertRule
	_, err := o.QueryTable(new(AlertRule)).Filter("Source", "loki").Filter("Enabled", true).All(&rules)
	return rules, err
}

// ActiveAlert 活跃告警 / Active alert from Alertmanager
type ActiveAlert struct {
	Labels      map[string]string `json:"labels"`
	Annotations map[string]string `json:"annotations"`
	Status      string            `json:"status"`
	StartsAt    string            `json:"startsAt"`
	EndsAt      string            `json:"endsAt"`
	Fingerprint string            `json:"fingerprint"`
}

// GetActiveAlerts 从 Alertmanager 获取活跃告警 / Get active alerts from Alertmanager
func GetActiveAlerts(clusterId string) ([]ActiveAlert, error) {
	amUrl, err := GetAlertmanagerUrl(clusterId)
	if err != nil {
		return nil, err
	}

	cacheKey := "activeAlerts:" + clusterId
	if cached := common.Get(cacheKey); cached != "" {
		var alerts []ActiveAlert
		if json.Unmarshal([]byte(cached), &alerts) == nil {
			return alerts, nil
		}
	}

	amEndpoint := strings.TrimRight(amUrl, "/") + "/api/v2/alerts"
	body, err := httpGetURL(amEndpoint)
	if err != nil {
		return nil, fmt.Errorf("alertmanager query error: %v", err)
	}

	var alerts []ActiveAlert
	if err := json.Unmarshal(body, &alerts); err != nil {
		return nil, fmt.Errorf("parse alerts error: %v", err)
	}

	_ = common.SetEx(cacheKey, string(body), 10)
	return alerts, nil
}

// GetAlertmanagerUrl 获取集群的 Alertmanager 地址 / Get Alertmanager URL for cluster
func GetAlertmanagerUrl(clusterId string) (string, error) {
	cacheKey := "alertmanagerUrl:" + clusterId
	if cached := common.Get(cacheKey); cached != "" {
		return cached, nil
	}

	o := orm.NewOrm()
	var amUrl string
	err := o.Raw("SELECT alertmanager_url FROM xkb_cluster WHERE cluster_id = ?", clusterId).QueryRow(&amUrl)
	if err != nil {
		return "", fmt.Errorf("query alertmanager_url error: %v", err)
	}
	if amUrl == "" {
		return "", fmt.Errorf("alertmanager_url is empty for cluster %s", clusterId)
	}

	_ = common.SetEx(cacheKey, amUrl, 600)
	return amUrl, nil
}

// ForwardToChannels 转发告警到通知渠道 / Forward alert to notification channels
func ForwardToChannels(alerts []ActiveAlert, severity string) {
	channels, err := GetEnabledAlertChannels()
	if err != nil || len(channels) == 0 {
		return
	}

	payload := map[string]interface{}{
		"status": "firing",
		"alerts": alerts,
	}
	body, _ := json.Marshal(payload)

	for _, ch := range channels {
		go func(c AlertChannel) {
			for i := 0; i < 3; i++ {
				statusCode, err := httpPostJSON(c.Url, c.Headers, body)
				if err == nil && statusCode >= 200 && statusCode < 300 {
					log.Printf("[INFO] alert forwarded to %s successfully", c.Name)
					return
				}
				log.Printf("[WARN] alert webhook retry %d for %s: status=%d err=%v", i+1, c.Name, statusCode, err)
				time.Sleep(2 * time.Second)
			}
		}(ch)
	}
}

// httpGetURL 发送 HTTP GET 请求 / Send HTTP GET request
func httpGetURL(httpUrl string) ([]byte, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(httpUrl)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("http status %d: %s", resp.StatusCode, string(body))
	}
	return body, nil
}

// StartLokiAlertEvaluator 启动 Loki 日志告警评估器 / Start Loki alert evaluator
func StartLokiAlertEvaluator() {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			evaluateLokiRules()
		}
	}()
	log.Println("[INFO] Loki alert evaluator started (30s interval)")
}

// evaluateLokiRules 评估所有 Loki 日志告警规则 / Evaluate all Loki log alert rules
func evaluateLokiRules() {
	rules, err := GetEnabledLokiRules()
	if err != nil || len(rules) == 0 {
		return
	}

	for _, rule := range rules {
		if err := evaluateLokiRule(rule); err != nil {
			log.Printf("[WARN] evaluate loki rule %s error: %v", rule.Name, err)
		}
	}
}

// evaluateLokiRule 评估单条 Loki 规则 / Evaluate single Loki rule
func evaluateLokiRule(rule AlertRule) error {
	lokiUrl, err := GetLokiUrl(rule.ClusterId)
	if err != nil {
		return err
	}

	// Query Loki with the rule expression
	reqUrl := fmt.Sprintf("%s/loki/api/v1/query?query=%s&limit=1", lokiUrl, url.QueryEscape(rule.Expr))
	body, err := lokiHttpGet(reqUrl)
	if err != nil {
		return err
	}

	var result struct {
		Status string `json:"status"`
		Data   struct {
			ResultType string `json:"resultType"`
			Result     []struct {
				Stream map[string]string `json:"stream"`
				Values [][]interface{}   `json:"values"`
			} `json:"result"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return err
	}

	// If any results, fire alert
	if len(result.Data.Result) > 0 {
		labelsJson := fmt.Sprintf(`{"alertname":"%s","severity":"%s"}`, rule.Name, rule.Severity)
		annotationsJson := fmt.Sprintf(`{"summary":"Loki rule %s triggered"}`, rule.Name)
		history := &AlertHistory{
			ClusterId:   rule.ClusterId,
			RuleName:    rule.Name,
			Severity:    rule.Severity,
			Status:      "firing",
			Labels:      labelsJson,
			Annotations: annotationsJson,
			Notified:    false,
		}
		_ = CreateAlertHistory(history)

		// Forward to channels
		alert := ActiveAlert{
			Labels:      map[string]string{"alertname": rule.Name, "severity": rule.Severity},
			Annotations: map[string]string{"summary": fmt.Sprintf("Loki rule %s triggered", rule.Name)},
			Status:      "firing",
			StartsAt:    time.Now().Format(time.RFC3339),
		}
		ForwardToChannels([]ActiveAlert{alert}, rule.Severity)
	}

	return nil
}
