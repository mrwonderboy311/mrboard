// metrics.go
package controllers

import (
	"context"
	"fmt"
	"log"

	"mrboard/common"
	m "mrboard/models"

	beego "github.com/beego/beego/v2/server/web"
	"github.com/tidwall/gjson"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

type MetricsController struct {
	beego.Controller
}

func (this *MetricsController) PodList() {
	clusterId := this.GetString("clusterId")
	nameSpace := this.GetString("nameSpace")
	sort := this.GetString("sort") //mem or cpu

	if this.Ctx.Input.Method() == "POST" {
		gp := gjson.ParseBytes(this.Ctx.Input.RequestBody)
		sort = gp.Get("sort").String()
		nameSpace = gp.Get("nameSpace").String()
	}

	xList, err := m.GetPodMetricList(clusterId, nameSpace, sort)
	msg := "success"
	code := 0
	if err != nil {
		code = -1
		msg = err.Error()
	}
	this.Data["json"] = &map[string]interface{}{"code": code, "msg": msg, "count": len(xList), "data": &xList}
	this.ServeJSON()
}

func (this *MetricsController) NodeList() {
	clusterId := this.GetString("clusterId")
	//nameSpace := this.GetString("nameSpace")
	xList, err := m.GetNodeMetricList(clusterId)
	msg := "success"
	code := 0
	if err != nil {
		code = -1
		msg = err.Error()
	}
	this.Data["json"] = &map[string]interface{}{"code": code, "msg": msg, "count": len(xList), "data": &xList}
	this.ServeJSON()
}

func (this *MetricsController) PodUsage() {
	clusterId := this.GetString("clusterId")
	nameSpace := this.GetString("nameSpace")
	podName := this.GetString("podName")
	this.Ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
	this.Ctx.ResponseWriter.Header().Set("Content-Type", "application/json;charset=utf-8")
	metricStr := m.GetPodMetric(clusterId, nameSpace, podName)
	this.Ctx.WriteString(metricStr)
}

func (this *MetricsController) NodeUsage() {
	clusterId := this.GetString("clusterId")
	nodeName := this.GetString("nodeName")
	this.Ctx.ResponseWriter.Header().Set("Access-Control-Allow-Origin", "*")
	this.Ctx.ResponseWriter.Header().Set("Content-Type", "application/json;charset=utf-8")
	metricStr := m.GetNodeMetric(clusterId, nodeName)
	this.Ctx.WriteString(metricStr)
}

// InstallMetrics installs metrics-server in the cluster
func (this *MetricsController) InstallMetrics() {
	clusterId := this.GetString("clusterId")
	if clusterId == "" {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "clusterId required"}
		this.ServeJSON()
		return
	}

	clientset := common.ClientSet(clusterId)
	if clientset == nil {
		this.Data["json"] = &map[string]interface{}{"code": -1, "msg": "连接集群失败"}
		this.ServeJSON()
		return
	}

	ctx := context.Background()
	ns := "kube-system"
	image := "registry.k8s.io/metrics-server/metrics-server:v0.7.1"

	// 1. Create ServiceAccount
	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{Name: "metrics-server", Namespace: ns},
	}
	_, err := clientset.CoreV1().ServiceAccounts(ns).Create(ctx, sa, metav1.CreateOptions{})
	if err != nil && !errors.IsAlreadyExists(err) {
		log.Printf("[Metrics] Create SA error: %v", err)
	}

	// 2. Create ClusterRole
	cr := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{Name: "system:metrics-server"},
		Rules: []rbacv1.PolicyRule{
			{APIGroups: []string{""}, Resources: []string{"nodes/metrics"}, Verbs: []string{"get"}},
			{APIGroups: []string{""}, Resources: []string{"pods", "nodes"}, Verbs: []string{"get", "list", "watch"}},
		},
	}
	_, err = clientset.RbacV1().ClusterRoles().Update(ctx, cr, metav1.UpdateOptions{})
	if err != nil {
		_, err = clientset.RbacV1().ClusterRoles().Create(ctx, cr, metav1.CreateOptions{})
		if err != nil && !errors.IsAlreadyExists(err) {
			log.Printf("[Metrics] Create ClusterRole error: %v", err)
		}
	}

	// 3. Create ClusterRoleBinding
	crb := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: "metrics-server:system:auth-delegator"},
		RoleRef:    rbacv1.RoleRef{APIGroup: "rbac.authorization.k8s.io", Kind: "ClusterRole", Name: "system:auth-delegator"},
		Subjects:   []rbacv1.Subject{{Kind: "ServiceAccount", Name: "metrics-server", Namespace: ns}},
	}
	_, err = clientset.RbacV1().ClusterRoleBindings().Update(ctx, crb, metav1.UpdateOptions{})
	if err != nil {
		_, err = clientset.RbacV1().ClusterRoleBindings().Create(ctx, crb, metav1.CreateOptions{})
		if err != nil && !errors.IsAlreadyExists(err) {
			log.Printf("[Metrics] Create CRB error: %v", err)
		}
	}

	// 4. Create Deployment
	replicas := int32(1)
	dep := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{Name: "metrics-server", Namespace: ns},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{"k8s-app": "metrics-server"},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: map[string]string{"k8s-app": "metrics-server"}},
				Spec: corev1.PodSpec{
					ServiceAccountName:            "metrics-server",
					TerminationGracePeriodSeconds: func() *int64 { v := int64(0); return &v }(),
					Containers: []corev1.Container{{
						Name:  "metrics-server",
						Image: image,
						Args: []string{
							"--cert-dir=/tmp",
							"--secure-port=10250",
							"--kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname",
							"--kubelet-use-node-status-port",
							"--metric-resolution=15s",
						},
						Ports: []corev1.ContainerPort{{ContainerPort: 10250, Name: "https", Protocol: corev1.ProtocolTCP}},
						ReadinessProbe: &corev1.Probe{
							ProbeHandler: corev1.ProbeHandler{
								HTTPGet: &corev1.HTTPGetAction{Path: "/readyz", Port: intstr.FromString("https"), Scheme: corev1.URISchemeHTTPS},
							},
						},
					}},
				},
			},
		},
	}
	_, err = clientset.AppsV1().Deployments(ns).Update(ctx, dep, metav1.UpdateOptions{})
	if err != nil {
		_, err = clientset.AppsV1().Deployments(ns).Create(ctx, dep, metav1.CreateOptions{})
		if err != nil && !errors.IsAlreadyExists(err) {
			log.Printf("[Metrics] Create Deployment error: %v", err)
			this.Data["json"] = &map[string]interface{}{"code": -1, "msg": fmt.Sprintf("创建 Deployment 失败: %v", err)}
			this.ServeJSON()
			return
		}
	}

	// 5. Create Service
	svc := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: "metrics-server", Namespace: ns, Labels: map[string]string{"kubernetes.io/name": "Metrics-server"}},
		Spec: corev1.ServiceSpec{
			Ports:     []corev1.ServicePort{{Port: 443, Protocol: corev1.ProtocolTCP, TargetPort: intstr.FromInt32(10250)}},
			Selector:  map[string]string{"k8s-app": "metrics-server"},
		},
	}
	_, err = clientset.CoreV1().Services(ns).Update(ctx, svc, metav1.UpdateOptions{})
	if err != nil {
		_, err = clientset.CoreV1().Services(ns).Create(ctx, svc, metav1.CreateOptions{})
		if err != nil && !errors.IsAlreadyExists(err) {
			log.Printf("[Metrics] Create Service error: %v", err)
		}
	}

	this.Data["json"] = &map[string]interface{}{"code": 0, "msg": "metrics-server 安装成功，约 30 秒后生效"}
	this.ServeJSON()
}
