# Log Drilldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace LogViewer.tsx with a Grafana Logs Drilldown-style log exploration page featuring label facets, detected fields, pattern detection, and field breakdown.

**Architecture:** Backend adds 2 new API endpoints (DetectedFields, Patterns) and enhances Labels API. Frontend replaces LogViewer with LogDrilldown page composed of focused sub-components (FacetPanel, PatternList, FieldBreakdown, etc.).

**Tech Stack:** Go/Beego v2 (backend), React 18 + TypeScript + shadcn/ui + recharts (frontend)

---

## File Map

### Backend (Go)
| File | Action | Responsibility |
|------|--------|---------------|
| `models/loki_log_model.go` | Modify | Add `QueryDetectedFields()`, `QueryPatterns()`, enhance `QueryLabelsWithValues()` |
| `controllers/loki_log.go` | Modify | Add `DetectedFields()`, `Patterns()` controller methods |
| `routers/router.go` | Modify | Register 2 new routes |

### Frontend (TypeScript/React)
| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/types/log.ts` | Create | Shared log drilldown types |
| `frontend/src/hooks/useLogFilters.ts` | Create | Filter state management + URL sync |
| `frontend/src/pages/log/LogDrilldown/FacetGroup.tsx` | Create | Single facet group (expandable, clickable values) |
| `frontend/src/pages/log/LogDrilldown/FilterTagBar.tsx` | Create | Top filter tag bar |
| `frontend/src/pages/log/LogDrilldown/VolumeHistogram.tsx` | Create | Log volume histogram |
| `frontend/src/pages/log/LogDrilldown/PatternList.tsx` | Create | Pattern list display |
| `frontend/src/pages/log/LogDrilldown/LogEntryRow.tsx` | Create | Single log entry row |
| `frontend/src/pages/log/LogDrilldown/LogEntryList.tsx` | Create | Log entry list container |
| `frontend/src/pages/log/LogDrilldown/FieldBreakdown.tsx` | Create | Field aggregation chart |
| `frontend/src/pages/log/LogDrilldown/FacetPanel.tsx` | Create | Left sidebar facet panel |
| `frontend/src/pages/log/LogDrilldown.tsx` | Create | Main page (replaces LogViewer) |
| `frontend/src/App.tsx` | Modify | Update route from LogViewer to LogDrilldown |
| `frontend/src/layouts/MainLayout.tsx` | Modify | Update menu entry |

---

## Phase 1: Backend — DetectedFields API

### Task 1: Add `QueryDetectedFields` to model

**Files:**
- Modify: `models/loki_log_model.go`

**Steps:**

- [ ] **Step 1: Add DetectedField types and QueryDetectedFields function**

Add at the end of `models/loki_log_model.go`, before the closing of the file:

```go
// DetectedFieldValue 检测到的字段值 / Detected field value
type DetectedFieldValue struct {
	Value string `json:"value"`
	Count int    `json:"count"`
}

// DetectedField 检测到的字段 / Detected field
type DetectedField struct {
	Name   string              `json:"name"`
	Type   string              `json:"type"`
	Values []DetectedFieldValue `json:"values"`
}

// DetectedFieldsResult 字段检测结果 / Detected fields result
type DetectedFieldsResult struct {
	Fields []DetectedField `json:"fields"`
}

// QueryDetectedFields 检测日志中的结构化字段 / Detect structured fields from logs
func QueryDetectedFields(clusterId, namespace, servicesStr string, start, end string) (*DetectedFieldsResult, error) {
	lokiUrl, err := GetLokiUrl(clusterId)
	if err != nil {
		return nil, err
	}

	cfg := GetLokiConfig(clusterId)
	var services []string
	if servicesStr != "" {
		for _, s := range strings.Split(servicesStr, ",") {
			s = strings.TrimSpace(s)
			if s != "" {
				services = append(services, s)
			}
		}
	}

	// Build query with json/logfmt pipeline
	query := buildLogQLWithConfig(namespace, services, nil, "", "", cfg)

	// Try | json first, then fall back to | logfmt
	pipeline := "| json"
	reqUrl := fmt.Sprintf("%s/loki/api/v1/query_range?query=%s&start=%s&end=%s&limit=200&direction=backward",
		lokiUrl, url.QueryEscape(query+" "+pipeline), start, end)

	body, err := lokiHttpGet(reqUrl)
	if err != nil {
		// Fall back to logfmt
		pipeline = "| logfmt"
		reqUrl = fmt.Sprintf("%s/loki/api/v1/query_range?query=%s&start=%s&end=%s&limit=200&direction=backward",
			lokiUrl, url.QueryEscape(query+" "+pipeline), start, end)
		body, err = lokiHttpGet(reqUrl)
		if err != nil {
			return nil, err
		}
	}

	var resp lokiResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse detected fields response error: %v", err)
	}
	if resp.Status != "success" {
		return nil, fmt.Errorf("loki detected fields query failed: %s", resp.Status)
	}

	var streams []lokiStreamResult
	if err := json.Unmarshal(resp.Data.Result, &streams); err != nil {
		return nil, fmt.Errorf("parse streams error: %v", err)
	}

	// Parse fields from log lines
	fieldCounts := make(map[string]map[string]int) // field -> value -> count
	for _, stream := range streams {
		for _, val := range stream.Values {
			if len(val) < 2 {
				continue
			}
			msg := fmt.Sprintf("%v", val[1])
			fields := parseLogFields(msg)
			for k, v := range fields {
				if fieldCounts[k] == nil {
					fieldCounts[k] = make(map[string]int)
				}
				fieldCounts[k][v]++
			}
		}
	}

	// Build result with top 10 values per field
	result := &DetectedFieldsResult{}
	for name, values := range fieldCounts {
		field := DetectedField{
			Name: name,
			Type: "string",
		}
		for v, c := range values {
			field.Values = append(field.Values, DetectedFieldValue{Value: v, Count: c})
		}
		// Sort by count descending, take top 10
		sortFieldValues(field.Values)
		if len(field.Values) > 10 {
			field.Values = field.Values[:10]
		}
		result.Fields = append(result.Fields, field)
	}

	return result, nil
}

// parseLogFields 从日志行解析字段 / Parse fields from log line
func parseLogFields(line string) map[string]string {
	fields := make(map[string]string)

	// Try JSON
	if strings.HasPrefix(strings.TrimSpace(line), "{") {
		var jsonFields map[string]interface{}
		if json.Unmarshal([]byte(line), &jsonFields) == nil {
			for k, v := range jsonFields {
				// Skip nested objects, only keep scalar values
				switch v.(type) {
				case string, float64, bool, int:
					fields[k] = fmt.Sprintf("%v", v)
				}
			}
			return fields
		}
	}

	// Try logfmt: key=value pairs
	parts := strings.Fields(line)
	for _, part := range parts {
		if idx := strings.Index(part, "="); idx > 0 {
			key := part[:idx]
			val := strings.Trim(part[idx+1:], `"'`)
			if key != "" && val != "" {
				fields[key] = val
			}
		}
	}

	return fields
}

