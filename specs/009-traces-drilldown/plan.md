# Traces Drilldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace empty Prometheus service-graph metrics with Tempo TraceQL Metrics API, add Grafana-style RED overview panel and drilldown tabs.

**Architecture:** Go backend proxies Tempo's `/api/metrics/query_range` endpoint, aggregates RED (Rate/Error/Duration) metrics per service. Frontend adds a RED overview panel at the top of TraceViewer with tab-based drilldown (Breakdown, Structure, Traces, Topology).

**Tech Stack:** Go + Beego v2 (backend), React 18 + TypeScript + recharts + shadcn/ui (frontend), Tempo TraceQL Metrics API (data source)

**Spec:** [specs/009-traces-drilldown/spec.md](../../specs/009-traces-drilldown/spec.md)

**Verification:** This project has no automated tests. Each task includes manual verification steps using `curl` for backend and browser for frontend.

---

## File Structure

### Backend (Go)

| File | Action | Responsibility |
|------|--------|---------------|
| `models/tempo_trace_model.go` | Modify | Add `QueryTraceQLMetrics()`, `GetREDMetrics()`, rewrite `GetDependencies()` |
| `controllers/tempo_trace.go` | Modify | Add `MetricsQueryRange()`, `REDMetrics()` handlers |
| `routers/router.go` | Modify | Register 2 new routes |

### Frontend (TypeScript/React)

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/hooks/useTraceMetrics.ts` | Create | RED data fetching hook |
| `frontend/src/pages/log/REDPanel.tsx` | Create | Rate/Error/Duration sparkline cards |
| `frontend/src/pages/log/BreakdownView.tsx` | Create | Per-service RED breakdown grid |
| `frontend/src/pages/log/TraceViewer.tsx` | Modify | Add RED panel + tab navigation |
| `frontend/src/pages/log/ServiceOverviewPanel.tsx` | Modify | Use REDMetrics API instead of Prometheus |
| `frontend/src/lib/api.ts` | Modify | Add trace metrics API functions |

---

## Task 1: Backend — TraceQL Metrics Query Function

**Files:**
- Modify: `models/tempo_trace_model.go`

- [ ] **Step 1: Add TraceQL Metrics response types**

Add after the existing `prometheusQueryResponse` struct (line ~374):

```go
// traceQLMetricsResponse TraceQL Metrics API响应
type traceQLMetricsResponse struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string                    `json:"resultType"`
		Result     []traceQLMetricsResult    `json:"result"`
	} `json:"data"`
}

type traceQLMetricsResult struct {
	Metric map[string]string `json:"metric"`
	Values [][]interface{}   `json:"values"`
}
```

- [ ] **Step 2: Add QueryTraceQLMetrics function**

Add after the response types:

```go
// QueryTraceQLMetrics 查询TraceQL Metrics API / Query TraceQL Metrics API
func QueryTraceQLMetrics(clusterId, query, start, end, step string) ([]traceQLMetricsResult, error) {
	tempoUrl, err := GetTempoUrl(clusterId)
	if err != nil {
		return nil, err
	}

	params := url.Values{}
	params.Set("q", query)
	if start != "" {
		params.Set("start", start)
	}
	if end != "" {
		params.Set("end", end)
	}
	if step != "" {
		params.Set("step", step)
	}

	reqUrl := fmt.Sprintf("%s/api/metrics/query_range?%s", strings.TrimRight(tempoUrl, "/"), params.Encode())
	body, err := tempoHttpGet(reqUrl)
	if err != nil {
		return nil, fmt.Errorf("traceql metrics query error: %v", err)
	}

	var resp traceQLMetricsResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse traceql metrics response error: %v", err)
	}
	if resp.Status != "success" {
		return nil, fmt.Errorf("traceql metrics API error: %s", string(body))
	}

	return resp.Data.Result, nil
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: No errors (or only pre-existing errors unrelated to our changes)

- [ ] **Step 4: Commit**

```bash
git add models/tempo_trace_model.go
git commit -m "feat(trace): add TraceQL Metrics query function"
```

---

## Task 2: Backend — REDMetrics Endpoint

**Files:**
- Modify: `models/tempo_trace_model.go`
- Modify: `controllers/tempo_trace.go`
- Modify: `routers/router.go`

- [ ] **Step 1: Add RED metrics types and GetREDMetrics function**

Add to `models/tempo_trace_model.go` after `QueryTraceQLMetrics`:

