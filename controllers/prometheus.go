// prometheus.go — Prometheus metrics exporter for xkube
package controllers

import (
	"github.com/beego/beego/v2/server/web"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// xkube custom metrics
var (
	ClustersTotal = prometheus.NewGauge(prometheus.GaugeOpts{
		Namespace: "mrboard",
		Name:      "clusters_total",
		Help:      "Total number of registered clusters",
	})

	DeploymentsTotal = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Namespace: "mrboard",
		Name:      "deployments_total",
		Help:      "Total number of deployments per cluster",
	}, []string{"cluster"})

	HttpRequestsTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Namespace: "mrboard",
		Name:      "http_requests_total",
		Help:      "Total HTTP requests by method, path, and status",
	}, []string{"method", "path", "status"})

	HttpRequestDuration = prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: "mrboard",
		Name:      "http_request_duration_seconds",
		Help:      "HTTP request duration in seconds",
		Buckets:   []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
	}, []string{"method", "path"})

	ActiveSessions = prometheus.NewGauge(prometheus.GaugeOpts{
		Namespace: "mrboard",
		Name:      "active_sessions",
		Help:      "Number of active user sessions",
	})

	UsersTotal = prometheus.NewGauge(prometheus.GaugeOpts{
		Namespace: "mrboard",
		Name:      "users_total",
		Help:      "Total number of registered users",
	})
)

func init() {
	prometheus.MustRegister(
		ClustersTotal,
		DeploymentsTotal,
		HttpRequestsTotal,
		HttpRequestDuration,
		ActiveSessions,
		UsersTotal,
	)
}

// MetricsHandler serves /metrics for Prometheus scraping
type MetricsHandler struct {
	web.Controller
}

func (c *MetricsHandler) Get() {
	handler := promhttp.Handler()
	handler.ServeHTTP(c.Ctx.ResponseWriter, c.Ctx.Request)
}
