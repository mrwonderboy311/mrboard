package controllers

import (
	"encoding/json"
	"strconv"

	m "mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
)

type AIModelController struct {
	beego.Controller
}

func (this *AIModelController) List() {
	configs, err := m.GetLlmConfigs()
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": configs}
	this.ServeJSON()
}

func (this *AIModelController) Add() {
	var config m.LlmConfig
	json.Unmarshal(this.Ctx.Input.RequestBody, &config)
	if config.Name == "" || config.ApiUrl == "" || config.Model == "" {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "name, api_url, model required"}
		this.ServeJSON()
		return
	}
	if err := m.CreateLlmConfig(&config); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": config}
	this.ServeJSON()
}

func (this *AIModelController) Update() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}

	var config m.LlmConfig
	json.Unmarshal(this.Ctx.Input.RequestBody, &config)
	config.Id = id
	if err := m.UpdateLlmConfig(&config); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success"}
	this.ServeJSON()
}

func (this *AIModelController) Delete() {
	idStr := this.Ctx.Input.Param(":id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "invalid id"}
		this.ServeJSON()
		return
	}
	if err := m.DeleteLlmConfig(id); err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success"}
	this.ServeJSON()
}