```go
// REDServiceMetrics 单个服务的RED指标 / RED metrics for a single service
type REDServiceMetrics struct {
	ServiceName string     `json:"serviceName"`
	Rate        [][]interface{} `json:"rate"`
	ErrorRate   [][]interface{} `json:"errorRate"`
	DurationP99 [][]interface{} `json:"durationP99"`
}

// GetREDMetrics 获取RED指标 / Get RED metrics for services
func GetREDMetrics(clusterId, service, start, end, step string) ([]REDServiceMetrics, error) {
	if step == "" {
		step = "60"
	}

	// Build service filter
	svcFilter := ""
	if service != "" {
		svcFilter = fmt.Sprintf(`resource.service.name="%s"`, service)
	}

	// Build 3 TraceQL queries
	rateQuery := fmt.Sprintf(`{%s} | count_over_time() by (resource.service.name)`, svcFilter)
	errorQuery := fmt.Sprintf(`{%s, status=error} | count_over_time() by (resource.service.name)`, svcFilter)
	durationQuery := fmt.Sprintf(`{%s} | quantile_over_time(duration, 0.99) by (resource.service.name)`, svcFilter)

	// Run queries concurrently
	type result struct {
		name    string
		results []traceQLMetricsResult
		err     error
	}

	ch := make(chan result, 3)
	go func() {
		r, err := QueryTraceQLMetrics(clusterId, rateQuery, start, end, step)
		ch <- result{"rate", r, err}
	}()
	go func() {
		r, err := QueryTraceQLMetrics(clusterId, errorQuery, start, end, step)
		ch <- result{"error", r, err}
	}()
	go func() {
		r, err := QueryTraceQLMetrics(clusterId, durationQuery, start, end, step)
		ch <- result{"duration", r, err}
	}()

	// Collect results
	rateMap := make(map[string][][]interface{})
	errorMap := make(map[string][][]interface{})
	durationMap := make(map[string][][]interface{})

	for i := 0; i < 3; i++ {
		res := <-ch
		if res.err != nil {
			continue // Skip failed queries gracefully
		}
		for _, r := range res.results {
			svcName := r.Metric["resource.service.name"]
			if svcName == "" {
				svcName = "unknown"
			}
			switch res.name {
			case "rate":
				rateMap[svcName] = r.Values
			case "error":
				errorMap[svcName] = r.Values
			case "duration":
				durationMap[svcName] = r.Values
			}
		}
	}

	// Merge into REDServiceMetrics
	svcSet := make(map[string]bool)
	for svc := range rateMap {
		svcSet[svc] = true
	}
	for svc := range errorMap {
		svcSet[svc] = true
	}
	for svc := range durationMap {
		svcSet[svc] = true
	}

	var services []REDServiceMetrics
	for svc := range svcSet {
		services = append(services, REDServiceMetrics{
			ServiceName: svc,
			Rate:        rateMap[svc],
			ErrorRate:   errorMap[svc],
			DurationP99: durationMap[svc],
		})
	}

	return services, nil
}
```

- [ ] **Step 2: Add REDMetrics controller handler**

Add to `controllers/tempo_trace.go` after `ServiceOverview()`:

```go
// REDMetrics 获取RED指标
func (this *TempoTraceController) REDMetrics() {
	clusterId := this.GetString("clusterId")
	service := this.GetString("service")
	start := this.GetString("start")
	end := this.GetString("end")
	step := this.GetString("step")

	metrics, err := m.GetREDMetrics(clusterId, service, start, end, step)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}
	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "success", "data": map[string]interface{}{"services": metrics}}
	this.ServeJSON()
}
```

- [ ] **Step 3: Register route**

Add to `routers/router.go` after the existing trace routes (line ~445):

```go
beego.Router("/mrboard/trace/v1/REDMetrics", &controllers.TempoTraceController{}, "get:REDMetrics")
```

