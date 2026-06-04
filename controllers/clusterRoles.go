package controllers

import (
	//"encoding/json"
	"log"
	"strings"
	m "xkube/models"

	beego "github.com/beego/beego/v2/server/web"
)

type ClusterRolesController struct {
	beego.Controller
}

func (this *ClusterRolesController) List() {
	clusterId := this.GetString("clusterId")
	List, err := m.ClusterRolesList(clusterId)
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

func (this *ClusterRolesController) Yaml() {
	clusterId := this.GetString("clusterId")
	crName := this.GetString("crName")
	yamlStr, _ := m.GetClusterRolesYaml(clusterId, crName)
	this.Ctx.WriteString(yamlStr)
}

func (this *ClusterRolesController) Del() {
	clusterId := this.GetString("clusterId")
	crName := this.GetString("crName")
	err := m.ClusterRolesDelete(clusterId, crName)
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

func (this *ClusterRolesController) CreateByYaml() {
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
