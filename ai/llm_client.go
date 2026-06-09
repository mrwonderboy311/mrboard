package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type LLMConfig struct {
	ApiUrl      string
	ApiKey      string
	Model       string
	MaxTokens   int
	Temperature float64
}

type Message struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"`
}

type Tool struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	InputSchema interface{} `json:"input_schema"`
}

type ToolCall struct {
	Id    string          `json:"id"`
	Name  string          `json:"name"`
	Input json.RawMessage `json:"input"`
}

type LLMResponse struct {
	Content    []ContentBlock `json:"content"`
	StopReason string         `json:"stop_reason"`
	Usage      Usage          `json:"usage"`
}

type ContentBlock struct {
	Type  string          `json:"type"`
	Text  string          `json:"text,omitempty"`
	Id    string          `json:"id,omitempty"`
	Name  string          `json:"name,omitempty"`
	Input json.RawMessage `json:"input,omitempty"`
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type LLMClient struct {
	config     LLMConfig
	httpClient *http.Client
}

func NewLLMClient(config LLMConfig) *LLMClient {
	return &LLMClient{
		config:     config,
		httpClient: &http.Client{Timeout: 120 * time.Second},
	}
}

func (c *LLMClient) Call(messages []Message, tools []Tool) (*LLMResponse, error) {
	body := map[string]interface{}{
		"model":      c.config.Model,
		"max_tokens": c.config.MaxTokens,
		"messages":   messages,
		"stream":     false,
	}
	if c.config.Temperature > 0 {
		body["temperature"] = c.config.Temperature
	}
	if len(tools) > 0 {
		body["tools"] = tools
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", c.config.ApiUrl+"/v1/messages", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.config.ApiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http call: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}

	var llmResp LLMResponse
	if err := json.Unmarshal(respBody, &llmResp); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}
	return &llmResp, nil
}