- [ ] **Step 4: Verify compilation**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add models/tempo_trace_model.go controllers/tempo_trace.go routers/router.go
git commit -m "feat(trace): add REDMetrics endpoint"
```

---

## Task 3: Backend — Rewrite GetDependencies

**Files:**
- Modify: `models/tempo_trace_model.go`

- [ ] **Step 1: Rewrite GetDependencies to use TraceQL Metrics**

Replace the existing `GetDependencies` function (lines ~377-469) with:

```go
// GetDependencies 获取服务依赖 / Get service dependencies (via TraceQL Metrics)
func GetDependencies(clusterId, start, end string) ([]TempoDependency, error) {
	// Try TraceQL Metrics: query cross-service call counts
	// parent.service.name is a TraceQL intrinsic field in Tempo 2.4+
	callQuery := `{} | count_over_time() by (resource.service.name, parent.service.name)`
	callResults, callErr := QueryTraceQLMetrics(clusterId, callQuery, start, end, "60")

	if callErr == nil && len(callResults) > 0 {
		// Build dependency map from TraceQL results
		depMap := make(map[string]*TempoDependency)

		// Also query error counts
		errorQuery := `{status=error} | count_over_time() by (resource.service.name, parent.service.name)`
		errorResults, _ := QueryTraceQLMetrics(clusterId, errorQuery, start, end, "60")
		errorMap := make(map[string]int64)
		for _, r := range errorResults {
			child := r.Metric["resource.service.name"]
			parent := r.Metric["parent.service.name"]
			if child == "" || parent == "" || child == parent {
				continue
			}
			key := parent + "|" + child
			var count int64
			for _, v := range r.Values {
				if s, ok := v[1].(string); ok {
					var c float64
					fmt.Sscanf(s, "%f", &c)
					count += int64(c)
				}
			}
			errorMap[key] = count
		}

		// Process call counts
		for _, r := range callResults {
			child := r.Metric["resource.service.name"]
			parent := r.Metric["parent.service.name"]
			if child == "" || parent == "" || child == parent {
				continue
			}
			key := parent + "|" + child
			var count int64
			for _, v := range r.Values {
				if s, ok := v[1].(string); ok {
					var c float64
					fmt.Sscanf(s, "%f", &c)
					count += int64(c)
				}
			}
			if count == 0 {
				continue
			}
			dep := &TempoDependency{
				Parent:    parent,
				Child:     child,
				CallCount: count,
			}
			if errCount, ok := errorMap[key]; ok && count > 0 {
				dep.ErrorRate = float64(errCount) / float64(count)
			}
			depMap[key] = dep
		}

		if len(depMap) > 0 {
			var deps []TempoDependency
			for _, dep := range depMap {
				deps = append(deps, *dep)
			}
			return deps, nil
		}
	}

	// Fallback: derive dependencies from sampled traces
	return getDependenciesFromTraces(clusterId, start, end)
}

// getDependenciesFromTraces 从采样trace数据派生依赖关系
func getDependenciesFromTraces(clusterId, start, end string) ([]TempoDependency, error) {
	traces, err := SearchTraces(clusterId, "", "", "", start, end, "100", "", "")
	if err != nil {
		return nil, fmt.Errorf("search traces for dependencies error: %v", err)
	}

	type edgeKey struct {
		parent string
		child  string
	}
	depMap := make(map[edgeKey]*TempoDependency)
	errorMap := make(map[edgeKey]int64)

	for _, trace := range traces {
		detail, err := GetTraceDetail(clusterId, trace.TraceID)
		if err != nil {
			continue
		}

		// Build spanID -> serviceName map
		spanSvc := make(map[string]string)
		for _, span := range detail.Spans {
			spanSvc[span.SpanID] = span.ServiceName
		}

		// Extract cross-service edges
		for _, span := range detail.Spans {
			if span.ParentSpanID == "" || span.ParentSpanID == "0000000000000000" {
				continue
			}
			parentSvc, ok := spanSvc[span.ParentSpanID]
			if !ok || parentSvc == span.ServiceName {
				continue
			}
			key := edgeKey{parent: parentSvc, child: span.ServiceName}
			if dep, ok := depMap[key]; ok {
				dep.CallCount++
			} else {
				depMap[key] = &TempoDependency{
					Parent:    parentSvc,
					Child:     span.ServiceName,
					CallCount: 1,
				}
			}
			if span.Status == "error" {
				errorMap[key]++
			}
		}
	}

	var deps []TempoDependency
	for key, dep := range depMap {
		if errCount, ok := errorMap[key]; ok && dep.CallCount > 0 {
			dep.ErrorRate = float64(errCount) / float64(dep.CallCount)
		}
		deps = append(deps, *dep)
	}

	return deps, nil
}
```

- [ ] **Step 2: Remove unused Prometheus dependency queries**

Delete the old `GetDependencies` function body that queries Prometheus (the `promUrl` hardcoded URL and 4 Prometheus queries). The `prometheusQueryResponse` type can stay since `GetServiceOverview` still uses it.

- [ ] **Step 3: Verify compilation**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add models/tempo_trace_model.go
git commit -m "feat(trace): rewrite GetDependencies to use TraceQL Metrics with fallback"
```

---

## Task 4: Backend — Add MetricsQueryRange Proxy Endpoint

**Files:**
- Modify: `controllers/tempo_trace.go`
- Modify: `routers/router.go`

- [ ] **Step 1: Add MetricsQueryRange handler**