// sortFieldValues 按计数降序排序 / Sort field values by count descending
func sortFieldValues(values []DetectedFieldValue) {
	for i := 1; i < len(values); i++ {
		for j := i; j > 0 && values[j].Count > values[j-1].Count; j-- {
			values[j], values[j-1] = values[j-1], values[j]
		}
	}
}
```

- [ ] **Step 2: Verify build**

Run: `cd /root/mrboard && go build ./... 2>&1 | tail -20`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add models/loki_log_model.go
git commit -m "feat(log): add QueryDetectedFields model function

Parses JSON and logfmt fields from Loki log samples.
Returns top 10 values per field sorted by count."
```

---

### Task 2: Add `QueryPatterns` to model

**Files:**
- Modify: `models/loki_log_model.go`

**Steps:**

- [ ] **Step 1: Add Pattern types and QueryPatterns function**

Append to `models/loki_log_model.go`:

```go
// LogPattern 日志模式 / Log pattern
type LogPattern struct {
	Pattern    string  `json:"pattern"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
	Sample     string  `json:"sample"`
}

// PatternsResult 模式检测结果 / Patterns result
type PatternsResult struct {
	Patterns []LogPattern `json:"patterns"`
}

// QueryPatterns 检测日志模式 / Detect log patterns
func QueryPatterns(clusterId, namespace, servicesStr, levelsStr string, start, end string) (*PatternsResult, error) {
	lokiUrl, err := GetLokiUrl(clusterId)
	if err != nil {
		return nil, err
	}

	cfg := GetLokiConfig(clusterId)
	var services []string
	if servicesStr != "" {
		for _, s := range strings.Split(servicesStr, ",") {
			s = strings.TrimSpace(s)
			if s != "" {
				services = append(services, s)
			}
		}
	}
	var levels []string
	if levelsStr != "" {
		for _, l := range strings.Split(levelsStr, ",") {
			l = strings.TrimSpace(l)
			if l != "" {
				levels = append(levels, l)
			}
		}
	}

	// Try Loki pattern API first (Loki 2.9+)
	query := buildLogQLWithConfig(namespace, services, levels, "", "", cfg)
	reqUrl := fmt.Sprintf("%s/loki/api/v1/patterns?query=%s&start=%s&end=%s",
		lokiUrl, url.QueryEscape(query), start, end)

	body, err := lokiHttpGet(reqUrl)
	if err == nil {
		var result PatternsResult
		if json.Unmarshal(body, &result) == nil && len(result.Patterns) > 0 {
			// Calculate percentages
			total := 0
			for _, p := range result.Patterns {
				total += p.Count
			}
			if total > 0 {
				for i := range result.Patterns {
					result.Patterns[i].Percentage = float64(result.Patterns[i].Count) / float64(total) * 100
				}
			}
			return &result, nil
		}
	}

	// Fall back to Go-based pattern extraction
	return fallbackPatternDetection(clusterId, namespace, services, levels, start, end, cfg)
}

// fallbackPatternDetection 降级模式检测 / Fallback pattern detection
func fallbackPatternDetection(clusterId, namespace string, services, levels []string, start, end string, cfg *LokiConfig) (*PatternsResult, error) {
	// Fetch sample logs
	entries, _, err := QueryLogs(clusterId, namespace, services, levels, "", "", start, end, 5000, "backward")
	if err != nil {
		return nil, err
	}

	// Extract patterns by replacing variable parts with placeholders
	patternCounts := make(map[string]*LogPattern)
	for _, entry := range entries {
		pattern := extractPattern(entry.Message)
		if p, ok := patternCounts[pattern]; ok {
			p.Count++
		} else {
			patternCounts[pattern] = &LogPattern{
				Pattern: pattern,
				Count:   1,
				Sample:  entry.Message,
			}
		}
	}

	// Convert to slice and sort by count
	var patterns []LogPattern
	total := 0
	for _, p := range patternCounts {
		patterns = append(patterns, *p)
		total += p.Count
	}

	// Sort by count descending
	for i := 1; i < len(patterns); i++ {
		for j := i; j > 0 && patterns[j].Count > patterns[j-1].Count; j-- {
			patterns[j], patterns[j-1] = patterns[j-1], patterns[j]
		}
	}

	// Take top 20 and calculate percentages
	if len(patterns) > 20 {
		patterns = patterns[:20]
	}
	if total > 0 {
		for i := range patterns {
			patterns[i].Percentage = float64(patterns[i].Count) / float64(total) * 100
		}
	}

	return &PatternsResult{Patterns: patterns}, nil
}

// extractPattern 从日志行提取模板 / Extract pattern from log line
func extractPattern(line string) string {
	// Replace UUIDs
	uuidRe := regexp.MustCompile(`[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}`)
	line = uuidRe.ReplaceAllString(line, "{uuid}")

	// Replace IP addresses
	ipRe := regexp.MustCompile(`\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b`)
	line = ipRe.ReplaceAllString(line, "{ip}")

	// Replace hex strings (8+ chars)
	hexRe := regexp.MustCompile(`\b[0-9a-f]{8,}\b`)
	line = hexRe.ReplaceAllString(line, "{hex}")

	// Replace numbers (but not single digits that might be meaningful)
	numRe := regexp.MustCompile(`\b\d{2,}\b`)
	line = numRe.ReplaceAllString(line, "{n}")

	// Replace quoted strings
	quotedRe := regexp.MustCompile(`"[^"]{3,}"`)
	line = quotedRe.ReplaceAllString(line, `"{s}"`)

	return line
}
```

- [ ] **Step 2: Verify build**

Run: `cd /root/mrboard && go build ./... 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add models/loki_log_model.go
git commit -m "feat(log): add QueryPatterns model function

Tries Loki native pattern API first, falls back to Go-based
template extraction (UUID/IP/hex/number replacement)."
```

---

### Task 3: Add controller methods for DetectedFields and Patterns

**Files:**
- Modify: `controllers/loki_log.go`

**Steps:**

- [ ] **Step 1: Add DetectedFields controller method**

Add before the `LokiLogTailHandler` struct in `controllers/loki_log.go`:

```go
// 检测日志字段 / Detect log fields
func (this *LokiLogController) DetectedFields() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	services := this.GetString("services")
	start := this.GetString("start")
	end := this.GetString("end")

	result, err := m.QueryDetectedFields(clusterId, namespace, services, start, end)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": result}
	this.ServeJSON()
}

