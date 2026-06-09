// cluster.go
package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"mrboard/common"
	m "mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
	"github.com/tidwall/gjson"
)

type ClusterController struct {
	beego.Controller
}

// 列表
func (this *ClusterController) List() {
	id := this.GetString("id")
	clusterId := this.GetString("clusterId")
	page, _ := this.GetInt64("page")
	page_size, _ := this.GetInt64("limit")

	// Redis缓存：仅缓存无筛选条件的全量列表（首页最频繁的请求）
	cacheKey := fmt.Sprintf("clusterList:%s:%d:%d", clusterId, page, page_size)
	if id == "" {
		if cached := common.Get(cacheKey); cached != "" {
			var cacheResp map[string]interface{}
			if err := json.Unmarshal([]byte(cached), &cacheResp); err == nil {
				this.Data["json"] = &cacheResp
				this.ServeJSON()
				return
			}
		}
	}

	datas, count := m.GetList_Cluster(id, clusterId, page, page_size)
	resp := map[string]interface{}{"code": 0, "msg": "", "count": count, "data": &datas}

	// 写入Redis缓存，300秒过期
	if id == "" {
		if body, err := json.Marshal(&resp); err == nil {
			_ = common.SetEx(cacheKey, string(body), 300)
		}
	}

	this.Data["json"] = &resp
	this.ServeJSON()
}

func (this *ClusterController) Detail() {
	id, _ := this.GetInt64("id")

	// Redis缓存
	cacheKey := fmt.Sprintf("clusterDetail:%d", id)
	if cached := common.Get(cacheKey); cached != "" {
		var cacheResp map[string]interface{}
		if err := json.Unmarshal([]byte(cached), &cacheResp); err == nil {
			this.Data["json"] = &cacheResp
			this.ServeJSON()
			return
		}
	}

	datas, err := m.GetDetail_Cluster(id)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "DeailFail"}
		this.ServeJSON()
		return
	}
	resp := map[string]interface{}{"code": 0, "msg": "", "data": &datas}
	if body, err := json.Marshal(&resp); err == nil {
		_ = common.SetEx(cacheKey, string(body), 300)
	}
	this.Data["json"] = &resp
	this.ServeJSON()
}

// 添加
func (this *ClusterController) Add() {
	u := m.Xkb_cluster{}
	this.Ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
	this.Ctx.ResponseWriter.Header().Set("Content-Type", "application/json;charset=utf-8")
	gp := gjson.ParseBytes(this.Ctx.Input.RequestBody)

	if gp.Get("cluster_id").Exists() {
		u.ClusterId = gp.Get("cluster_id").String()
		u.ClusterName = gp.Get("cluster_name").String()
		u.KubeVersion = gp.Get("kube_version").String()
		u.IdcName = gp.Get("idc_name").String()
		u.KubeConfig = gp.Get("kube_config").String()
		u.BearerToken = gp.Get("bearer_token").String()
		u.LanSlbip = gp.Get("lan_slbip").String()
		u.WanSlbip = gp.Get("wan_slbip").String()
		u.Status = gp.Get("status").Int()
		u.Remarks = gp.Get("remarks").String()
		u.LokiUrl = gp.Get("loki_url").String()
		u.PrometheusUrl = gp.Get("prometheus_url").String()
		u.LokiConfig = gp.Get("loki_config").String()
		u.AlertmanagerUrl = gp.Get("alertmanager_url").String()
		u.GrafanaUrl = gp.Get("grafana_url").String()

		id, err := m.Add_Cluster(&u)
		if err == nil && id > 0 {
			// 清除集群列表缓存
			for _, k := range common.Keys("clusterList:*") {
				_ = common.Del(k)
			}
			log.Printf("[INFO] Add success")
			this.Ctx.WriteString(`{"code":0,"msg":"success"}`)
		} else {
			log.Printf("[ERROR] Add Fail:%s", err)
			this.Ctx.WriteString(`{"code":-1,"msg":"error"}`)
		}
	} else {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "bodyParseFail"}
		this.ServeJSON()
	}
}

// 删除
func (this *ClusterController) Del() {
	this.Ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
	this.Ctx.ResponseWriter.Header().Set("Content-Type", "application/json;charset=utf-8")

	Id, _ := this.GetInt64("id")
	cluster_id := this.GetString("cluster_id")
	respid, err := m.DelById_Cluster(Id)
	if err == nil && respid > 0 {
		_ = common.Del("count_" + cluster_id)
		// 清除集群缓存
		_ = common.Del(fmt.Sprintf("clusterDetail:%d", Id))
		for _, k := range common.Keys("clusterList:*") {
			_ = common.Del(k)
		}
		log.Printf("[INFO] Delsuccess")
		this.Ctx.WriteString(`{"code":0,"msg":"success"}`)
	} else {
		log.Printf("[ERROR] Del Error:%s\n", err.Error())
		this.Ctx.WriteString(`{"code":-1,"msg":"Error"}`)
	}
}

