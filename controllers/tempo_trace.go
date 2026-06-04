// tempo_trace.go
package controllers

import (
	m "mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
)

type TempoTraceController struct {
	beego.Controller
}

// Search 搜索链路
func (this *TempoTraceController) Search() {
	clusterId := this.GetString("clusterId")
	service := this.GetString("service")
	operation := this.GetString("operation")
	tags := this.GetString("tags")
	start := this.GetString("start")
	end := this.GetString("end")
	limit := this.GetString("limit")
	minDuration := this.GetString("minDuration")
	maxDuration := this.GetString("maxDuration")

	traces, err := m.SearchTraces(clusterId, service, operation, tags, start, end, limit, minDuration, maxDuration)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": traces}
	this.ServeJSON()
}

// Trace 获取链路详情
func (this *TempoTraceController) Trace() {
	clusterId := this.GetString("clusterId")
	traceId := this.GetString("traceId")

	detail, err := m.GetTraceDetail(clusterId, traceId)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": detail}
	this.ServeJSON()
}

// Dependencies 获取服务依赖
func (this *TempoTraceController) Dependencies() {
	clusterId := this.GetString("clusterId")
	start := this.GetString("start")
	end := this.GetString("end")

	deps, err := m.GetDependencies(clusterId, start, end)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": deps}
	this.ServeJSON()
}

// Tags 查询标签列表
func (this *TempoTraceController) Tags() {
	clusterId := this.GetString("clusterId")
	service := this.GetString("service")

	tags, err := m.SearchTags(clusterId, service)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": tags}
	this.ServeJSON()
}

// TagValues 查询标签值
func (this *TempoTraceController) TagValues() {
	clusterId := this.GetString("clusterId")
	tag := this.GetString("tag")
	service := this.GetString("service")

	values, err := m.SearchTagValues(clusterId, tag, service)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": values}
	this.ServeJSON()
}

// TraceBySpanID 通过SpanID查找链路
func (this *TempoTraceController) TraceBySpanID() {
	clusterId := this.GetString("clusterId")
	spanID := this.GetString("spanID")

	traceID, err := m.GetTraceBySpanID(clusterId, spanID)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": map[string]string{"traceID": traceID}}
	this.ServeJSON()
}

// ServiceOverview 获取服务概览
func (this *TempoTraceController) ServiceOverview() {
	clusterId := this.GetString("clusterId")
	serviceName := this.GetString("serviceName")

	overview, err := m.GetServiceOverview(clusterId, serviceName)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": overview}
	this.ServeJSON()
}
