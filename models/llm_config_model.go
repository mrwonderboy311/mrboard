package models

import (
	"time"
	"github.com/beego/beego/v2/client/orm"
)

type LlmConfig struct {
	Id          int64   `json:"id" orm:"column(id);auto"`
	Name        string  `json:"name" orm:"column(name)"`
	Provider    string  `json:"provider" orm:"column(provider)"`
	ApiUrl      string  `json:"api_url" orm:"column(api_url)"`
	ApiKey      string  `json:"api_key" orm:"column(api_key)"`
	Model       string  `json:"model" orm:"column(model)"`
	MaxTokens   int     `json:"max_tokens" orm:"column(max_tokens)"`
	Temperature float64 `json:"temperature" orm:"column(temperature)"`
	IsDefault   bool    `json:"is_default" orm:"column(is_default)"`
	CreatedAt   string  `json:"created_at" orm:"column(created_at)"`
}

func (t *LlmConfig) TableName() string {
	return "llm_config"
}

func init() {
	orm.RegisterModel(new(LlmConfig))
}

func GetLlmConfigs() ([]LlmConfig, error) {
	o := orm.NewOrm()
	var configs []LlmConfig
	_, err := o.QueryTable(new(LlmConfig)).OrderBy("-is_default", "-id").All(&configs)
	return configs, err
}

func GetLlmConfig(id int64) (*LlmConfig, error) {
	o := orm.NewOrm()
	config := &LlmConfig{Id: id}
	err := o.Read(config)
	return config, err
}

func GetDefaultLlmConfig() (*LlmConfig, error) {
	o := orm.NewOrm()
	config := &LlmConfig{}
	err := o.QueryTable(new(LlmConfig)).Filter("is_default", true).One(config)
	if err != nil {
		err = o.QueryTable(new(LlmConfig)).OrderBy("-id").Limit(1).One(config)
	}
	return config, err
}

func CreateLlmConfig(config *LlmConfig) error {
	config.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	o := orm.NewOrm()
	_, err := o.Insert(config)
	return err
}

func UpdateLlmConfig(config *LlmConfig) error {
	o := orm.NewOrm()
	_, err := o.Update(config, "name", "provider", "api_url", "api_key", "model", "max_tokens", "temperature", "is_default")
	return err
}

func DeleteLlmConfig(id int64) error {
	o := orm.NewOrm()
	_, err := o.Delete(&LlmConfig{Id: id})
	return err
}
