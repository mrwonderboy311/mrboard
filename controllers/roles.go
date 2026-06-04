package controllers

import (
	//"encoding/json"
	"log"
	"strings"
	m "mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
)

type RolesController struct {
	beego.Controller
}

func (this *RolesController) List() {
	clusterId := this.GetString("clusterId")
	nameSpace := this.GetString("nameSpace")
	List, err := m.RolesList(clusterId, nameSpace)
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

func (this *RolesController) Yaml() {
	clusterId := this.GetString("clusterId")
	nameSpace := this.GetString("nameSpace")
	rolesName := this.GetString("rolesName")
	yamlStr, _ := m.GetRolesYaml(clusterId, nameSpace, rolesName)
	this.Ctx.WriteString(yamlStr)
}

func (this *RolesController) Del() {
	clusterId := this.GetString("clusterId")
	nameSpace := this.GetString("nameSpace")
	rolesName := this.GetString("rolesName")
	err := m.RolesDelete(clusterId, nameSpace, rolesName)
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

func (this *RolesController) CreateByYaml() {
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
