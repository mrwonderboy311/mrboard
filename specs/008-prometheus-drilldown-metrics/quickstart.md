# Quickstart: Prometheus Drilldown Metrics

## 前置条件

1. xkube 已部署并运行
2. 目标 K8s 集群已部署 Prometheus（kubelet/cAdvisor 指标采集）
3. 集群的 Prometheus 地址从 xkube 后端 Pod 可达

## 验证步骤

### 1. 配置 Prometheus 地址

1. 登录 xkube
2. 进入集群管理 → 编辑集群
3. 填写 Prometheus 地址（如 `http://kps-kube-prometheus-stack-prometheus.observability.svc.cluster.local:9090`）
4. 保存

### 2. 访问指标页面

1. 侧边菜单 → 监控 → Prometheus 指标
2. 页面应自动加载集群概览
3. 应看到 CPU、内存、网络三组时序折线图

### 3. 测试筛选

1. 选择一个命名空间 → 图表应刷新为该 NS 下的数据
2. 切换时间范围为"最近 6 小时" → 图表应更新
3. 开启自动刷新 → 等待 30 秒 → 图表应自动更新

### 4. 测试下钻

1. 在资源列表中点击一个节点名称 → 页面应下钻到节点视图
2. 面包屑应显示"集群概览 > 节点名称"
3. 点击一个 Pod → 页面应下钻到 Pod 详情
4. 点击面包屑"集群概览" → 应返回概览

### 5. 测试应用指标

1. 选择一个有服务流量的命名空间
2. 应看到请求速率和 P99 延迟图表
3. 选择一个具体服务 → 图表应刷新

### 6. 测试错误场景

1. 清空集群的 Prometheus 地址 → 页面应显示"请先配置 Prometheus 地址"
2. 填写一个不可达的地址 → 页面应显示连接错误提示

## 常见问题

**Q: 图表显示"暂无数据"**
A: 确认 Prometheus 中有 `container_cpu_usage_seconds_total` 等 kubelet 指标

**Q: 应用指标为空**
A: 确认 Prometheus 中有 `http_requests_total` 等应用指标，或已部署 Tempo metrics-generator

**Q: 查询超时**
A: 缩小时间范围，或检查 Prometheus 查询性能
