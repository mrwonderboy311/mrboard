package ai

import (
	"encoding/json"
	"log"
)

type ToolFunc func(clusterId string, input json.RawMessage) (string, error)

type ToolDef struct {
	Tool    Tool
	Handler ToolFunc
}

type ToolRegistry struct {
	tools map[string]*ToolDef
}

func NewToolRegistry() *ToolRegistry {
	return &ToolRegistry{tools: make(map[string]*ToolDef)}
}

func (r *ToolRegistry) Register(def ToolDef) {
	r.tools[def.Tool.Name] = &def
}

func (r *ToolRegistry) GetDefinitions() []Tool {
	var defs []Tool
	for _, t := range r.tools {
		defs = append(defs, t.Tool)
	}
	return defs
}

type ToolResult struct {
	ToolUseId string `json:"tool_use_id"`
	Content   string `json:"content"`
	IsError   bool   `json:"is_error,omitempty"`
}

func (r *ToolRegistry) Execute(clusterId string, calls []ToolCall) []ToolResult {
	var results []ToolResult
	for _, call := range calls {
		def, ok := r.tools[call.Name]
		if !ok {
			results = append(results, ToolResult{
				ToolUseId: call.Id,
				Content:   "unknown tool: " + call.Name,
				IsError:   true,
			})
			continue
		}
		result, err := def.Handler(clusterId, call.Input)
		if err != nil {
			log.Printf("[ERROR] tool %s: %v", call.Name, err)
			results = append(results, ToolResult{
				ToolUseId: call.Id,
				Content:   "error: " + err.Error(),
				IsError:   true,
			})
			continue
		}
		results = append(results, ToolResult{
			ToolUseId: call.Id,
			Content:   result,
		})
	}
	return results
}
