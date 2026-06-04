// loki_log.go
package controllers

import (
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	m "mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
	"github.com/gorilla/websocket"
)

type LokiLogController struct {
	beego.Controller
}

// 查询标签列表
func (this *LokiLogController) Labels() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	start := this.GetString("start")
	end := this.GetString("end")

	labels, err := m.QueryLabels(clusterId, namespace, start, end)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": labels}
	this.ServeJSON()
}

// 查询标签列表（带值） / Query labels with values
func (this *LokiLogController) LabelsV2() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	start := this.GetString("start")
	end := this.GetString("end")

	labels, err := m.QueryLabelsWithValues(clusterId, namespace, start, end)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": labels}
	this.ServeJSON()
}

// 查询标签值
func (this *LokiLogController) LabelValues() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	label := this.GetString("label")
	start := this.GetString("start")
	end := this.GetString("end")

	labelValues, err := m.QueryLabelValues(clusterId, namespace, label, start, end)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": labelValues}
	this.ServeJSON()
}

// 查询日志
func (this *LokiLogController) Query() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	servicesStr := this.GetString("services")
	levelsStr := this.GetString("levels")
	search := this.GetString("search")
	logql := this.GetString("logql")
	start := this.GetString("start")
	end := this.GetString("end")
	limitStr := this.GetString("limit")
	direction := this.GetString("direction")

	var services []string
	if servicesStr != "" {
		for _, s := range strings.Split(servicesStr, ",") {
			s = strings.TrimSpace(s)
			if s != "" {
				services = append(services, s)
			}
		}
	}

	var levels []string
	if levelsStr != "" {
		for _, l := range strings.Split(levelsStr, ",") {
			l = strings.TrimSpace(l)
			if l != "" {
				levels = append(levels, l)
			}
		}
	}

	limit := 1000
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 {
			limit = v
		}
	}

	if direction == "" {
		direction = "backward"
	}

	entries, total, err := m.QueryLogs(clusterId, namespace, services, levels, search, logql, start, end, limit, direction)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": map[string]interface{}{"entries": entries, "total": total}}
	this.ServeJSON()
}

// 查询日志直方图
func (this *LokiLogController) Histogram() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	servicesStr := this.GetString("services")
	levelsStr := this.GetString("levels")
	start := this.GetString("start")
	end := this.GetString("end")
	step := this.GetString("step")
	if step == "" {
		step = m.CalcStep(start, end)
	}

	var services []string
	if servicesStr != "" {
		for _, s := range strings.Split(servicesStr, ",") {
			s = strings.TrimSpace(s)
			if s != "" {
				services = append(services, s)
			}
		}
	}

	var levels []string
	if levelsStr != "" {
		for _, l := range strings.Split(levelsStr, ",") {
			l = strings.TrimSpace(l)
			if l != "" {
				levels = append(levels, l)
			}
		}
	}

	result, err := m.GetHistogram(clusterId, namespace, services, levels, start, end, step)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": result}
	this.ServeJSON()
}

// 查询日志级别统计
func (this *LokiLogController) Levels() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	servicesStr := this.GetString("services")
	start := this.GetString("start")
	end := this.GetString("end")

	var services []string
	if servicesStr != "" {
		for _, s := range strings.Split(servicesStr, ",") {
			s = strings.TrimSpace(s)
			if s != "" {
				services = append(services, s)
			}
		}
	}

	result, err := m.Levels(clusterId, namespace, services, start, end)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": result}
	this.ServeJSON()
}

// 检测日志字段 / Detect log fields
func (this *LokiLogController) DetectedFields() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	services := this.GetString("services")
	start := this.GetString("start")
	end := this.GetString("end")

	result, err := m.QueryDetectedFields(clusterId, namespace, services, start, end)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": result}
	this.ServeJSON()
}

// 查询日志模式 / Query log patterns
func (this *LokiLogController) Patterns() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	services := this.GetString("services")
	levels := this.GetString("levels")
	start := this.GetString("start")
	end := this.GetString("end")

	result, err := m.QueryPatterns(clusterId, namespace, services, levels, start, end)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": result}
	this.ServeJSON()
}

// Loki日志实时tail WebSocket
type LokiLogTailHandler struct{}

var lokiUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (h *LokiLogTailHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	clusterId := r.FormValue("clusterId")
	namespace := r.FormValue("namespace")
	servicesStr := r.FormValue("services")

	if clusterId == "" {
		http.Error(w, "clusterId required", http.StatusBadRequest)
		return
	}

	// 获取Loki连接信息
	lokiBaseUrl, err := m.GetLokiUrl(clusterId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 构建Loki tail WebSocket URL
	query := fmt.Sprintf(`{namespace="%s"}`, namespace)
	if servicesStr != "" {
		svcParts := strings.Split(servicesStr, ",")
		for i := range svcParts {
			svcParts[i] = strings.TrimSpace(svcParts[i])
		}
		query = fmt.Sprintf(`{namespace="%s", service_name=~"%s"}`, namespace, strings.Join(svcParts, "|"))
	}
	lokiWsUrl := strings.Replace(lokiBaseUrl, "http://", "ws://", 1)
	lokiWsUrl = strings.Replace(lokiWsUrl, "https://", "wss://", 1)
	lokiWsUrl = strings.TrimRight(lokiWsUrl, "/") + "/loki/api/v1/tail?query=" + url.QueryEscape(query)

	// 升级客户端连接为WebSocket
	clientConn, err := lokiUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer clientConn.Close()

	// 连接Loki tail WebSocket
	lokiConn, _, err := websocket.DefaultDialer.Dial(lokiWsUrl, nil)
	if err != nil {
		clientConn.WriteMessage(websocket.TextMessage,
			[]byte(`{"error":"failed to connect to loki"}`))
		return
	}
	defer lokiConn.Close()

	// 从Loki转发到客户端
	errCh := make(chan error, 2)

	go func() {
		for {
			msgType, msg, err := lokiConn.ReadMessage()
			if err != nil {
				errCh <- err
				return
			}
			if err := clientConn.WriteMessage(msgType, msg); err != nil {
				errCh <- err
				return
			}
		}
	}()

	// 从客户端读取（处理关闭信号）
	go func() {
		for {
			if _, _, err := clientConn.ReadMessage(); err != nil {
				errCh <- err
				return
			}
		}
	}()

	<-errCh
}