// 查询日志模式 / Query log patterns
func (this *LokiLogController) Patterns() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	services := this.GetString("services")
	levels := this.GetString("levels")
	start := this.GetString("start")
	end := this.GetString("end")

	result, err := m.QueryPatterns(clusterId, namespace, services, levels, start, end)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": result}
	this.ServeJSON()
}
```

- [ ] **Step 2: Verify build**

Run: `cd /root/mrboard && go build ./... 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add controllers/loki_log.go
git commit -m "feat(log): add DetectedFields and Patterns controller methods"
```

---

### Task 4: Register new routes

**Files:**
- Modify: `routers/router.go`

**Steps:**

- [ ] **Step 1: Add route registrations**

In `routers/router.go`, after line 435 (the Levels route), add:

```go
	beego.Router("/mrboard/log/v1/DetectedFields", &controllers.LokiLogController{}, "*:DetectedFields") //检测日志字段 | Detect log fields
	beego.Router("/mrboard/log/v1/Patterns", &controllers.LokiLogController{}, "*:Patterns")               //日志模式检测 | Log pattern detection
```

- [ ] **Step 2: Verify build**

Run: `cd /root/mrboard && go build ./... 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add routers/router.go
git commit -m "feat(log): register DetectedFields and Patterns routes"
```

---

### Task 5: Enhance Labels API with values and counts

**Files:**
- Modify: `models/loki_log_model.go`

**Steps:**

- [ ] **Step 1: Add QueryLabelsWithValues function**

Append to `models/loki_log_model.go`:

```go
// LabelWithValues 带值列表的标签 / Label with value list
type LabelWithValues struct {
	Name   string              `json:"name"`
	Values []DetectedFieldValue `json:"values"`
}

// QueryLabelsWithValues 查询标签列表及其top值 / Query labels with top values
func QueryLabelsWithValues(clusterId, namespace, start, end string) ([]LabelWithValues, error) {
	// First get label names
	labelNames, err := QueryLabels(clusterId, namespace, start, end)
	if err != nil {
		return nil, err
	}

	var result []LabelWithValues
	for _, name := range labelNames {
		// Skip internal labels
		if name == "__name__" || name == "filename" {
			continue
		}
		values, err := QueryLabelValues(clusterId, namespace, name, start, end)
		if err != nil {
			continue
		}
		lv := LabelWithValues{
			Name: name,
		}
		// Take top 10 values (Loki doesn't return counts, so we set count=1)
		limit := len(values)
		if limit > 10 {
			limit = 10
		}
		for i := 0; i < limit; i++ {
			lv.Values = append(lv.Values, DetectedFieldValue{Value: values[i], Count: 1})
		}
		result = append(result, lv)
	}

	return result, nil
}
```

- [ ] **Step 2: Add LabelsV2 controller method**

Add to `controllers/loki_log.go` after the `Labels()` method:

```go
// 查询标签列表（带值） / Query labels with values
func (this *LokiLogController) LabelsV2() {
	clusterId := this.GetString("clusterId")
	namespace := this.GetString("namespace")
	start := this.GetString("start")
	end := this.GetString("end")

	labels, err := m.QueryLabelsWithValues(clusterId, namespace, start, end)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": labels}
	this.ServeJSON()
}
```

- [ ] **Step 3: Register LabelsV2 route**

In `routers/router.go`, after the existing Labels route (line 431), add:

```go
	beego.Router("/mrboard/log/v1/LabelsV2", &controllers.LokiLogController{}, "*:LabelsV2") //标签列表（带值） | Labels with values
```

- [ ] **Step 4: Verify build**

Run: `cd /root/mrboard && go build ./... 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add models/loki_log_model.go controllers/loki_log.go routers/router.go
git commit -m "feat(log): add LabelsV2 API returning labels with top values"
```

---

## Phase 2: Frontend — Types and Hooks

### Task 6: Create shared log drilldown types

**Files:**
- Create: `frontend/src/types/log.ts`

**Steps:**

- [ ] **Step 1: Create types file**

```typescript
// Log drilldown shared types

export interface DetectedFieldValue {
  value: string
  count: number
}

export interface DetectedField {
  name: string
  type: string
  values: DetectedFieldValue[]
}

export interface LogPattern {
  pattern: string
  count: number
  percentage: number
  sample: string
}

export interface LabelWithValues {
  name: string
  values: DetectedFieldValue[]
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  namespace: string
  pod: string
  container: string
  app: string
  service_name: string
  labels: Record<string, string>
}

export interface HistogramBucket {
  time: number
  total: number
  error: number
  warn: number
  info: number
  debug: number
}

export interface LevelCount {
  level: string
  count: number
}

export interface FilterState {
  labels: Record<string, string[]>
  excludeLabels: Record<string, string[]>
  fields: Record<string, string[]>
  excludeFields: Record<string, string[]>
  levels: string[]
  search: string
  logql: string
}

export function emptyFilterState(): FilterState {
  return {
    labels: {},
    excludeLabels: {},
    fields: {},
    excludeFields: {},
    levels: ['error', 'warn', 'info', 'debug'],
    search: '',
    logql: '',
  }
}

export function filterStateToQueryString(fs: FilterState): string {
  const params = new URLSearchParams()
  for (const [k, vs] of Object.entries(fs.labels)) {
    for (const v of vs) params.append(`label_${k}`, v)
  }
  for (const [k, vs] of Object.entries(fs.excludeLabels)) {
    for (const v of vs) params.append(`xLabel_${k}`, v)
  }
  for (const [k, vs] of Object.entries(fs.fields)) {
    for (const v of vs) params.append(`field_${k}`, v)
  }
  for (const [k, vs] of Object.entries(fs.excludeFields)) {
    for (const v of vs) params.append(`xField_${k}`, v)
  }
  if (fs.levels.length > 0) params.set('levels', fs.levels.join(','))
  if (fs.search) params.set('search', fs.search)
  if (fs.logql) params.set('logql', fs.logql)
  return params.toString()
}

