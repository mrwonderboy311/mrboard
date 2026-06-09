// alert.go
package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"

	"mrboard/common"
	m "mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
)

type AlertController struct {
	beego.Controller
}

// Rules 告警规则列表 / Alert rules list
func (this *AlertController) Rules() {
	clusterId := this.GetString("clusterId")
	page, _ := this.GetInt64("page", 1)
	pageSize, _ := this.GetInt64("limit", 20)

	rules, total, err := m.GetAlertRules(clusterId, page, pageSize)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "count": total, "data": rules}
	this.ServeJSON()
}

// Active 活跃告警 / Active alerts
func (this *AlertController) Active() {
	clusterId := this.GetString("clusterId")
	alerts, err := m.GetActiveAlerts(clusterId)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": alerts}
	this.ServeJSON()
}

// History 告警历史 / Alert history
func (this *AlertController) History() {
	clusterId := this.GetString("clusterId")
	severity := this.GetString("severity")
	status := this.GetString("status")
	page, _ := this.GetInt64("page", 1)
	pageSize, _ := this.GetInt64("limit", 20)

	history, total, err := m.GetAlertHistory(clusterId, severity, status, page, pageSize)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "count": total, "data": history}
	this.ServeJSON()
}

// AddRule 创建告警规则 / Create alert rule
func (this *AlertController) AddRule() {
	clusterId := this.GetString("clusterId")
	name := this.GetString("name")
	expr := this.GetString("expr")
	source := this.GetString("source")
	duration := this.GetString("duration")
	severity := this.GetString("severity")
	labels := this.GetString("labels")
	annotations := this.GetString("annotations")

	if clusterId == "" || name == "" || expr == "" {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "clusterId, name, expr are required"}
		this.ServeJSON()
		return
	}
	if source == "" {
		source = "mrboard"
	}
	if duration == "" {
		duration = "5m"
	}
	if severity == "" {
		severity = "warning"
	}

	rule := &m.AlertRule{
		ClusterId:   clusterId,
		Name:        name,
		Expr:        expr,
		Source:      source,
		Duration:    duration,
		Severity:    severity,
		Labels:      labels,
		Annotations: annotations,
		Enabled:     true,
	}

	if err := m.CreateAlertRule(rule); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	// Sync to PrometheusRule CRD
	if err := SyncPrometheusRule(clusterId); err != nil {
		log.Printf("[Alert] SyncPrometheusRule error: %v", err)
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": rule}
	this.ServeJSON()
}

// UpdateRule 更新告警规则 / Update alert rule
func (this *AlertController) UpdateRule() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}

	rule, err := m.GetAlertRule(id)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	if v := this.GetString("name"); v != "" {
		rule.Name = v
	}
	if v := this.GetString("expr"); v != "" {
		rule.Expr = v
	}
	if v := this.GetString("source"); v != "" {
		rule.Source = v
	}
	if v := this.GetString("duration"); v != "" {
		rule.Duration = v
	}
	if v := this.GetString("severity"); v != "" {
		rule.Severity = v
	}
	if v := this.GetString("labels"); v != "" {
		rule.Labels = v
	}
	if v := this.GetString("annotations"); v != "" {
		rule.Annotations = v
	}

	if err := m.UpdateAlertRule(rule); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	if err := SyncPrometheusRule(rule.ClusterId); err != nil {
		log.Printf("[Alert] SyncPrometheusRule error: %v", err)
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": rule}
	this.ServeJSON()
}

// DelRule 删除告警规则 / Delete alert rule
func (this *AlertController) DelRule() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}

	// Get rule before deleting to know the clusterId
	rule, _ := m.GetAlertRule(id)

	if err := m.DeleteAlertRule(id); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	if rule != nil {
		if err := SyncPrometheusRule(rule.ClusterId); err != nil {
			log.Printf("[Alert] SyncPrometheusRule error: %v", err)
		}
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success"}
	this.ServeJSON()
}

// ToggleRule 启用/禁用告警规则 / Toggle alert rule
func (this *AlertController) ToggleRule() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}

	rule, _ := m.GetAlertRule(id)

	if err := m.ToggleAlertRule(id); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	if rule != nil {
		if err := SyncPrometheusRule(rule.ClusterId); err != nil {
			log.Printf("[Alert] SyncPrometheusRule error: %v", err)
		}
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success"}
	this.ServeJSON()
}

// Webhook Alertmanager webhook 接收端点 / Alertmanager webhook receiver
func (this *AlertController) Webhook() {
	var alerts []m.ActiveAlert
	if err := json.Unmarshal(this.Ctx.Input.RequestBody, &alerts); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid payload"}
		this.ServeJSON()
		return
	}

	for _, alert := range alerts {
		labelsJson, _ := json.Marshal(alert.Labels)
		annotationsJson, _ := json.Marshal(alert.Annotations)
		history := &m.AlertHistory{
			ClusterId:   alert.Labels["cluster_id"],
			RuleName:    alert.Labels["alertname"],
			Severity:    alert.Labels["severity"],
			Status:      alert.Status.State,
			Labels:      string(labelsJson),
			Annotations: string(annotationsJson),
			Notified:    false,
		}
		_ = m.CreateAlertHistory(history)
	}

	m.ForwardToChannels(alerts, "")

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success"}
	this.ServeJSON()
}

