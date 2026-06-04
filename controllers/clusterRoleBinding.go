package controllers

import (
	//"encoding/json"
	"log"
	"strings"
	m "xkube/models"

	beego "github.com/beego/beego/v2/server/web"
)

type ClusterRoleBindingController struct {
	beego.Controller
}

func (this *ClusterRoleBindingController) List() {
	clusterId := this.GetString("clusterId")
	List, err := m.ClusterRoleBindingList(clusterId)
	msg := "success"
	code := 0
	count := len(List)
	if err != nil {
		log.Println(err)
		msg = err.Error()
		code = -1
	}
	this.Data["json"] = &map[string]interface{}{"code": code, "msg": msg, "count": count, "data": &List}
	//this.Data["json"] = &datas
	this.ServeJSON()
}

func (this *ClusterRoleBindingController) Yaml() {
	clusterId := this.GetString("clusterId")
	crbName := this.GetString("crbName")
	yamlStr, _ := m.GetClusterRoleBindingYaml(clusterId, crbName)
	this.Ctx.WriteString(yamlStr)
}

func (this *ClusterRoleBindingController) Del() {
	clusterId := this.GetString("clusterId")
	crbName := this.GetString("crbName")
	err := m.ClusterRoleBindingDelete(clusterId, crbName)
	code := 0
	msg := "success"
	if err != nil {
		log.Println(err)
		code = -1
		msg = err.Error()
	}
	_ = m.ClearCache(clusterId)
	this.Data["json"] = &map[string]interface{}{"code": code, "msg": msg}
	this.ServeJSON()
}

func (this *ClusterRoleBindingController) CreateByYaml() {
	clusterId := this.GetString("clusterId")
	err := m.ApplyYaml(clusterId, strings.ReplaceAll(string(this.Ctx.Input.RequestBody), "%25", "%"))
	code := 0
	msg := "success"
	if err != nil {
		log.Println(err)
		code = -1
		msg = err.Error()
	}
	_ = m.ClearCache(clusterId)
	this.Data["json"] = &map[string]interface{}{"code": code, "msg": msg}
	this.ServeJSON()
}