Add to `controllers/tempo_trace.go`:

```go
// MetricsQueryRange TraceQL Metrics时序查询代理
func (this *TempoTraceController) MetricsQueryRange() {
	clusterId := this.GetString("clusterId")
	query := this.GetString("query")
	start := this.GetString("start")
	end := this.GetString("end")
	step := this.GetString("step")

	if clusterId == "" || query == "" {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "缺少必填参数 clusterId 或 query"}
		this.ServeJSON()
		return
	}

	results, err := m.QueryTraceQLMetrics(clusterId, query, start, end, step)
	if err != nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": err.Error()}
		this.ServeJSON()
		return
	}

	this.Data["json"] = &map[string]interface{}{
		"code": 0,
		"msg":  "success",
		"data": map[string]interface{}{
			"resultType": "matrix",
			"result":     results,
		},
	}
	this.ServeJSON()
}
```

- [ ] **Step 2: Register route**

Add to `routers/router.go`:

```go
beego.Router("/mrboard/trace/v1/MetricsQueryRange", &controllers.TempoTraceController{}, "get:MetricsQueryRange")
```

- [ ] **Step 3: Verify compilation**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add controllers/tempo_trace.go routers/router.go
git commit -m "feat(trace): add MetricsQueryRange proxy endpoint"
```

---

## Task 5: Frontend — API Functions

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add trace metrics API functions**

Add at the end of `api.ts`:

```typescript
// Trace RED metrics
export interface REDServiceMetrics {
  serviceName: string
  rate: [number, string][]
  errorRate: [number, string][]
  durationP99: [number, string][]
}

export interface REDMetricsResponse {
  code: number
  data: {
    services: REDServiceMetrics[]
  }
}

export async function fetchREDMetrics(params: {
  clusterId: string
  service?: string
  start: string
  end: string
  step?: string
}): Promise<REDMetricsResponse> {
  const qs = new URLSearchParams({
    clusterId: params.clusterId,
    start: params.start,
    end: params.end,
    ...(params.service && { service: params.service }),
    ...(params.step && { step: params.step }),
  })
  return api<REDMetricsResponse>(`/mrboard/trace/v1/REDMetrics?${qs}`)
}

export async function fetchTraceMetricsQueryRange(params: {
  clusterId: string
  query: string
  start: string
  end: string
  step?: string
}): Promise<{ code: number; data: { resultType: string; result: Array<{ metric: Record<string, string>; values: [number, string][] }> } }> {
  const qs = new URLSearchParams({
    clusterId: params.clusterId,
    query: params.query,
    start: params.start,
    end: params.end,
    ...(params.step && { step: params.step }),
  })
  return api(`/mrboard/trace/v1/MetricsQueryRange?${qs}`)
}
```

- [ ] **Step 2: Verify frontend compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors from our changes

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(trace): add trace metrics API functions"
```

---

## Task 6: Frontend — useTraceMetrics Hook

**Files:**
- Create: `frontend/src/hooks/useTraceMetrics.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { fetchREDMetrics, type REDServiceMetrics } from '@/lib/api'

interface UseTraceMetricsOptions {
  clusterId: string
  service?: string
  timeRange: string
  refreshKey?: number
}

interface TraceMetricsState {
  services: REDServiceMetrics[]
  loading: boolean
  error: string | null
}

const TIME_RANGE_MAP: Record<string, number> = {
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '6h': 21600,
  '24h': 86400,
}

function getStepForDuration(duration: number): number {
  if (duration <= 300) return 15
  if (duration <= 900) return 30
  if (duration <= 3600) return 60
  if (duration <= 21600) return 300
  return 600
}

export function useTraceMetrics({ clusterId, service, timeRange, refreshKey = 0 }: UseTraceMetricsOptions) {
  const [state, setState] = useState<TraceMetricsState>({
    services: [],
    loading: false,
    error: null,
  })

  const fetchMetrics = useCallback(async () => {
    if (!clusterId) return
    setState(prev => ({ ...prev, loading: true, error: null }))

    const duration = TIME_RANGE_MAP[timeRange] || 3600
    const end = Math.floor(Date.now() / 1000)
    const start = end - duration
    const step = getStepForDuration(duration)

    try {
      const res = await fetchREDMetrics({
        clusterId,
        service,
        start: String(start),
        end: String(end),
        step: String(step),
      })
      if (res.code === 0) {
        setState({ services: res.data.services || [], loading: false, error: null })
      } else {
        setState({ services: [], loading: false, error: 'Failed to fetch metrics' })
      }
    } catch (err) {
      setState({ services: [], loading: false, error: (err as Error).message })
    }
  }, [clusterId, service, timeRange])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics, refreshKey])

  return { ...state, refetch: fetchMetrics }
}
```

