// alert_channel_model.go
// 告警通知渠道模型 / Alert notification channel model
package models

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/beego/beego/v2/client/orm"
)

// AlertChannel 告警通知渠道 / Alert notification channel
type AlertChannel struct {
	Id         int64             `json:"id"`
	Name       string            `json:"name"`
	Type       string            `json:"type"`
	Url        string            `json:"url"`
	Headers    map[string]string `json:"headers" orm:"-"`
	HeadersRaw string            `json:"-" orm:"column(headers)"`
	Enabled    bool              `json:"enabled"`
	CreatedAt  string            `json:"created_at"`
}

func (c *AlertChannel) TableName() string {
	return "alert_channel"
}

func init() {
	orm.RegisterModel(new(AlertChannel))
}

// GetAlertChannels 获取所有通知渠道 / Get all notification channels
func GetAlertChannels() ([]AlertChannel, error) {
	o := orm.NewOrm()
	var channels []AlertChannel
	_, err := o.QueryTable(new(AlertChannel)).All(&channels)
	// Parse headers JSON for each channel
	for i := range channels {
		if channels[i].HeadersRaw != "" {
			json.Unmarshal([]byte(channels[i].HeadersRaw), &channels[i].Headers)
		}
		if channels[i].Headers == nil {
			channels[i].Headers = make(map[string]string)
		}
	}
	return channels, err
}

// GetAlertChannel 获取单个通知渠道 / Get single notification channel
func GetAlertChannel(id int64) (*AlertChannel, error) {
	o := orm.NewOrm()
	channel := &AlertChannel{Id: id}
	err := o.Read(channel)
	if err != nil {
		return nil, err
	}
	if channel.HeadersRaw != "" {
		json.Unmarshal([]byte(channel.HeadersRaw), &channel.Headers)
	}
	if channel.Headers == nil {
		channel.Headers = make(map[string]string)
	}
	return channel, nil
}

// CreateAlertChannel 创建通知渠道 / Create notification channel
func CreateAlertChannel(ch *AlertChannel) error {
	if ch.Headers != nil {
		b, _ := json.Marshal(ch.Headers)
		ch.HeadersRaw = string(b)
	}
	o := orm.NewOrm()
	_, err := o.Insert(ch)
	return err
}

// UpdateAlertChannel 更新通知渠道 / Update notification channel
func UpdateAlertChannel(ch *AlertChannel) error {
	if ch.Headers != nil {
		b, _ := json.Marshal(ch.Headers)
		ch.HeadersRaw = string(b)
	}
	o := orm.NewOrm()
	_, err := o.Update(ch, "Name", "Type", "Url", "Headers", "Enabled")
	return err
}

// DeleteAlertChannel 删除通知渠道 / Delete notification channel
func DeleteAlertChannel(id int64) error {
	o := orm.NewOrm()
	_, err := o.Delete(&AlertChannel{Id: id})
	return err
}

// GetEnabledAlertChannels 获取所有启用的通知渠道 / Get all enabled channels
func GetEnabledAlertChannels() ([]AlertChannel, error) {
	o := orm.NewOrm()
	var channels []AlertChannel
	_, err := o.QueryTable(new(AlertChannel)).Filter("Enabled", true).All(&channels)
	for i := range channels {
		if channels[i].HeadersRaw != "" {
			json.Unmarshal([]byte(channels[i].HeadersRaw), &channels[i].Headers)
		}
		if channels[i].Headers == nil {
			channels[i].Headers = make(map[string]string)
		}
	}
	return channels, err
}

// SendTestWebhook 发送测试 Webhook / Send test webhook
func SendTestWebhook(ch *AlertChannel) error {
	testPayload := map[string]interface{}{
		"status": "test",
		"alerts": []map[string]string{
			{"alertname": "TestAlert", "severity": "info", "summary": "This is a test alert from MRBoard"},
		},
	}
	body, _ := json.Marshal(testPayload)
	_, err := httpPostJSON(ch.Url, ch.Headers, body)
	return err
}

// httpPostJSON 发送 HTTP POST 请求 / Send HTTP POST request
func httpPostJSON(url string, headers map[string]string, body []byte) (int, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return 0, fmt.Errorf("create request error: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, fmt.Errorf("http post error: %v", err)
	}
	defer resp.Body.Close()
	return resp.StatusCode, nil
}
