// metrics.go — HTTP request metrics middleware for Beego
package middleware

import (
	"strconv"
	"strings"
	"sync"
	"time"

	"xkube/controllers"

	beego "github.com/beego/beego/v2/server/web"
	bctx "github.com/beego/beego/v2/server/web/context"
)

var metricsStart sync.Map

// MetricsFilter records the start time before request execution
func MetricsFilter(ctx *bctx.Context) {
	metricsStart.Store(ctx, time.Now())
}

// MetricsAfterFilter records request count and duration after execution
func MetricsAfterFilter(ctx *bctx.Context) {
	startRaw, ok := metricsStart.LoadAndDelete(ctx)
	if !ok {
		return
	}
	start := startRaw.(time.Time)

	duration := time.Since(start).Seconds()
	method := ctx.Input.Method()
	path := ctx.Input.URL()
	// Strip query parameters to avoid high cardinality
	if idx := strings.Index(path, "?"); idx != -1 {
		path = path[:idx]
	}
	status := ctx.ResponseWriter.Status
	if status == 0 {
		status = 200
	}

	controllers.HttpRequestsTotal.WithLabelValues(method, path, strconv.Itoa(status)).Inc()
	controllers.HttpRequestDuration.WithLabelValues(method, path).Observe(duration)
}

// RegisterMetricsMiddleware registers Prometheus metrics filters
func RegisterMetricsMiddleware() {
	beego.InsertFilter("*", beego.BeforeExec, MetricsFilter)
	beego.InsertFilter("*", beego.AfterExec, MetricsAfterFilter, beego.WithReturnOnOutput(false))
}
