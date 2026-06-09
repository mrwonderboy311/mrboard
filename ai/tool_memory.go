package ai

import (
	"encoding/json"
	"fmt"

	m "mrboard/models"
)

func RegisterMemoryTools(registry *ToolRegistry) {
	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "search_memory",
			Description: "搜索历史分析记忆，查找类似告警的历史分析结果。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"fingerprint": map[string]interface{}{
						"type":        "string",
						"description": "告警指纹（从告警信息中获取）",
					},
					"keyword": map[string]interface{}{
						"type":        "string",
						"description": "搜索关键词（告警名称）",
					},
				},
				"required": []string{"keyword"},
			},
		},
		Handler: handleSearchMemory,
	})

	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "save_memory",
			Description: "保存分析结论到记忆系统，用于未来类似告警的参考。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"fingerprint": map[string]interface{}{
						"type":        "string",
						"description": "告警指纹",
					},
					"alertName": map[string]interface{}{
						"type":        "string",
						"description": "告警名称",
					},
					"conclusion": map[string]interface{}{
						"type":        "string",
						"description": "分析结论摘要",
					},
				},
				"required": []string{"fingerprint", "conclusion"},
			},
		},
		Handler: handleSaveMemory,
	})
}

func handleSearchMemory(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Fingerprint string `json:"fingerprint"`
		Keyword     string `json:"keyword"`
	}
	json.Unmarshal(input, &params)

	if params.Fingerprint != "" {
		mem, err := m.GetAlertMemoryByFingerprint(params.Fingerprint)
		if err != nil {
			return "未找到历史记忆", nil
		}
		data, _ := json.MarshalIndent(mem, "", "  ")
		return string(data), nil
	}

	return "请提供 fingerprint 或 keyword 进行搜索", nil
}

func handleSaveMemory(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Fingerprint string `json:"fingerprint"`
		AlertName   string `json:"alertName"`
		Conclusion  string `json:"conclusion"`
	}
	if err := json.Unmarshal(input, &params); err != nil {
		return "", err
	}

	mem := &m.AlertMemory{
		Fingerprint:  params.Fingerprint,
		AlertName:    params.AlertName,
		ClusterId:    clusterId,
		AnalysisJson: params.Conclusion,
	}
	if err := m.CreateAlertMemory(mem); err != nil {
		return "", fmt.Errorf("save memory: %w", err)
	}
	return "记忆已保存", nil
}
