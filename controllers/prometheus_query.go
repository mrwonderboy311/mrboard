package controllers

import (
	"strconv"
	"mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
)

type PrometheusQueryController struct {
	beego.Controller
}

func (c *PrometheusQueryController) QueryRange() {
	clusterId := c.GetString("clusterId")
	metric := c.GetString("metric")
	if clusterId == "" || metric == "" {
		c.Data["json"] = map[string]interface{}{"code": -1, "msg": "缺少必填参数 clusterId 或 metric"}
		c.ServeJSON()
		return
	}
	namespace := c.GetString("namespace")
	pod := c.GetString("pod")
	node := c.GetString("node")
	service := c.GetString("service")
	startStr := c.GetString("start")
	endStr := c.GetString("end")
	stepStr := c.GetString("step")
	start, _ := strconv.ParseInt(startStr, 10, 64)
	end, _ := strconv.ParseInt(endStr, 10, 64)
	if stepStr == "" {
		stepStr = "60"
	}
	step, _ := strconv.ParseInt(stepStr, 10, 64)
	if start == 0 || end == 0 {
		c.Data["json"] = map[string]interface{}{"code": -1, "msg": "缺少必填参数 start 或 end"}
		c.ServeJSON()
		return
	}
	result, err := models.PrometheusQueryRange(clusterId, metric, namespace, pod, node, service, start, end, step)
	if err != nil {
		c.Data["json"] = map[string]interface{}{"code": -1, "msg": err.Error()}
		c.ServeJSON()
		return
	}
	c.Data["json"] = map[string]interface{}{"code": 0, "msg": "success", "data": result}
	c.ServeJSON()
}

func (c *PrometheusQueryController) LabelValues() {
	clusterId := c.GetString("clusterId")
	label := c.GetString("label")
	if clusterId == "" || label == "" {
		c.Data["json"] = map[string]interface{}{"code": -1, "msg": "缺少必填参数 clusterId 或 label"}
		c.ServeJSON()
		return
	}
	match := c.GetString("match")
	values, err := models.PrometheusLabelValues(clusterId, label, match)
	if err != nil {
		c.Data["json"] = map[string]interface{}{"code": -1, "msg": err.Error()}
		c.ServeJSON()
		return
	}
	c.Data["json"] = map[string]interface{}{"code": 0, "msg": "success", "data": values}
	c.ServeJSON()
}