- [ ] **Step 2: Verify frontend compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useTraceMetrics.ts
git commit -m "feat(trace): add useTraceMetrics hook"
```

---

## Task 7: Frontend — REDPanel Component

**Files:**
- Create: `frontend/src/pages/log/REDPanel.tsx`

- [ ] **Step 1: Create the REDPanel component**

```typescript
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { REDServiceMetrics } from '@/lib/api'

const COLORS = {
  rate: '#3b82f6',
  error: '#ef4444',
  duration: '#a855f7',
}

function formatValue(val: number): string {
  if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + 'M'
  if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + 'K'
  if (Math.abs(val) >= 1) return val.toFixed(2)
  if (Math.abs(val) >= 0.001) return (val * 1000).toFixed(1) + 'm'
  return val.toFixed(4)
}

function formatDuration(seconds: number): string {
  if (seconds >= 1) return (seconds).toFixed(2) + 's'
  if (seconds >= 0.001) return (seconds * 1000).toFixed(1) + 'ms'
  return (seconds * 1000000).toFixed(0) + 'μs'
}

function getLastValue(values: [number, string][] | undefined): string {
  if (!values || values.length === 0) return '-'
  const last = values[values.length - 1]
  return last[1]
}

function MiniSparkline({ data, color }: { data: [number, string][]; color: string }) {
  if (!data || data.length === 0) {
    return <div className="h-[40px] flex items-center justify-center text-xs text-muted-foreground">-</div>
  }
  const chartData = data.map(([t, v]) => ({ t, v: parseFloat(v) }))
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <XAxis dataKey="t" hide />
        <Tooltip
          labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleTimeString('zh-CN', { hour12: false })}
          contentStyle={{ fontSize: 10, borderRadius: 4 }}
        />
        <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface REDPanelProps {
  services: REDServiceMetrics[]
  loading: boolean
  error: string | null
  onRateClick?: () => void
  onErrorClick?: () => void
  onDurationClick?: () => void
}