export function parseFilterStateFromURL(): FilterState {
  const params = new URLSearchParams(window.location.search)
  const fs = emptyFilterState()

  for (const [key, val] of params.entries()) {
    if (key.startsWith('label_')) {
      const name = key.slice(6)
      fs.labels[name] = fs.labels[name] || []
      fs.labels[name].push(val)
    } else if (key.startsWith('xLabel_')) {
      const name = key.slice(7)
      fs.excludeLabels[name] = fs.excludeLabels[name] || []
      fs.excludeLabels[name].push(val)
    } else if (key.startsWith('field_')) {
      const name = key.slice(6)
      fs.fields[name] = fs.fields[name] || []
      fs.fields[name].push(val)
    } else if (key.startsWith('xField_')) {
      const name = key.slice(7)
      fs.excludeFields[name] = fs.excludeFields[name] || []
      fs.excludeFields[name].push(val)
    } else if (key === 'levels') {
      fs.levels = val.split(',').filter(Boolean)
    } else if (key === 'search') {
      fs.search = val
    } else if (key === 'logql') {
      fs.logql = val
    }
  }
  return fs
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors in this file (existing errors OK).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/log.ts
git commit -m "feat(log): add shared log drilldown types and filter state utils"
```

---

### Task 7: Create useLogFilters hook

**Files:**
- Create: `frontend/src/hooks/useLogFilters.ts`

**Steps:**

- [ ] **Step 1: Create hook**

```typescript
import { useState, useCallback, useEffect } from 'react'
import { FilterState, emptyFilterState, parseFilterStateFromURL, filterStateToQueryString } from '@/types/log'

export function useLogFilters() {
  const [filters, setFilters] = useState<FilterState>(() => parseFilterStateFromURL())

  // Sync to URL on change
  useEffect(() => {
    const qs = filterStateToQueryString(filters)
    const url = new URL(window.location.href)
    url.search = qs ? '?' + qs : ''
    window.history.replaceState({}, '', url.toString())
  }, [filters])

  const toggleLabelValue = useCallback((name: string, value: string, exclude: boolean = false) => {
    setFilters(prev => {
      const target = exclude ? 'excludeLabels' : 'labels'
      const current = prev[target][name] || []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return {
        ...prev,
        [target]: {
          ...prev[target],
          [name]: next.length > 0 ? next : undefined,
        },
      }
    })
  }, [])

  const toggleFieldValue = useCallback((name: string, value: string, exclude: boolean = false) => {
    setFilters(prev => {
      const target = exclude ? 'excludeFields' : 'fields'
      const current = prev[target][name] || []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return {
        ...prev,
        [target]: {
          ...prev[target],
          [name]: next.length > 0 ? next : undefined,
        },
      }
    })
  }, [])

  const toggleLevel = useCallback((level: string) => {
    setFilters(prev => {
      const next = prev.levels.includes(level)
        ? prev.levels.filter(l => l !== level)
        : [...prev.levels, level]
      return { ...prev, levels: next }
    })
  }, [])

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }))
  }, [])

  const setLogql = useCallback((logql: string) => {
    setFilters(prev => ({ ...prev, logql }))
  }, [])

  const removeFilter = useCallback((type: 'label' | 'xLabel' | 'field' | 'xField', name: string, value?: string) => {
    setFilters(prev => {
      const key = type === 'label' ? 'labels' : type === 'xLabel' ? 'excludeLabels' : type === 'field' ? 'fields' : 'excludeFields'
      const current = prev[key][name]
      if (!current) return prev
      if (value) {
        const next = current.filter(v => v !== value)
        return {
          ...prev,
          [key]: { ...prev[key], [name]: next.length > 0 ? next : undefined },
        }
      }
      const { [name]: _, ...rest } = prev[key]
      return { ...prev, [key]: rest }
    })
  }, [])

  const clearAll = useCallback(() => {
    setFilters(emptyFilterState())
  }, [])

  const hasActiveFilters = Object.keys(filters.labels).length > 0
    || Object.keys(filters.excludeLabels).length > 0
    || Object.keys(filters.fields).length > 0
    || Object.keys(filters.excludeFields).length > 0
    || filters.search !== ''

  return {
    filters,
    toggleLabelValue,
    toggleFieldValue,
    toggleLevel,
    setSearch,
    setLogql,
    removeFilter,
    clearAll,
    hasActiveFilters,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useLogFilters.ts
git commit -m "feat(log): add useLogFilters hook with URL sync"
```

---

## Phase 3: Frontend — Sub-Components

### Task 8: Create FacetGroup component

**Files:**
- Create: `frontend/src/pages/log/LogDrilldown/FacetGroup.tsx`

**Steps:**

- [ ] **Step 1: Create component**

```tsx
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DetectedFieldValue } from '@/types/log'

interface FacetGroupProps {
  title: string
  values: DetectedFieldValue[]
  selected: string[]
  excludeSelected?: string[]
  onToggle: (value: string, exclude: boolean) => void
  defaultExpanded?: boolean
}

