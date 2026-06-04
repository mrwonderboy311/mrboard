# API Contracts: Prometheus Drilldown Metrics

## 端点列表

| 端点 | 方法 | 说明 |
|------|------|------|
| `/mrboard/prometheus/v1/query_range` | GET | 范围查询（时序数据） |
| `/mrboard/prometheus/v1/label_values` | GET | 查询 label 值（用于筛选器） |

## 1. 范围查询

```
GET /mrboard/prometheus/v1/query_range
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clusterId | string | 是 | 集群 ID |
| metric | string | 是 | 指标名 |
| namespace | string | 否 | 命名空间筛选 |
| pod | string | 否 | Pod 名筛选（支持正则） |
| node | string | 否 | 节点名筛选 |
| start | int64 | 是 | 开始时间戳（Unix 秒） |
| end | int64 | 是 | 结束时间戳（Unix 秒） |
| step | int64 | 否 | 步长（秒），默认 60 |

**响应**:

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "resultType": "matrix",
    "result": [
      {
        "metric": {"pod": "app-1", "namespace": "default"},
        "values": [[1685000000, "0.5"], [1685000060, "0.6"]]
      }
    ]
  }
}
```

**支持的 metric 值**:

| metric | 说明 | 单位 |
|--------|------|------|
| cpu | CPU 使用率 | cores |
| memory | 内存用量 | bytes |
| network_receive | 网络接收速率 | bytes/s |
| network_transmit | 网络发送速率 | bytes/s |
| request_rate | HTTP 请求速率 | req/s |
| request_latency_p99 | P99 请求延迟 | seconds |

## 2. Label 值查询

```
GET /mrboard/prometheus/v1/label_values
```

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clusterId | string | 是 | 集群 ID |
| label | string | 是 | 标签名（namespace, pod, node） |
| match | string | 否 | series selector 过滤 |

**响应**:

```json
{
  "code": 0,
  "msg": "success",
  "data": ["default", "kube-system", "monitoring"]
}
```

## 错误响应

```json
{
  "code": -1,
  "msg": "错误描述"
}
```

| HTTP 状态码 | 场景 |
|-------------|------|
| 200 | 成功（即使 code=-1 也是 200） |
| 400 | 缺少必填参数 |
| 500 | Prometheus 查询失败 |

## 前端单位格式化

| 指标 | 输入（原始值） | 输出格式 |
|------|----------------|----------|
| cpu | 0.5 | `500m` / `0.5 cores` |
| memory | 268435456 | `256 MiB` |
| network | 1048576 | `1.0 MiB/s` |
| latency | 0.125 | `125ms` |
| rate | 150.5 | `150.5 req/s` |
