package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"mrboard/common"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func RegisterK8STools(registry *ToolRegistry) {
	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "get_pod_status",
			Description: "查看指定命名空间的 Pod 状态，包括运行状态、重启次数、资源使用。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"namespace": map[string]interface{}{
						"type":        "string",
						"description": "命名空间，留空查看所有",
					},
					"podName": map[string]interface{}{
						"type":        "string",
						"description": "Pod 名称（可选，模糊匹配）",
					},
				},
			},
		},
		Handler: handleGetPodStatus,
	})

	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "get_pod_logs",
			Description: "查看 Pod 的容器日志。用于查看应用崩溃前的错误信息。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"namespace": map[string]interface{}{
						"type":        "string",
						"description": "命名空间",
					},
					"podName": map[string]interface{}{
						"type":        "string",
						"description": "Pod 名称",
					},
					"tailLines": map[string]interface{}{
						"type":        "integer",
						"description": "返回最后几行，默认 100",
					},
				},
				"required": []string{"namespace", "podName"},
			},
		},
		Handler: handleGetPodLogs,
	})

	registry.Register(ToolDef{
		Tool: Tool{
			Name:        "get_events",
			Description: "查看集群事件，用于排查调度失败、镜像拉取错误等问题。",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"namespace": map[string]interface{}{
						"type":        "string",
						"description": "命名空间，留空查看所有",
					},
					"fieldSelector": map[string]interface{}{
						"type":        "string",
						"description": "字段过滤，如 involvedObject.name=pod-name",
					},
				},
			},
		},
		Handler: handleGetEvents,
	})
}

func handleGetPodStatus(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Namespace string `json:"namespace"`
		PodName   string `json:"podName"`
	}
	json.Unmarshal(input, &params)

	clientset := common.ClientSet(clusterId)
	if clientset == nil {
		return "", fmt.Errorf("k8s client not available for cluster %s", clusterId)
	}

	pods, err := clientset.CoreV1().Pods(params.Namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return "", err
	}

	var results []map[string]interface{}
	for _, pod := range pods.Items {
		if params.PodName != "" && !strings.Contains(pod.Name, params.PodName) {
			continue
		}
		status := string(pod.Status.Phase)
		restarts := int32(0)
		for _, cs := range pod.Status.ContainerStatuses {
			restarts += cs.RestartCount
		}
		results = append(results, map[string]interface{}{
			"name":      pod.Name,
			"namespace": pod.Namespace,
			"status":    status,
			"restarts":  restarts,
			"node":      pod.Spec.NodeName,
			"ip":        pod.Status.PodIP,
		})
		if len(results) >= 30 {
			break
		}
	}

	data, _ := json.MarshalIndent(results, "", "  ")
	return string(data), nil
}

func handleGetPodLogs(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Namespace string `json:"namespace"`
		PodName   string `json:"podName"`
		TailLines int64  `json:"tailLines"`
	}
	json.Unmarshal(input, &params)
	if params.TailLines <= 0 {
		params.TailLines = 100
	}

	clientset := common.ClientSet(clusterId)
	if clientset == nil {
		return "", fmt.Errorf("k8s client not available")
	}

	opts := &corev1.PodLogOptions{TailLines: &params.TailLines}
	req := clientset.CoreV1().Pods(params.Namespace).GetLogs(params.PodName, opts)
	stream, err := req.Stream(context.Background())
	if err != nil {
		return "", err
	}
	defer stream.Close()

	buf := new(strings.Builder)
	io.Copy(buf, stream)
	if buf.Len() > 10000 {
		return buf.String()[:10000] + "\n...(truncated)", nil
	}
	return buf.String(), nil
}

func handleGetEvents(clusterId string, input json.RawMessage) (string, error) {
	var params struct {
		Namespace     string `json:"namespace"`
		FieldSelector string `json:"fieldSelector"`
	}
	json.Unmarshal(input, &params)

	clientset := common.ClientSet(clusterId)
	if clientset == nil {
		return "", fmt.Errorf("k8s client not available")
	}

	events, err := clientset.CoreV1().Events(params.Namespace).List(context.Background(), metav1.ListOptions{
		FieldSelector: params.FieldSelector,
	})
	if err != nil {
		return "", err
	}

	var results []map[string]interface{}
	for i, event := range events.Items {
		if i >= 50 {
			break
		}
		results = append(results, map[string]interface{}{
			"type":      event.Type,
			"reason":    event.Reason,
			"message":   event.Message,
			"object":    fmt.Sprintf("%s/%s", event.InvolvedObject.Kind, event.InvolvedObject.Name),
			"namespace": event.Namespace,
			"time":      event.LastTimestamp.Time.Format("2006-01-02 15:04:05"),
		})
	}

	data, _ := json.MarshalIndent(results, "", "  ")
	return string(data), nil
}