export function REDPanel({ services, loading, error, onRateClick, onErrorClick, onDurationClick }: REDPanelProps) {
  // Aggregate all services into single values
  const aggregatedRate = services.reduce((sum, s) => {
    const last = getLastValue(s.rate)
    return sum + (parseFloat(last) || 0)
  }, 0)

  const aggregatedErrorRate = services.reduce((sum, s) => {
    const last = getLastValue(s.errorRate)
    return sum + (parseFloat(last) || 0)
  }, 0)

  const aggregatedDurationP99 = services.reduce((max, s) => {
    const last = parseFloat(getLastValue(s.durationP99)) || 0
    return Math.max(max, last)
  }, 0)

  // Merge all service rate data for sparkline
  const allRateData: [number, string][] = services.length > 0 ? (services[0]?.rate || []) : []
  const allErrorData: [number, string][] = services.length > 0 ? (services[0]?.errorRate || []) : []
  const allDurationData: [number, string][] = services.length > 0 ? (services[0]?.durationP99 || []) : []

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(i => (
          <Card key={i}>
            <CardContent className="pt-3 pb-2">
              <div className="h-4 w-20 bg-muted/50 rounded animate-pulse mb-2" />
              <div className="h-[40px] bg-muted/30 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-3 pb-2 text-sm text-destructive">
          {error}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Rate */}
      <Card className="cursor-pointer hover:border-blue-300 transition-colors" onClick={onRateClick}>
        <CardContent className="pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Span Rate</span>
            <Badge variant="secondary" className="text-[10px]">{services.length} 服务</Badge>
          </div>
          <div className="text-lg font-bold" style={{ color: COLORS.rate }}>
            {formatValue(aggregatedRate)}/s
          </div>
          <MiniSparkline data={allRateData} color={COLORS.rate} />
        </CardContent>
      </Card>

      {/* Error Rate */}
      <Card className="cursor-pointer hover:border-red-300 transition-colors" onClick={onErrorClick}>
        <CardContent className="pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Error Rate</span>
            {aggregatedErrorRate > 0 && <Badge variant="destructive" className="text-[10px]">!</Badge>}
          </div>
          <div className="text-lg font-bold" style={{ color: COLORS.error }}>
            {formatValue(aggregatedErrorRate)}/s
          </div>
          <MiniSparkline data={allErrorData} color={COLORS.error} />
        </CardContent>
      </Card>

      {/* Duration P99 */}
      <Card className="cursor-pointer hover:border-purple-300 transition-colors" onClick={onDurationClick}>
        <CardContent className="pt-3 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Duration P99</span>
          </div>
          <div className="text-lg font-bold" style={{ color: COLORS.duration }}>
            {formatDuration(aggregatedDurationP99)}
          </div>
          <MiniSparkline data={allDurationData} color={COLORS.duration} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify frontend compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/log/REDPanel.tsx
git commit -m "feat(trace): add REDPanel component"
```

---

## Task 8: Frontend — BreakdownView Component

**Files:**
- Create: `frontend/src/pages/log/BreakdownView.tsx`

- [ ] **Step 1: Create the BreakdownView component**

```typescript
import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, ResponsiveContainer, XAxis } from 'recharts'
import type { REDServiceMetrics } from '@/lib/api'

function formatValue(val: number): string {
  if (Math.abs(val) >= 1e6) return (val / 1e6).toFixed(1) + 'M'
  if (Math.abs(val) >= 1e3) return (val / 1e3).toFixed(1) + 'K'
  if (Math.abs(val) >= 1) return val.toFixed(2)
  if (Math.abs(val) >= 0.001) return (val * 1000).toFixed(1) + 'm'
  return val.toFixed(4)
}

function formatDuration(seconds: number): string {
  if (seconds >= 1) return seconds.toFixed(2) + 's'
  if (seconds >= 0.001) return (seconds * 1000).toFixed(1) + 'ms'
  return (seconds * 1000000).toFixed(0) + 'μs'
}

function getLastValue(values: [number, string][] | undefined): number {
  if (!values || values.length === 0) return 0
  return parseFloat(values[values.length - 1][1]) || 0
}

function MiniSparkline({ data, color }: { data: [number, string][]; color: string }) {
  if (!data || data.length === 0) return null
  const chartData = data.map(([t, v]) => ({ t, v: parseFloat(v) }))
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={chartData}>
        <XAxis dataKey="t" hide />
        <Line type="monotone" dataKey="v" stroke={color} dot={false} strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface BreakdownViewProps {
  services: REDServiceMetrics[]
  loading: boolean
  onServiceClick?: (serviceName: string) => void
}

export function BreakdownView({ services, loading, onServiceClick }: BreakdownViewProps) {
  // Sort by rate descending
  const sorted = useMemo(() => {
    return [...services].sort((a, b) => getLastValue(b.rate) - getLastValue(a.rate))
  }, [services])

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-3">
              <div className="h-4 w-24 bg-muted/50 rounded animate-pulse mb-3" />
              <div className="h-[32px] bg-muted/30 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4 text-center text-muted-foreground text-sm">
          暂无服务数据
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">{sorted.length} 个服务</div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map(svc => {
          const rate = getLastValue(svc.rate)
          const errorRate = getLastValue(svc.errorRate)
          const durationP99 = getLastValue(svc.durationP99)

          return (
            <Card
              key={svc.serviceName}
              className="cursor-pointer hover:border-blue-300 transition-all"
              onClick={() => onServiceClick?.(svc.serviceName)}
            >
              <CardContent className="pt-3 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium font-mono truncate flex-1" title={svc.serviceName}>
                    {svc.serviceName}
                  </div>
                  {errorRate > 0 && <Badge variant="destructive" className="text-[10px] ml-2">ERROR</Badge>}
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">Rate</div>
                    <div className="font-bold text-blue-600">{formatValue(rate)}/s</div>
                    <MiniSparkline data={svc.rate} color="#3b82f6" />
                  </div>
                  <div>
                    <div className="text-muted-foreground">Error</div>
                    <div className="font-bold text-red-600">{formatValue(errorRate)}/s</div>
                    <MiniSparkline data={svc.errorRate} color="#ef4444" />
                  </div>
                  <div>
                    <div className="text-muted-foreground">P99</div>
                    <div className="font-bold text-purple-600">{formatDuration(durationP99)}</div>
                    <MiniSparkline data={svc.durationP99} color="#a855f7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify frontend compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/log/BreakdownView.tsx
git commit -m "feat(trace): add BreakdownView component"
```

---

## Task 9: Frontend — StructureView Component

**Files:**
- Create: `frontend/src/pages/log/StructureView.tsx`

- [ ] **Step 1: Create the StructureView component**

This component merges multiple traces into a single call tree, similar to Grafana's `StructureTabScene`. It shows the service call hierarchy with aggregated span counts and durations.

```typescript
import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown, Database, Globe, Zap } from 'lucide-react'
import { useState } from 'react'

interface TraceSpan {
  spanID: string
  traceID: string
  parentSpanID: string
  operationName: string
  serviceName: string
  startTime: number
  duration: number
  status: string
  tags: Record<string, string>
}

interface TraceDetail {
  traceID: string
  spans: TraceSpan[]
  services: string[]
  rootService: string
  rootOperation: string
  duration: number
}

interface TreeNode {
  serviceName: string
  operationName: string
  spanCount: number
  avgDuration: number
  errorCount: number
  children: TreeNode[]
}

function buildMergeTree(traces: TraceDetail[]): TreeNode[] {
  // Collect all spans across traces, grouped by service+operation
  const nodeMap = new Map<string, { spans: TraceSpan[]; children: Set<string>; parent: string | null }>()

  for (const trace of traces) {
    const spanMap = new Map<string, TraceSpan>()
    for (const span of trace.spans) {
      spanMap.set(span.spanID, span)
    }

    for (const span of trace.spans) {
      const key = `${span.serviceName}:${span.operationName}`
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { spans: [], children: new Set(), parent: null })
      }
      nodeMap.get(key)!.spans.push(span)

      // Find parent
      if (span.parentSpanID && span.parentSpanID !== '0000000000000000') {
        const parentSpan = spanMap.get(span.parentSpanID)
        if (parentSpan && parentSpan.serviceName !== span.serviceName) {
          const parentKey = `${parentSpan.serviceName}:${parentSpan.operationName}`
          nodeMap.get(key)!.parent = parentKey
          if (!nodeMap.has(parentKey)) {
            nodeMap.set(parentKey, { spans: [], children: new Set(), parent: null })
          }
          nodeMap.get(parentKey)!.children.add(key)
        }
      }
    }
  }

  // Build tree from roots (no parent or parent not in map)
  const built = new Set<string>()
  function buildNode(key: string): TreeNode | null {
    if (built.has(key)) return null
    built.add(key)

    const entry = nodeMap.get(key)
    if (!entry) return null

    const [serviceName, operationName] = key.split(':')
    const spans = entry.spans

    const children: TreeNode[] = []
    for (const childKey of entry.children) {
      const child = buildNode(childKey)
      if (child) children.push(child)
    }

    return {
      serviceName,
      operationName,
      spanCount: spans.length,
      avgDuration: spans.reduce((sum, s) => sum + s.duration, 0) / spans.length / 1e6, // ns -> ms
      errorCount: spans.filter(s => s.status === 'error').length,
      children: children.sort((a, b) => b.spanCount - a.spanCount),
    }
  }

  const roots: TreeNode[] = []
  for (const [key, entry] of nodeMap) {
    if (!entry.parent || !nodeMap.has(entry.parent)) {
      const node = buildNode(key)
      if (node) roots.push(node)
    }
  }

  return roots.sort((a, b) => b.spanCount - a.spanCount)
}

function TreeNodeComponent({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 3)
  const hasChildren = node.children.length > 0
  const errorRate = node.spanCount > 0 ? node.errorCount / node.spanCount : 0

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-muted/50 rounded cursor-pointer text-xs"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
        ) : (
          <span className="w-3" />
        )}

        <Globe size={12} className="text-blue-500 shrink-0" />

        <span className="font-mono font-medium">{node.serviceName}</span>
        <span className="text-muted-foreground">→</span>
        <span className="truncate">{node.operationName}</span>

        <div className="flex-1" />

        <Badge variant="secondary" className="text-[10px]">{node.spanCount} spans</Badge>
        <span className="font-mono text-muted-foreground">{node.avgDuration.toFixed(1)}ms</span>

        {errorRate > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            {(errorRate * 100).toFixed(0)}% err
          </Badge>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <TreeNodeComponent key={`${child.serviceName}:${child.operationName}:${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface StructureViewProps {
  traces: TraceDetail[]
  loading: boolean
}

export function StructureView({ traces, loading }: StructureViewProps) {
  const tree = useMemo(() => buildMergeTree(traces), [traces])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-6 bg-muted/30 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (tree.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4 text-center text-muted-foreground text-sm">
          暂无 trace 数据，请先搜索 trace
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-sm font-medium mb-3">服务调用树（{traces.length} 条 trace 合并）</div>
        <div className="max-h-[500px] overflow-y-auto">
          {tree.map((node, i) => (
            <TreeNodeComponent key={`${node.serviceName}:${node.operationName}:${i}`} node={node} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify frontend compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/log/StructureView.tsx
git commit -m "feat(trace): add StructureView component for call tree visualization"
```

---

## Task 10: Frontend — Refactor TraceViewer with RED Panel + Tabs

**Files:**
- Modify: `frontend/src/pages/log/TraceViewer.tsx`

- [ ] **Step 1: Add imports**

Add these imports at the top of TraceViewer.tsx (after existing imports):

```typescript
import { REDPanel } from './REDPanel'
import { BreakdownView } from './BreakdownView'
import { StructureView } from './StructureView'
import { useTraceMetrics } from '@/hooks/useTraceMetrics'
```

- [ ] **Step 2: Add state for the new tabs and filters**

Add inside the `TraceViewer` component, after existing state declarations:

```typescript
// RED Drilldown state
const [activeTab, setActiveTab] = useState<'breakdown' | 'structure' | 'traces' | 'topology'>('breakdown')
const [traceFilter, setTraceFilter] = useState<'all' | 'errors' | 'slow'>('all')
const [traceSort, setTraceSort] = useState<'time' | 'duration'>('duration')
const drilldownTimeRange = timeRange || '1h'

// RED Metrics
const { services: redServices, loading: redLoading, error: redError } = useTraceMetrics({
  clusterId,
  timeRange: drilldownTimeRange,
  refreshKey,
})
```

- [ ] **Step 3: Replace the page layout**

Replace the entire return block of the `TraceViewer` component with the new layout. The new structure:

1. Header (cluster selector, time range, auto-refresh)
2. RED Panel
3. Tab bar (Breakdown / Structure / Traces / Topology)
4. Tab content

The exact code depends on the current TraceViewer structure. Read the file first to understand the current layout, then wrap the existing content in the new tab structure.

Key changes:
- Add `REDPanel` above the tab bar
- Add tab bar with 4 tabs (Breakdown / Structure / Traces / Topology)
- Wrap existing trace list in "traces" tab
- Wrap existing ServiceGraph in "topology" tab
- Add BreakdownView in "breakdown" tab
- Add StructureView in "structure" tab (requires fetching trace details for the tree)
- Add trace filter controls (All/Errors/Slow) in traces tab

- [ ] **Step 4: Add click handlers for RED panel drilldown**

```typescript
const handleREDClick = (filter: 'all' | 'errors' | 'slow') => {
  setTraceFilter(filter)
  setActiveTab('traces')
}

const handleServiceClick = (serviceName: string) => {
  // Navigate to traces tab with service filter
  setActiveTab('traces')
  // Set the service search in existing trace search
}
```

- [ ] **Step 5: Verify frontend compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/log/TraceViewer.tsx
git commit -m "feat(trace): refactor TraceViewer with RED panel and drilldown tabs"
```

---

## Task 11: Frontend — Update ServiceOverviewPanel

**Files:**
- Modify: `frontend/src/pages/log/ServiceOverviewPanel.tsx`

- [ ] **Step 1: Update ServiceOverviewPanel to use REDMetrics API**

Replace the Prometheus-based metric fetching with the new `fetchREDMetrics` API. Read the file first to understand the current structure, then:

1. Import `fetchREDMetrics` from `@/lib/api`
2. Replace the `/mrboard/trace/v1/ServiceOverview` call with `fetchREDMetrics`
3. Extract RPM, error rate, and P99 duration from the RED metrics response
4. Keep the recent traces fetching from the existing `SearchTraces` call

- [ ] **Step 2: Verify frontend compiles**

Run: `cd /root/mrboard/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/log/ServiceOverviewPanel.tsx
git commit -m "feat(trace): update ServiceOverviewPanel to use REDMetrics API"
```

---

## Task 12: Build & Verify

- [ ] **Step 1: Build backend**

Run: `cd /root/mrboard && go build ./... 2>&1`
Expected: No errors

- [ ] **Step 2: Build frontend**

Run: `cd /root/mrboard/frontend && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Test REDMetrics API manually**

Run: `curl -s "http://localhost:8080/mrboard/trace/v1/REDMetrics?clusterId=YOUR_CLUSTER&start=$(date -d '1 hour ago' +%s)&end=$(date +%s)" | python3 -m json.tool | head -30`
Expected: JSON response with `code: 0` and `data.services` array

- [ ] **Step 4: Test Dependencies API manually**

Run: `curl -s "http://localhost:8080/mrboard/trace/v1/Dependencies?clusterId=YOUR_CLUSTER&start=$(date -d '1 hour ago' +%s)&end=$(date +%s)" | python3 -m json.tool | head -30`
Expected: JSON response with dependency edges (or empty array if no traces)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: traces drilldown complete - RED panel, breakdown, topology from trace data"
```
