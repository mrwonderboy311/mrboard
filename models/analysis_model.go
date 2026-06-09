package models

import (
	"time"
	"github.com/beego/beego/v2/client/orm"
)

type AnalysisHistory struct {
	Id              int64  `json:"id" orm:"column(id);auto"`
	ClusterId       string `json:"cluster_id" orm:"column(cluster_id)"`
	TriggerType     string `json:"trigger_type" orm:"column(trigger_type)"`
	TriggerId       string `json:"trigger_id" orm:"column(trigger_id)"`
	AlertName       string `json:"alert_name" orm:"column(alert_name)"`
	Severity        string `json:"severity" orm:"column(severity)"`
	Namespace       string `json:"namespace" orm:"column(namespace)"`
	Summary         string `json:"summary" orm:"column(summary)"`
	RootCause       string `json:"root_cause" orm:"column(root_cause)"`
	EvidenceJson    string `json:"evidence_json" orm:"column(evidence_json)"`
	SuggestionsJson string `json:"suggestions_json" orm:"column(suggestions_json)"`
	ModelUsed       string `json:"model_used" orm:"column(model_used)"`
	TokensUsed      int    `json:"tokens_used" orm:"column(tokens_used)"`
	Rounds          int    `json:"rounds" orm:"column(rounds)"`
	FeedbackScore   int    `json:"feedback_score" orm:"column(feedback_score)"`
	FeedbackNote    string `json:"feedback_note" orm:"column(feedback_note)"`
	CreatedAt       string `json:"created_at" orm:"column(created_at)"`
}

func (t *AnalysisHistory) TableName() string {
	return "analysis_history"
}

type AlertMemory struct {
	Id           int64  `json:"id" orm:"column(id);auto"`
	Fingerprint  string `json:"fingerprint" orm:"column(fingerprint)"`
	AlertName    string `json:"alert_name" orm:"column(alert_name)"`
	Severity     string `json:"severity" orm:"column(severity)"`
	ClusterId    string `json:"cluster_id" orm:"column(cluster_id)"`
	Namespace    string `json:"namespace" orm:"column(namespace)"`
	AnalysisJson string `json:"analysis_json" orm:"column(analysis_json)"`
	FeedbackScore int   `json:"feedback_score" orm:"column(feedback_score)"`
	FeedbackNote  string `json:"feedback_note" orm:"column(feedback_note)"`
	CreatedAt    string `json:"created_at" orm:"column(created_at)"`
}

func (t *AlertMemory) TableName() string {
	return "alert_memory"
}

type Knowledge struct {
	Id        int64  `json:"id" orm:"column(id);auto"`
	ClusterId string `json:"cluster_id" orm:"column(cluster_id)"`
	Category  string `json:"category" orm:"column(category)"`
	Content   string `json:"content" orm:"column(content)"`
	CreatedAt string `json:"created_at" orm:"column(created_at)"`
}

func (t *Knowledge) TableName() string {
	return "knowledge"
}

func init() {
	orm.RegisterModel(new(AnalysisHistory), new(AlertMemory), new(Knowledge))
}

func CreateAnalysisHistory(h *AnalysisHistory) error {
	h.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	o := orm.NewOrm()
	_, err := o.Insert(h)
	return err
}

func GetAnalysisHistories(clusterId string, page, pageSize int64) ([]AnalysisHistory, int64, error) {
	o := orm.NewOrm()
	qs := o.QueryTable(new(AnalysisHistory))
	if clusterId != "" {
		qs = qs.Filter("cluster_id", clusterId)
	}
	total, _ := qs.Count()
	var results []AnalysisHistory
	qs.OrderBy("-created_at").Limit(pageSize, (page-1)*pageSize).All(&results)
	return results, total, nil
}

func GetAnalysisHistory(id int64) (*AnalysisHistory, error) {
	o := orm.NewOrm()
	h := &AnalysisHistory{Id: id}
	err := o.Read(h)
	return h, err
}

func DeleteAnalysisHistory(id int64) error {
	o := orm.NewOrm()
	_, err := o.Delete(&AnalysisHistory{Id: id})
	return err
}

func CleanOldAnalysisHistory(clusterId string, days int) (int64, error) {
	o := orm.NewOrm()
	cutoff := time.Now().AddDate(0, 0, -days).Format("2006-01-02 15:04:05")
	qs := o.QueryTable(new(AnalysisHistory)).Filter("created_at__lt", cutoff)
	if clusterId != "" {
		qs = qs.Filter("cluster_id", clusterId)
	}
	count, err := qs.Delete()
	return count, err
}

func UpdateAnalysisFeedback(id int64, score int, note string) error {
	o := orm.NewOrm()
	h := &AnalysisHistory{Id: id}
	if err := o.Read(h); err != nil {
		return err
	}
	h.FeedbackScore = score
	h.FeedbackNote = note
	_, err := o.Update(h, "feedback_score", "feedback_note")
	return err
}

func GetAlertMemoryByFingerprint(fingerprint string) (*AlertMemory, error) {
	o := orm.NewOrm()
	m := &AlertMemory{}
	err := o.QueryTable(new(AlertMemory)).Filter("fingerprint", fingerprint).OrderBy("-created_at").Limit(1).One(m)
	return m, err
}

func CreateAlertMemory(m *AlertMemory) error {
	m.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	o := orm.NewOrm()
	_, err := o.Insert(m)
	return err
}

func GetKnowledgeByCluster(clusterId, category string) ([]Knowledge, error) {
	o := orm.NewOrm()
	qs := o.QueryTable(new(Knowledge)).Filter("cluster_id", clusterId)
	if category != "" {
		qs = qs.Filter("category", category)
	}
	var results []Knowledge
	qs.OrderBy("-created_at").Limit(20).All(&results)
	return results, nil
}

func CreateKnowledge(k *Knowledge) error {
	k.CreatedAt = time.Now().Format("2006-01-02 15:04:05")
	o := orm.NewOrm()
	_, err := o.Insert(k)
	return err
}
