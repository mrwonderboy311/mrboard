// API response wrapper
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}

// Cluster
export interface Cluster {
  cluster_id: string
  cluster_name: string
  cluster_type: string
  api_server: string
  status: string
  prometheus_url: string
  loki_url: string
  tempo_url: string
  loki_config: string
  grafana_url: string
}

// Deployment
export interface Deployment {
  name: string
  namespace: string
  replicas: number
  available: number
  images: string[]
  labels: Record<string, string>
  status: string
}

// Deploy backend response fields (from Go API)
export interface DeployListItem {
  deployName: string
  nameSpace: string
  podNumber: number
  imageUrl: string
  labels: string
  createTime: string
  updateTime: string
  replicas: number
  availableReplicas: number
}

export interface DeployCondition {
  ctype: string
  status: string
  lastUpdateTime: string
  reason: string
  message: string
}

export interface DeployDetail {
  deployName: string
  nameSpace: string
  createTime: string
  strategy: string
  strategyRollingUpdate: string
  selector: string
  annotations: string
  labels: string
  status: string
  imageUrl: string
  ports: string
  podNumber: number
  conditions: DeployCondition[]
  replicasets: DeployReplicaSet[]
}

export interface DeployReplicaSet {
  replicasetName: string
  imageUrl: string
  createTime: string
}

export interface Pod {
  podName: string
  nameSpace: string
  imgUrl: string
  podPhase: string
  restartCount: number
  podIp: string
  hostIp: string
  nodeName: string
  memUsage: number
  cpuUsage: number
  cpu?: number
  mem?: number
  createTime: string
}

export interface KubeEvent {
  eventType: string
  kind: string
  objName: string
  message: string
  reason: string
  createTime: string
}

export interface Namespace {
  name: string
}

// User/RBAC
export interface User {
  username: string
  role: string
  permissions: string[]
}

export interface Role {
  role_id: string
  role_name: string
  description: string
}

// CI/CD
export interface CicdItem {
  id: number
  cicd_name: string
  appname: string
  cluster_id: string
  namespace: string
  cicd_type: number // 1=阿里云流水线, 2=jenkins
  status: number // 1=成功, 2=运行中, 3=失败
  remarks: string
  last_runtime: string
  createtime: string
}

export interface CicdPipelineConfig {
  id: number
  cicd_id: number
  aliyun_id: string
  organization_id: string
  pipeline_id: string
  jks_id: string
}

export interface PipelineJob {
  id: number
  name: string
  status: string
  startTime: number
  endTime: number
  actions?: PipelineAction[]
}

export interface PipelineAction {
  type: string
  name: string
}

export interface PipelineStageInfo {
  status: string
  jobs: PipelineJob[]
}

export interface PipelineStage {
  stageInfo: PipelineStageInfo
}

export interface PipelineSource {
  data: {
    repo: string
    branch: string
  }
}

export interface PipelineRun {
  pipelineRunId: string
  pipelineId: string
  status: string
  triggerMode: number
  createTime: number
  startTime: number
  endTime: number
  stages: PipelineStage[]
  sources: PipelineSource[]
}

export interface PipelineRunListResponse {
  success: boolean
  errorMessage: string
  totalCount: number
  pipelineRuns: PipelineRun[]
}

export interface PipelineRunResponse {
  success: boolean
  pipelineRun: PipelineRun
}

export interface PipelineLog {
  content: string
  more: boolean
}

export interface JenkinsConfig {
  id: number
  jks_id: string
  jks_url: string
  jks_user: string
  jks_passwd: string
  remarks: string
  createtime: string
}

export interface JenkinsBuild {
  id: number
  status: string
  buildTime: string
  duration: number
  log: string
}

export interface AliyunAK {
  id: number
  aliyun_id: string
  accesskey_id: string
  accesskey_secret: string
  organization_id: string
  remarks: string
  createtime: string
}

export interface AliyunOrganization {
  id: string
  name: string
}

export interface Pipeline {
  pipeline_id: string
  name: string
  status: string
  stages: PipelineStage[]
}

// Wiki
export interface Article {
  id: number
  xcolumn: string
  title: string
  author: string
  updatetime: string
  authkey: string
}

export interface Column {
  xcolumn: string
}

// Prometheus time-series
export interface MetricSeries {
  metric: Record<string, string>
  values: [number, string][]
}

// Auth
export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  status: boolean
  msg?: string
  info?: string
  sessionId?: string
  role?: string
}

// AI Analysis
export interface AnalysisReport {
  summary: string
  severity: 'critical' | 'warning' | 'info'
  root_cause: string
  evidence: Evidence[]
  suggestions: Suggestion[]
  related_incidents: string[]
  raw_response: string
  tokens_used: number
  rounds: number
}

export interface Evidence {
  type: 'log' | 'metric' | 'trace' | 'k8s'
  content: string
  source: string
}

export interface Suggestion {
  action: string
  risk: 'low' | 'medium' | 'high'
  command: string
}

export interface AnalysisHistory {
  id: number
  cluster_id: string
  trigger_type: string
  trigger_id: string
  alert_name: string
  severity: string
  namespace: string
  summary: string
  root_cause: string
  evidence_json: string
  suggestions_json: string
  model_used: string
  tokens_used: number
  rounds: number
  feedback_score: number
  feedback_note: string
  created_at: string
}

export interface LlmConfig {
  id: number
  name: string
  provider: string
  api_url: string
  api_key: string
  model: string
  max_tokens: number
  temperature: number
  is_default: boolean
}
