// alert_history_model.go
// 告警历史模型 / Alert history model
package models

import (
	"time"

	"github.com/beego/beego/v2/client/orm"
)

// AlertHistory 告警历史 / Alert history
type AlertHistory struct {
	Id          int64  `json:"id"`
	ClusterId   string `json:"cluster_id"`
	RuleName    string `json:"rule_name"`
	Severity    string `json:"severity"`
	Status      string `json:"status"`
	Labels      string `json:"labels"`
	Annotations string `json:"annotations"`
	StartsAt    string `json:"starts_at"`
	EndsAt      string `json:"ends_at"`
	Notified    bool   `json:"notified"`
	CreatedAt   string `json:"created_at"`
}

func (h *AlertHistory) TableName() string {
	return "alert_history"
}

func init() {
	orm.RegisterModel(new(AlertHistory))
}

// GetAlertHistory 获取告警历史 / Get alert history
func GetAlertHistory(clusterId, severity, status string, page, pageSize int64) ([]AlertHistory, int64, error) {
	o := orm.NewOrm()
	qs := o.QueryTable(new(AlertHistory))
	if clusterId != "" {
		qs = qs.Filter("ClusterId", clusterId)
	}
	if severity != "" {
		qs = qs.Filter("Severity", severity)
	}
	if status != "" {
		qs = qs.Filter("Status", status)
	}
	total, _ := qs.Count()
	var history []AlertHistory
	_, err := qs.OrderBy("-CreatedAt").Limit(pageSize, (page-1)*pageSize).All(&history)
	return history, total, err
}

// CreateAlertHistory 创建告警历史 / Create alert history
func CreateAlertHistory(h *AlertHistory) error {
	o := orm.NewOrm()
	_, err := o.Insert(h)
	return err
}

// CleanupOldAlertHistory 清理旧告警历史 / Cleanup old alert history
func CleanupOldAlertHistory(days int) error {
	o := orm.NewOrm()
	cutoff := time.Now().AddDate(0, 0, -days).Format("2006-01-02 15:04:05")
	_, err := o.QueryTable(new(AlertHistory)).Filter("CreatedAt__lt", cutoff).Delete()
	return err
}