// SyncPrometheusRule syncs all enabled MRBoard rules to a PrometheusRule CRD
func SyncPrometheusRule(clusterId string) error {
	clientset := common.ClientSet(clusterId)
	if clientset == nil {
		return fmt.Errorf("clientset is nil for cluster %s", clusterId)
	}

	// Get all enabled rules for this cluster
	rules, _, err := m.GetAlertRules(clusterId, 1, 1000)
	if err != nil {
		return fmt.Errorf("get rules: %v", err)
	}

	// Build PrometheusRule spec — only sync MRBoard-created rules
	var promRules []interface{}
	for _, r := range rules {
		if !r.Enabled || r.Source != "mrboard" {
			continue
		}
		rule := map[string]interface{}{
			"alert":  r.Name,
			"expr":   r.Expr,
			"for":    r.Duration,
			"labels": parseKV(r.Labels, "severity", r.Severity),
		}
		if r.Annotations != "" {
			rule["annotations"] = parseKV(r.Annotations, "", "")
		}
		promRules = append(promRules, rule)
	}

	_, config := common.ClientSetConfig(clusterId)
	dynamicClient := dynamic.NewForConfigOrDie(config)

	// If no MRBoard rules, delete the PrometheusRule CRD if it exists
	if len(promRules) == 0 {
		gvr := schema.GroupVersionResource{Group: "monitoring.coreos.com", Version: "v1", Resource: "prometheusrules"}
		err := dynamicClient.Resource(gvr).Namespace("observability").Delete(context.Background(), "mrboard-rules", metav1.DeleteOptions{})
		if err != nil && !strings.Contains(err.Error(), "not found") {
			log.Printf("[Alert] Delete empty PrometheusRule error: %v", err)
		}
		return nil
	}
	gvr := schema.GroupVersionResource{
		Group:    "monitoring.coreos.com",
		Version:  "v1",
		Resource: "prometheusrules",
	}

	crName := "mrboard-rules"
	ns := "observability"

	obj := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "monitoring.coreos.com/v1",
			"kind":       "PrometheusRule",
			"metadata": map[string]interface{}{
				"name":      crName,
				"namespace": ns,
				"labels": map[string]interface{}{
					"app.kubernetes.io/name":    "mrboard",
					"app.kubernetes.io/part-of": "mrboard",
					"release":                   "kps",
				},
			},
			"spec": map[string]interface{}{
				"groups": []interface{}{
					map[string]interface{}{
						"name":  "mrboard.rules",
						"rules": promRules,
					},
				},
			},
		},
	}

	ctx := context.Background()
	_, err = dynamicClient.Resource(gvr).Namespace(ns).Update(ctx, obj, metav1.UpdateOptions{})
	if err != nil {
		// Try create if not exists
		_, err = dynamicClient.Resource(gvr).Namespace(ns).Create(ctx, obj, metav1.CreateOptions{})
		if err != nil {
			return fmt.Errorf("create/update PrometheusRule: %v", err)
		}
	}

	log.Printf("[Alert] Synced %d rules to PrometheusRule/%s in %s", len(promRules), crName, ns)
	return nil
}

// parseKV parses "key1=val1,key2=val2" into map[string]interface{}
func parseKV(s string, defaultKey, defaultVal string) map[string]interface{} {
	result := make(map[string]interface{})
	if defaultKey != "" && defaultVal != "" {
		result[defaultKey] = defaultVal
	}
	if s == "" {
		return result
	}
	for _, part := range strings.Split(s, ",") {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) == 2 {
			result[strings.TrimSpace(kv[0])] = strings.TrimSpace(kv[1])
		}
	}
	return result
}

// AlertChannelController 告警通知渠道控制器 / Alert channel controller
type AlertChannelController struct {
	beego.Controller
}

// List 通知渠道列表 / Channel list
func (this *AlertChannelController) List() {
	channels, err := m.GetAlertChannels()
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": channels}
	this.ServeJSON()
}

// Add 创建通知渠道 / Create channel
func (this *AlertChannelController) Add() {
	gp := this.Ctx.Input
	name := gp.Param("name")
	channelType := gp.Param("type")
	url := gp.Param("url")
	headersStr := gp.Param("headers")

	if name == "" || url == "" {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "name and url are required"}
		this.ServeJSON()
		return
	}
	if channelType == "" {
		channelType = "webhook"
	}

	var headers map[string]string
	if headersStr != "" {
		json.Unmarshal([]byte(headersStr), &headers)
	}

	ch := &m.AlertChannel{
		Name:    name,
		Type:    channelType,
		Url:     url,
		Headers: headers,
		Enabled: true,
	}

	if err := m.CreateAlertChannel(ch); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": ch}
	this.ServeJSON()
}

// Update 更新通知渠道 / Update channel
func (this *AlertChannelController) Update() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}

	ch, err := m.GetAlertChannel(id)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	gp := this.Ctx.Input
	if v := gp.Param("name"); v != "" {
		ch.Name = v
	}
	if v := gp.Param("url"); v != "" {
		ch.Url = v
	}
	if v := gp.Param("headers"); v != "" {
		json.Unmarshal([]byte(v), &ch.Headers)
	}
	if v := gp.Param("enabled"); v != "" {
		ch.Enabled = v == "true" || v == "1"
	}

	if err := m.UpdateAlertChannel(ch); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": ch}
	this.ServeJSON()
}

// Del 删除通知渠道 / Delete channel
func (this *AlertChannelController) Del() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}

	if err := m.DeleteAlertChannel(id); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success"}
	this.ServeJSON()
}

// Test 测试通知渠道 / Test channel
func (this *AlertChannelController) Test() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}

	ch, err := m.GetAlertChannel(id)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	if err := m.SendTestWebhook(ch); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": fmt.Sprintf("test failed: %v", err)}
		this.ServeJSON()
		return
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "test sent successfully"}
	this.ServeJSON()
}