export function FacetGroup({ title, values, selected, excludeSelected = [], onToggle, defaultExpanded = true }: FacetGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showAll, setShowAll] = useState(false)
  const displayValues = showAll ? values : values.slice(0, 10)

  return (
    <div className="border-b border-border/50">
      <button
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
        <span className="ml-auto text-muted-foreground/60 normal-case tracking-normal">{values.length}</span>
      </button>
      {expanded && (
        <div className="pb-1">
          {displayValues.map(v => {
            const isSelected = selected.includes(v.value)
            const isExcluded = excludeSelected.includes(v.value)
            return (
              <button
                key={v.value}
                onClick={(e) => onToggle(v.value, e.shiftKey)}
                className={`flex items-center gap-2 w-full px-3 py-1 text-xs transition-colors ${
                  isExcluded
                    ? 'bg-destructive/10 text-destructive line-through'
                    : isSelected
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-foreground hover:bg-muted/50'
                }`}
              >
                <span className={`w-3 h-3 rounded border shrink-0 flex items-center justify-center ${
                  isExcluded
                    ? 'bg-destructive border-destructive'
                    : isSelected
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground/30'
                }`}>
                  {isSelected && <span className="text-[8px] text-primary-foreground">✓</span>}
                  {isExcluded && <span className="text-[8px] text-destructive-foreground">✕</span>}
                </span>
                <span className="truncate flex-1 text-left">{v.value}</span>
                {v.count > 1 && (
                  <span className="text-muted-foreground/60 text-[10px]">{v.count > 999 ? `${(v.count/1000).toFixed(1)}k` : v.count}</span>
                )}
              </button>
            )
          })}
          {values.length > 10 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              Show more ({values.length - 10} more)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/log/LogDrilldown/FacetGroup.tsx
git commit -m "feat(log): add FacetGroup component"
```

---

### Task 9: Create FilterTagBar component

**Files:**
- Create: `frontend/src/pages/log/LogDrilldown/FilterTagBar.tsx`

**Steps:**

- [ ] **Step 1: Create component**

```tsx
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { FilterState } from '@/types/log'

interface FilterTagBarProps {
  filters: FilterState
  onRemove: (type: 'label' | 'xLabel' | 'field' | 'xField', name: string, value?: string) => void
  onClearAll: () => void
}

export function FilterTagBar({ filters, onRemove, onClearAll }: FilterTagBarProps) {
  const tags: Array<{ type: 'label' | 'xLabel' | 'field' | 'xField'; name: string; value: string; exclude: boolean }> = []

  for (const [name, values] of Object.entries(filters.labels)) {
    for (const value of values) tags.push({ type: 'label', name, value, exclude: false })
  }
  for (const [name, values] of Object.entries(filters.excludeLabels)) {
    for (const value of values) tags.push({ type: 'xLabel', name, value, exclude: true })
  }
  for (const [name, values] of Object.entries(filters.fields)) {
    for (const value of values) tags.push({ type: 'field', name, value, exclude: false })
  }
  for (const [name, values] of Object.entries(filters.excludeFields)) {
    for (const value of values) tags.push({ type: 'xField', name, value, exclude: true })
  }
  if (filters.search) {
    tags.push({ type: 'field', name: 'search', value: filters.search, exclude: false })
  }

  if (tags.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {tags.map((tag, i) => (
        <Badge
          key={`${tag.type}-${tag.name}-${tag.value}-${i}`}
          variant={tag.exclude ? 'destructive' : 'secondary'}
          className="text-[11px] px-1.5 py-0 gap-1"
        >
          <span className="text-muted-foreground">{tag.name}:</span>
          <span className={tag.exclude ? 'line-through' : ''}>{tag.value}</span>
          <X
            size={10}
            className="cursor-pointer hover:text-foreground"
            onClick={() => {
              if (tag.name === 'search') {
                onRemove('field', 'search')
              } else {
                onRemove(tag.type, tag.name, tag.value)
              }
            }}
          />
        </Badge>
      ))}
      {tags.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-[11px] text-muted-foreground hover:text-foreground ml-1"
        >
          清除全部
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/log/LogDrilldown/FilterTagBar.tsx
git commit -m "feat(log): add FilterTagBar component"
```

---

### Task 10: Create VolumeHistogram component

**Files:**
- Create: `frontend/src/pages/log/LogDrilldown/VolumeHistogram.tsx`

**Steps:**

- [ ] **Step 1: Create component**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { HistogramBucket } from '@/types/log'

const LEVEL_COLORS: Record<string, string> = {
  error: 'hsl(var(--destructive))',
  warn: 'hsl(var(--chart-3))',
  info: 'hsl(var(--chart-2))',
  debug: 'hsl(var(--chart-1))',
}

interface VolumeHistogramProps {
  data: HistogramBucket[]
  onClickBucket?: (time: number) => void
}

export function VolumeHistogram({ data, onClickBucket }: VolumeHistogramProps) {
  if (!data || data.length === 0) return null

  return (
    <div className="h-[100px] px-4 py-1 border-b">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barGap={0}
          barCategoryGap="5%"
          onClick={(e: any) => {
            const bucket = e?.activePayload?.[0]?.payload
            if (bucket?.time && onClickBucket) {
              onClickBucket(bucket.time)
            }
          }}
        >
          <XAxis
            dataKey="time"
            tickFormatter={(t) => {
              const d = new Date(t / 1_000_000)
              return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
            }}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={35} />
          <Tooltip
            labelFormatter={(t) => {
              const d = new Date(Number(t) / 1_000_000)
              return d.toLocaleString('zh-CN', { hour12: false })
            }}
            formatter={(value: unknown, name: unknown) => [String(value), String(name)]}
            contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
          />
          <Bar dataKey="error" stackId="a" fill={LEVEL_COLORS.error} cursor="pointer" />
          <Bar dataKey="warn" stackId="a" fill={LEVEL_COLORS.warn} cursor="pointer" />
          <Bar dataKey="info" stackId="a" fill={LEVEL_COLORS.info} cursor="pointer" />
          <Bar dataKey="debug" stackId="a" fill={LEVEL_COLORS.debug} cursor="pointer" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/log/LogDrilldown/VolumeHistogram.tsx
git commit -m "feat(log): add VolumeHistogram component using theme tokens"
```

---

### Task 11: Create PatternList component

**Files:**
- Create: `frontend/src/pages/log/LogDrilldown/PatternList.tsx`

**Steps:**

- [ ] **Step 1: Create component**

```tsx
import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { LogPattern } from '@/types/log'

interface PatternListProps {
  patterns: LogPattern[]
  onPatternClick?: (pattern: string) => void
}

export function PatternList({ patterns, onPatternClick }: PatternListProps) {
  const [expanded, setExpanded] = useState(true)

  if (!patterns || patterns.length === 0) return null

  return (
    <div className="border-b">
      <button
        className="flex items-center gap-1.5 w-full px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Patterns
        <span className="ml-auto text-muted-foreground/60 normal-case tracking-normal">{patterns.length}</span>
      </button>
      {expanded && (
        <div className="max-h-[200px] overflow-y-auto">
          {patterns.map((p, i) => (
            <PatternRow key={i} pattern={p} onClick={() => onPatternClick?.(p.pattern)} />
          ))}
        </div>
      )}
    </div>
  )
}

function PatternRow({ pattern, onClick }: { pattern: LogPattern; onClick: () => void }) {
  const [copied, setCopied] = useState(false)

  return (
    <div
      className="flex items-start gap-3 px-4 py-1.5 text-xs hover:bg-muted/30 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-foreground/80 truncate">{pattern.pattern}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {pattern.count.toLocaleString()} 次 · {pattern.percentage.toFixed(1)}%
        </div>
      </div>
      <div className="w-[60px] shrink-0">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(pattern.percentage, 100)}%` }}
          />
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          navigator.clipboard.writeText(pattern.sample)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} className="text-muted-foreground" />}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/log/LogDrilldown/PatternList.tsx
git commit -m "feat(log): add PatternList component"
```

---

### Task 12: Create LogEntryRow and LogEntryList components

**Files:**
- Create: `frontend/src/pages/log/LogDrilldown/LogEntryRow.tsx`
- Create: `frontend/src/pages/log/LogDrilldown/LogEntryList.tsx`

**Steps:**

- [ ] **Step 1: Create LogEntryRow**

```tsx
import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { LogEntry } from '@/types/log'

const LEVEL_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  error:   { color: 'text-destructive', bg: 'bg-destructive/10', label: 'ERROR' },
  warn:    { color: 'text-chart-3', bg: 'bg-chart-3/10', label: 'WARN' },
  warning: { color: 'text-chart-3', bg: 'bg-chart-3/10', label: 'WARN' },
  info:    { color: 'text-chart-2', bg: 'bg-chart-2/10', label: 'INFO' },
  debug:   { color: 'text-muted-foreground', bg: 'bg-muted/50', label: 'DEBUG' },
}

function getLevelStyle(level: string) {
  return LEVEL_STYLES[level?.toLowerCase()] || LEVEL_STYLES.info
}

function formatTimestamp(ts: string) {
  if (!ts) return '-'
  const d = new Date(Number(ts) / 1_000_000)
  return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

interface LogEntryRowProps {
  entry: LogEntry
  expanded: boolean
  onToggle: () => void
}

export function LogEntryRow({ entry, expanded, onToggle }: LogEntryRowProps) {
  const [copied, setCopied] = useState(false)
  const lvl = (entry.level || 'info').toLowerCase()
  const style = getLevelStyle(lvl)
  const hasLabels = entry.labels && Object.keys(entry.labels).length > 0

  return (
    <div className={`group border-b border-border/40 hover:bg-muted/30 transition-colors ${style.bg}`}>
      <div
        className="flex items-start gap-0 cursor-pointer px-3 py-[2px]"
        onClick={onToggle}
      >
        <span className="w-4 shrink-0 pt-0.5 text-muted-foreground/40">
          {hasLabels ? (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />) : null}
        </span>
        <span className="text-muted-foreground whitespace-nowrap shrink-0 w-[95px] text-[11px]">
          {formatTimestamp(entry.timestamp)}
        </span>
        <span className={`shrink-0 w-[42px] text-center text-[10px] font-bold uppercase ${style.color}`}>
          {style.label}
        </span>
        {(entry.service_name || entry.pod) && (
          <span className="shrink-0 text-[11px] text-primary/70 max-w-[140px] truncate mr-2" title={entry.pod || entry.service_name}>
            {entry.service_name || entry.pod}
          </span>
        )}
        <span className={`flex-1 min-w-0 break-all text-foreground/80 ${expanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
          {entry.message}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(entry.message); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} className="text-muted-foreground" />}
        </button>
      </div>

      {expanded && hasLabels && (
        <div className="pl-10 pr-3 pb-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
            {Object.entries(entry.labels).map(([k, v]) => (
              <span key={k}>
                <span className="text-muted-foreground">{k}</span>=<span className="text-foreground">{String(v)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create LogEntryList**

```tsx
import { useState } from 'react'
import { LogEntry } from '@/types/log'
import { LogEntryRow } from './LogEntryRow'

interface LogEntryListProps {
  logs: LogEntry[]
  loading: boolean
  total: number
}

export function LogEntryList({ logs, loading, total }: LogEntryListProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <span className="animate-spin mr-2">⏳</span>加载中...
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
        <span>暂无日志</span>
        <span className="text-xs">尝试调整时间范围或过滤条件</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto font-mono text-[12px] leading-[1.6]">
      <div className="shrink-0 flex items-center gap-3 px-4 py-1 border-b text-[11px] text-muted-foreground bg-muted/30">
        <span>{total.toLocaleString()} 条日志{logs.length > 500 ? ` (显示前 500 条)` : ''}</span>
      </div>
      {logs.slice(0, 500).map((log, idx) => (
        <LogEntryRow
          key={idx}
          entry={log}
          expanded={expandedRows.has(idx)}
          onToggle={() => toggleRow(idx)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/log/LogDrilldown/LogEntryRow.tsx frontend/src/pages/log/LogDrilldown/LogEntryList.tsx
git commit -m "feat(log): add LogEntryRow and LogEntryList components"
```

---

### Task 13: Create FieldBreakdown component

**Files:**
- Create: `frontend/src/pages/log/LogDrilldown/FieldBreakdown.tsx`

**Steps:**

- [ ] **Step 1: Create component**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { DetectedFieldValue } from '@/types/log'

interface FieldBreakdownProps {
  fieldName: string
  values: DetectedFieldValue[]
}

export function FieldBreakdown({ fieldName, values }: FieldBreakdownProps) {
  if (!values || values.length === 0) return null

  const data = values.slice(0, 10).map(v => ({
    name: v.value.length > 30 ? v.value.slice(0, 30) + '…' : v.value,
    fullName: v.value,
    count: v.count,
  }))

  return (
    <div className="border-t">
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Field Breakdown: {fieldName}
      </div>
      <div className="h-[180px] px-4 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
              contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            />
            <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/log/LogDrilldown/FieldBreakdown.tsx
git commit -m "feat(log): add FieldBreakdown component"
```

---

### Task 14: Create FacetPanel component

**Files:**
- Create: `frontend/src/pages/log/LogDrilldown/FacetPanel.tsx`

**Steps:**

- [ ] **Step 1: Create component**

```tsx
import { Filter, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { FacetGroup } from './FacetGroup'
import { LabelWithValues, DetectedField, DetectedFieldValue } from '@/types/log'

interface FacetPanelProps {
  labels: LabelWithValues[]
  fields: DetectedField[]
  levels: Record<string, number>
  selectedLabels: Record<string, string[]>
  excludeLabels: Record<string, string[]>
  selectedFields: Record<string, string[]>
  excludeFields: Record<string, string[]>
  selectedLevels: string[]
  onToggleLabel: (name: string, value: string, exclude: boolean) => void
  onToggleField: (name: string, value: string, exclude: boolean) => void
  onToggleLevel: (level: string) => void
}

export function FacetPanel({
  labels, fields, levels,
  selectedLabels, excludeLabels, selectedFields, excludeFields, selectedLevels,
  onToggleLabel, onToggleField, onToggleLevel,
}: FacetPanelProps) {
  const [search, setSearch] = useState('')

  const levelValues: DetectedFieldValue[] = Object.entries(levels)
    .map(([level, count]) => ({ value: level, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="w-[240px] shrink-0 border-r bg-card flex flex-col overflow-hidden">
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter size={14} className="text-muted-foreground" />
          筛选
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Levels */}
        <FacetGroup
          title="Levels"
          values={levelValues}
          selected={selectedLevels}
          onToggle={(v) => onToggleLevel(v)}
        />

        {/* Labels */}
        {labels.map(label => {
          if (search && !label.name.includes(search)) return null
          return (
            <FacetGroup
              key={label.name}
              title={label.name}
              values={label.values}
              selected={selectedLabels[label.name] || []}
              excludeSelected={excludeLabels[label.name] || []}
              onToggle={(v, exclude) => onToggleLabel(label.name, v, exclude)}
            />
          )
        })}

        {/* Detected Fields */}
        {fields.length > 0 && (
          <>
            <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b">
              Detected Fields
            </div>
            {fields.map(field => (
              <FacetGroup
                key={field.name}
                title={field.name}
                values={field.values}
                selected={selectedFields[field.name] || []}
                excludeSelected={excludeFields[field.name] || []}
                onToggle={(v, exclude) => onToggleField(field.name, v, exclude)}
                defaultExpanded={false}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/log/LogDrilldown/FacetPanel.tsx
git commit -m "feat(log): add FacetPanel component"
```

---

## Phase 4: Frontend — Main Page

### Task 15: Create LogDrilldown main page

**Files:**
- Create: `frontend/src/pages/log/LogDrilldown.tsx`

**Steps:**

- [ ] **Step 1: Create main page component**

```tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Clock, RefreshCw, Pause, Play, Search, X } from 'lucide-react'
import { toast } from 'sonner'

import { useLogFilters } from '@/hooks/useLogFilters'
import {
  LabelWithValues, DetectedField, LogPattern, LogEntry, HistogramBucket, LevelCount,
} from '@/types/log'
import { FacetPanel } from './LogDrilldown/FacetPanel'
import { FilterTagBar } from './LogDrilldown/FilterTagBar'
import { VolumeHistogram } from './LogDrilldown/VolumeHistogram'
import { PatternList } from './LogDrilldown/PatternList'
import { LogEntryList } from './LogDrilldown/LogEntryList'
import { FieldBreakdown } from './LogDrilldown/FieldBreakdown'

const TIME_RANGES = [
  { label: '最近 5 分钟', value: '5m', ms: 5 * 60 * 1000 },
  { label: '最近 15 分钟', value: '15m', ms: 15 * 60 * 1000 },
  { label: '最近 1 小时', value: '1h', ms: 60 * 60 * 1000 },
  { label: '最近 6 小时', value: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '最近 24 小时', value: '24h', ms: 24 * 60 * 60 * 1000 },
]

export default function LogDrilldown() {
  const clusterId = localStorage.getItem('clusterId') || ''
  const {
    filters, toggleLabelValue, toggleFieldValue, toggleLevel,
    setSearch, setLogql, removeFilter, clearAll, hasActiveFilters,
  } = useLogFilters()

  const [timeRange, setTimeRange] = useState('1h')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Data state
  const [labels, setLabels] = useState<LabelWithValues[]>([])
  const [fields, setFields] = useState<DetectedField[]>([])
  const [patterns, setPatterns] = useState<LogPattern[]>([])
  const [histogram, setHistogram] = useState<HistogramBucket[]>([])
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({})
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Compute time window
  const computeTimeWindow = useCallback((range: string) => {
    const r = TIME_RANGES.find(t => t.value === range)
    const now = Date.now()
    const ms = r?.ms || 3600000
    return {
      start: String((now - ms) * 1_000_000),
      end: String(now * 1_000_000),
    }
  }, [])

  // Build common query params
  const buildBaseParams = useCallback(() => {
    const { start, end } = computeTimeWindow(timeRange)
    const params = new URLSearchParams()
    params.set('clusterId', clusterId)
    // Apply label filters
    const nsValues = filters.labels['namespace']
    if (nsValues && nsValues.length > 0) params.set('namespace', nsValues[0])
    const svcValues = filters.labels['service_name'] || filters.labels['service']
    if (svcValues && svcValues.length > 0) params.set('services', svcValues.join(','))
    if (filters.levels.length > 0 && filters.levels.length < 4) params.set('levels', filters.levels.join(','))
    if (filters.search) params.set('search', filters.search)
    params.set('start', start)
    params.set('end', end)
    return params
  }, [clusterId, filters, timeRange, computeTimeWindow])

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    if (!clusterId) return
    const { start, end } = computeTimeWindow(timeRange)
    try {
      const res = await api<{ code: number; data: LabelWithValues[] }>(
        `/mrboard/log/v1/LabelsV2?clusterId=${clusterId}&start=${start}&end=${end}`
      )
      setLabels(res.data || [])
    } catch { /* optional */ }
  }, [clusterId, timeRange, computeTimeWindow])

  // Fetch detected fields
  const fetchFields = useCallback(async () => {
    if (!clusterId) return
    const params = buildBaseParams()
    try {
      const res = await api<{ code: number; data: { fields: DetectedField[] } }>(
        '/mrboard/log/v1/DetectedFields?' + params.toString()
      )
      setFields(res.data?.fields || [])
    } catch { /* optional, degrade gracefully */ }
  }, [clusterId, buildBaseParams])

  // Fetch patterns
  const fetchPatterns = useCallback(async () => {
    if (!clusterId) return
    const params = buildBaseParams()
    try {
      const res = await api<{ code: number; data: { patterns: LogPattern[] } }>(
        '/mrboard/log/v1/Patterns?' + params.toString()
      )
      setPatterns(res.data?.patterns || [])
    } catch { /* optional, degrade gracefully */ }
  }, [clusterId, buildBaseParams])

  // Fetch histogram
  const fetchHistogram = useCallback(async () => {
    if (!clusterId) return
    const params = buildBaseParams()
    try {
      const res = await api<{ code: number; data: HistogramBucket[] }>(
        '/mrboard/log/v1/Histogram?' + params.toString()
      )
      setHistogram(res.data || [])
    } catch { /* optional */ }
  }, [clusterId, buildBaseParams])

  // Fetch level counts
  const fetchLevels = useCallback(async () => {
    if (!clusterId) return
    const params = buildBaseParams()
    try {
      const res = await api<{ code: number; data: Record<string, number> }>(
        '/mrboard/log/v1/Levels?' + params.toString()
      )
      setLevelCounts(res.data || {})
    } catch { /* optional */ }
  }, [clusterId, buildBaseParams])

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    if (!clusterId) return
    setLoading(true)
    try {
      const params = buildBaseParams()
      params.set('limit', '500')
      params.set('direction', 'backward')
      // If user wrote custom LogQL, use it
      if (filters.logql) params.set('logql', filters.logql)
      const res = await api<{ code: number; data: { entries: LogEntry[]; total: number } }>(
        '/mrboard/log/v1/Query?' + params.toString()
      )
      setLogs(res.data?.entries || [])
      setTotal(res.data?.total || 0)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [clusterId, buildBaseParams, filters.logql])

  // Fetch all data
  const fetchAll = useCallback(() => {
    fetchLabels()
    fetchHistogram()
    fetchLevels()
    fetchLogs()
    fetchFields()
    fetchPatterns()
  }, [fetchLabels, fetchHistogram, fetchLevels, fetchLogs, fetchFields, fetchPatterns])

  // Auto-fetch when filters or time range change (with debounce)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!clusterId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchAll()
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [clusterId, filters, timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(fetchAll, 5000)
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
    }
  }, [autoRefresh, fetchAll])

  // Click histogram bucket to zoom
  const handleClickBucket = useCallback((time: number) => {
    const bucketStart = String((time - 30) * 1_000_000)
    const bucketEnd = String((time + 30) * 1_000_000)
    const params = new URLSearchParams()
    params.set('clusterId', clusterId)
    params.set('start', bucketStart)
    params.set('end', bucketEnd)
    params.set('limit', '200')
    params.set('direction', 'backward')
    setLoading(true)
    api<{ code: number; data: { entries: LogEntry[]; total: number } }>('/mrboard/log/v1/Query?' + params.toString())
      .then(res => { setLogs(res.data?.entries || []); setTotal(res.data?.total || 0) })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setLoading(false))
  }, [clusterId])

  // Build LogQL for display
  const buildLogQLDisplay = useCallback(() => {
    if (filters.logql) return filters.logql
    const selectors: string[] = []
    const nsValues = filters.labels['namespace']
    if (nsValues && nsValues.length > 0) selectors.push(`namespace="${nsValues[0]}"`)
    const svcValues = filters.labels['service_name'] || filters.labels['service']
    if (svcValues && svcValues.length === 1) selectors.push(`service_name="${svcValues[0]}"`)
    else if (svcValues && svcValues.length > 1) selectors.push(`service_name=~"${svcValues.join('|')}"`)
    const selector = selectors.length > 0 ? `{${selectors.join(', ')}}` : '{}'
    const filter = filters.search ? ` |= \`${filters.search}\`` : ''
    return `${selector}${filter}`
  }, [filters])

  // Selected field for breakdown
  const [selectedBreakdownField, setSelectedBreakdownField] = useState<string | null>(null)
  const breakdownValues = selectedBreakdownField
    ? fields.find(f => f.name === selectedBreakdownField)?.values || []
    : []

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left: Facet Panel */}
      <FacetPanel
        labels={labels}
        fields={fields}
        levels={levelCounts}
        selectedLabels={filters.labels}
        excludeLabels={filters.excludeLabels}
        selectedFields={filters.fields}
        excludeFields={filters.excludeFields}
        selectedLevels={filters.levels}
        onToggleLabel={toggleLabelValue}
        onToggleField={(name, value, exclude) => {
          toggleFieldValue(name, value, exclude)
          setSelectedBreakdownField(name)
        }}
        onToggleLevel={toggleLevel}
      />

      {/* Right: Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="shrink-0 border-b bg-card px-4 py-2.5 space-y-2">
          {/* LogQL bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-500 shrink-0 font-mono">LogQL</span>
            <Input
              value={buildLogQLDisplay()}
              onChange={e => setLogql(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchAll()}
              className="h-8 font-mono text-sm"
            />
            <Button size="sm" onClick={fetchAll} disabled={loading} className="h-8 px-3 shrink-0">
              <Play size={13} className="mr-1" />查询
            </Button>
          </div>

          {/* Toolbar: time range + search + auto-refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={timeRange} onValueChange={(v: string | null) => { if (v) setTimeRange(v) }}>
              <SelectTrigger className="w-[140px] h-7 text-xs">
                <Clock size={12} className="mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(r => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-4 w-px bg-border" />

            {/* Search */}
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索日志..."
                value={filters.search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchAll()}
                className="h-7 w-48 pl-7 pr-7 text-xs"
              />
              {filters.search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex-1" />

            {/* Auto-refresh */}
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-7 text-xs"
            >
              {autoRefresh ? (
                <><Pause size={12} className="mr-1" />暂停</>
              ) : (
                <><RefreshCw size={12} className="mr-1" />自动刷新</>
              )}
            </Button>
          </div>

          {/* Filter tags */}
          {hasActiveFilters && (
            <FilterTagBar filters={filters} onRemove={removeFilter} onClearAll={clearAll} />
          )}
        </div>

        {/* Volume histogram */}
        <VolumeHistogram data={histogram} onClickBucket={handleClickBucket} />

        {/* Main content area */}
        <div className="flex-1 overflow-auto">
          {/* Patterns */}
          <PatternList
            patterns={patterns}
            onPatternClick={(p) => setSearch(p)}
          />

          {/* Field breakdown */}
          {selectedBreakdownField && breakdownValues.length > 0 && (
            <FieldBreakdown fieldName={selectedBreakdownField} values={breakdownValues} />
          )}

          {/* Log entries */}
          <LogEntryList logs={logs} loading={loading} total={total} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/log/LogDrilldown.tsx
git commit -m "feat(log): add LogDrilldown main page component

Replaces LogViewer with Grafana Logs Drilldown-style interface:
- Left facet panel (labels + fields + levels)
- Volume histogram with click-to-zoom
- Pattern detection display
- Field breakdown charts
- Filter tag bar with include/exclude
- Auto-refresh and URL state sync"
```

---

## Phase 5: Integration

### Task 16: Update route and menu

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/MainLayout.tsx`

**Steps:**

- [ ] **Step 1: Update App.tsx route**

In `frontend/src/App.tsx`, change the LogViewer import and route:

Replace line 172:
```typescript
const LogViewer = lazy(() => import('@/pages/log/LogViewer'))
```
With:
```typescript
const LogDrilldown = lazy(() => import('@/pages/log/LogDrilldown'))
```

Replace line 687-689:
```typescript
        <Route path="/log/loki" element={
          <ProtectedRoute><MainLayout><LogViewer /></MainLayout></ProtectedRoute>
```
With:
```typescript
        <Route path="/log/loki" element={
          <ProtectedRoute><MainLayout><LogDrilldown /></MainLayout></ProtectedRoute>
```

- [ ] **Step 2: Verify frontend builds**

Run: `cd /root/mrboard/frontend && npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(log): replace LogViewer route with LogDrilldown"
```

---

### Task 17: Build and deploy

**Files:**
- None (build/deploy only)

**Steps:**

- [ ] **Step 1: Build backend**

Run: `cd /root/mrboard && go build -o mrboard . 2>&1 | tail -20`
Expected: Binary builds successfully.

- [ ] **Step 2: Build frontend**

Run: `cd /root/mrboard/frontend && npm run build 2>&1 | tail -20`
Expected: Build succeeds, output in `frontend/dist/`.

- [ ] **Step 3: Deploy** (manual — depends on target environment)

Build and deploy as per existing workflow.

- [ ] **Step 4: Commit any final changes**

```bash
git add -A
git commit -m "chore: build log drilldown feature"
```

---

## Verification Checklist

After implementation, verify these scenarios from the design spec:

- [ ] Page loads without errors
- [ ] Cluster selector works (uses stored clusterId)
- [ ] Labels facet panel loads with namespace/pod/container/service labels
- [ ] Clicking a label value filters logs (include)
- [ ] Shift+clicking a label value filters logs (exclude, red badge)
- [ ] Filter tags appear in top bar, removable with ×
- [ ] Volume histogram renders with level colors
- [ ] Clicking histogram bucket zooms to that time range
- [ ] Patterns section shows detected patterns (or degrades gracefully if API fails)
- [ ] Clicking a pattern adds it as search filter
- [ ] Detected fields appear in facet panel (or degrade gracefully)
- [ ] Selecting a field shows field breakdown chart
- [ ] Log entries render with timestamp, level badge, service, message
- [ ] Log entry expand shows all labels
- [ ] Copy button works per entry
- [ ] Auto-refresh toggle works (5s interval)
- [ ] Time range selector changes query range
- [ ] Search input filters logs
- [ ] LogQL input shows computed query, editable
- [ ] URL reflects current filter state (shareable)
- [ ] Empty states display correctly (no cluster, no logs, loading)
- [ ] Error states display correctly (Loki unreachable)