// 更新某个字段
func (this *ClusterController) Edit() {
	id := this.GetString("id")
	this.Ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
	this.Ctx.ResponseWriter.Header().Set("Content-Type", "application/json;charset=utf-8")
	gp := gjson.ParseBytes(this.Ctx.Input.RequestBody)

	if gp.Get("name").Exists() {
		name := gp.Get("name").String()
		value := gp.Get("value").String()
		_, err := m.Edit_Cluster(id, name, value)
		if err == nil {
			// 清除集群缓存
			for _, k := range common.Keys("clusterList:*") {
				_ = common.Del(k)
			}
			_ = common.Del("clusterDetail:" + id)
			_ = common.Del("lokiUrl:" + id)
			_ = common.Del("lokiConfig:" + id)
			_ = common.Del("tempoUrl:" + id)
			_ = common.Del("prometheusUrl:" + id)
			this.Ctx.WriteString(`{"code":0,"msg":"success"}`)
		} else {
			log.Printf("[ERROR] update Fail:%s\n", err)
			this.Ctx.WriteString(fmt.Sprintf(`{"code":-1,"msg":"%s"}`, err.Error()))
		}
	} else {
		this.Ctx.WriteString(`{"code":-1,"msg":"bodyParseFail"}`)
	}
}

func (this *ClusterController) Update() {
	u := m.Xkb_cluster{}
	this.Ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
	this.Ctx.ResponseWriter.Header().Set("Content-Type", "application/json;charset=utf-8")

	gp := gjson.ParseBytes(this.Ctx.Input.RequestBody)
	// log.Println(string(this.Ctx.Input.RequestBody))
	// log.Println(gp.Get("cluster_id").String())
	// log.Println(gp.Get("id").Int())
	if gp.Get("id").Int() > 0 {
		u.Id = gp.Get("id").Int()
		u.ClusterId = gp.Get("cluster_id").String()
		u.ClusterName = gp.Get("cluster_name").String()
		u.IdcName = gp.Get("idc_name").String()
		u.KubeVersion = gp.Get("kube_version").String()
		u.KubeConfig = gp.Get("kube_config").String()
		u.BearerToken = gp.Get("bearer_token").String()
		u.LanSlbip = gp.Get("lan_slbip").String()
		u.WanSlbip = gp.Get("wan_slbip").String()
		u.Status = gp.Get("status").Int()
		u.Remarks = gp.Get("remarks").String()
		u.LokiUrl = gp.Get("loki_url").String()
		u.PrometheusUrl = gp.Get("prometheus_url").String()
		u.LokiConfig = gp.Get("loki_config").String()
		u.AlertmanagerUrl = gp.Get("alertmanager_url").String()
		u.GrafanaUrl = gp.Get("grafana_url").String()

		id, err := m.Update_Cluster(&u)
		if err == nil && id > 0 {
			// 清除集群缓存
			_ = common.Del(fmt.Sprintf("clusterDetail:%d", u.Id))
			_ = common.Del("lokiUrl:" + u.ClusterId)
			_ = common.Del("lokiConfig:" + u.ClusterId)
			_ = common.Del("tempoUrl:" + u.ClusterId)
			_ = common.Del("prometheusUrl:" + u.ClusterId)
			for _, k := range common.Keys("clusterList:*") {
				_ = common.Del(k)
			}
			this.Ctx.WriteString(`{"code":0,"msg":"success"}`)
		} else {
			log.Printf("[ERROR] updatekubeCluster Fail:%s\n", err)
			this.Ctx.WriteString(`{"code":-1,"msg":"error"}`)
		}
	} else {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "bodyParseFail"}
		this.ServeJSON()
	}
}

func (this *ClusterController) Count() {
	this.Ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
	this.Ctx.ResponseWriter.Header().Set("Content-Type", "application/json;charset=utf-8")
	resp, _ := m.CountWorkLoad()
	count := len(resp)
	code := 0
	msg := "success"
	if count < 1 {
		code = -1
		msg = "nodata"
	}
	this.Data["json"] = &map[string]interface{}{"code": code, "msg": msg, "count": count, "data": &resp}
	this.ServeJSON()

}
