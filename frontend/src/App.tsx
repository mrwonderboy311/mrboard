import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import MainLayout from '@/layouts/MainLayout'
import { Toaster } from '@/components/ui/sonner'
import type { ReactNode } from 'react'

// Pages
const LoginPage = lazy(() => import('@/pages/login/LoginPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const ClusterList = lazy(() => import('@/pages/cluster/ClusterList'))
const ClusterAdd = lazy(() => import('@/pages/cluster/ClusterAdd'))
const ClusterEdit = lazy(() => import('@/pages/cluster/ClusterEdit'))
const DeployList = lazy(() => import('@/pages/deploy/DeployList'))
const DeployDetail = lazy(() => import('@/pages/deploy/DeployDetail'))
const DeployYaml = lazy(() => import('@/pages/deploy/DeployYaml'))
const AdminList = lazy(() => import('@/pages/rbac/AdminList'))
const AdminEdit = lazy(() => import('@/pages/rbac/AdminEdit'))
const RoleList = lazy(() => import('@/pages/rbac/RoleList'))
const RoleToUserList = lazy(() => import('@/pages/rbac/RoleToUserList'))
const RoleToNodeList = lazy(() => import('@/pages/rbac/RoleToNodeList'))
const ClusterToUserList = lazy(() => import('@/pages/rbac/ClusterToUserList'))
const MyClusterList = lazy(() => import('@/pages/rbac/MyClusterList'))
const GroupList = lazy(() => import('@/pages/rbac/GroupList'))
const NodeList = lazy(() => import('@/pages/rbac/NodeList'))
const AuditLogList = lazy(() => import('@/pages/rbac/AuditLogList'))
const LockList = lazy(() => import('@/pages/rbac/LockList'))
const MyInfo = lazy(() => import('@/pages/rbac/MyInfo'))
const ChangePassword = lazy(() => import('@/pages/rbac/ChangePassword'))
const SearchPage = lazy(() => import('@/pages/search/SearchPage'))
const FavoriteList = lazy(() => import('@/pages/favorite/FavoriteList'))
const AppNameList = lazy(() => import('@/pages/app/AppNameList'))
const AppNameAdd = lazy(() => import('@/pages/app/AppNameAdd'))
const AppNameEdit = lazy(() => import('@/pages/app/AppNameEdit'))
const AppDown = lazy(() => import('@/pages/app/AppDown'))
const AIChat = lazy(() => import('@/pages/ai/AIChat'))
const AIAnalysis = lazy(() => import('@/pages/ai/AIAnalysis'))
const ApplyYAML = lazy(() => import('@/pages/tools/ApplyYAML'))
const CloneResource = lazy(() => import('@/pages/tools/CloneResource'))
const GrafanaDashboard = lazy(() => import('@/pages/monitor/GrafanaDashboard'))
const CICDList = lazy(() => import('@/pages/cicd/CICDList'))
const PipelinesIndex = lazy(() => import('@/pages/cicd/PipelinesIndex'))
const PipelinesAdd = lazy(() => import('@/pages/cicd/PipelinesAdd'))
const PipelinesEdit = lazy(() => import('@/pages/cicd/PipelinesEdit'))
const PipelinesDetail = lazy(() => import('@/pages/cicd/PipelinesDetail'))
const PipelinesLog = lazy(() => import('@/pages/cicd/PipelinesLog'))
const JenkinsList = lazy(() => import('@/pages/cicd/JenkinsList'))
const JenkinsJobDetail = lazy(() => import('@/pages/cicd/JenkinsJobDetail'))
const JenkinsLog = lazy(() => import('@/pages/cicd/JenkinsLog'))
const AliyunAKList = lazy(() => import('@/pages/cicd/AliyunAKList'))
const WikiList = lazy(() => import('@/pages/wiki/WikiList'))
const WikiDetail = lazy(() => import('@/pages/wiki/WikiDetail'))
const WikiAdd = lazy(() => import('@/pages/wiki/WikiAdd'))
const WikiEdit = lazy(() => import('@/pages/wiki/WikiEdit'))
const ColumnList = lazy(() => import('@/pages/wiki/ColumnList'))

// K8s Resources
const NodeK8sList = lazy(() => import('@/pages/k8s/NodeList'))
const NodePoolList = lazy(() => import('@/pages/k8s/NodePoolList'))
const NamespaceK8sList = lazy(() => import('@/pages/k8s/NamespaceList'))
const TopPodMetric = lazy(() => import('@/pages/k8s/TopPodMetric'))
const EventK8sList = lazy(() => import('@/pages/k8s/EventList'))
const PodK8sList = lazy(() => import('@/pages/k8s/PodList'))
const PodDetail = lazy(() => import('@/pages/k8s/PodDetail'))
const PodLog = lazy(() => import('@/pages/k8s/PodLog'))
const PodTerminal = lazy(() => import('@/pages/k8s/PodTerminal'))
const NodeDetail = lazy(() => import('@/pages/k8s/NodeDetail'))
const StatefulSetList = lazy(() => import('@/pages/k8s/StatefulSetList'))
const StatefulSetDetail = lazy(() => import('@/pages/k8s/StatefulSetDetail'))
const DaemonSetList = lazy(() => import('@/pages/k8s/DaemonSetList'))
const DaemonSetDetail = lazy(() => import('@/pages/k8s/DaemonSetDetail'))
const JobK8sList = lazy(() => import('@/pages/k8s/JobList'))
const JobDetail = lazy(() => import('@/pages/k8s/JobDetail'))
const CronJobK8sList = lazy(() => import('@/pages/k8s/CronJobList'))
const CronJobDetail = lazy(() => import('@/pages/k8s/CronJobDetail'))
const CrdList = lazy(() => import('@/pages/k8s/CrdList'))
const HpaList = lazy(() => import('@/pages/k8s/HpaList'))
const HpaDetail = lazy(() => import('@/pages/k8s/HpaDetail'))
const ServiceK8sList = lazy(() => import('@/pages/k8s/ServiceList'))
const ServiceDetail = lazy(() => import('@/pages/k8s/ServiceDetail'))
const IngressList = lazy(() => import('@/pages/k8s/IngressList'))
const IngressDetail = lazy(() => import('@/pages/k8s/IngressDetail'))
const GatewayClassList = lazy(() => import('@/pages/k8s/GatewayClassList'))
const GatewayClassDetail = lazy(() => import('@/pages/k8s/GatewayClassDetail'))
const GatewayK8sList = lazy(() => import('@/pages/k8s/GatewayList'))
const GatewayDetail = lazy(() => import('@/pages/k8s/GatewayDetail'))
const HttpRouteList = lazy(() => import('@/pages/k8s/HttpRouteList'))
const HttpRouteDetail = lazy(() => import('@/pages/k8s/HttpRouteDetail'))
const GrpcRouteList = lazy(() => import('@/pages/k8s/GrpcRouteList'))
const GrpcRouteDetail = lazy(() => import('@/pages/k8s/GrpcRouteDetail'))
const TcpRouteList = lazy(() => import('@/pages/k8s/TcpRouteList'))
const TcpRouteDetail = lazy(() => import('@/pages/k8s/TcpRouteDetail'))
const UdpRouteList = lazy(() => import('@/pages/k8s/UdpRouteList'))
const UdpRouteDetail = lazy(() => import('@/pages/k8s/UdpRouteDetail'))
const ConfigMapList = lazy(() => import('@/pages/k8s/ConfigMapList'))
const ConfigMapDetail = lazy(() => import('@/pages/k8s/ConfigMapDetail'))
const SecretK8sList = lazy(() => import('@/pages/k8s/SecretList'))
const SecretDetail = lazy(() => import('@/pages/k8s/SecretDetail'))
const PvcList = lazy(() => import('@/pages/k8s/PvcList'))
const PvcDetail = lazy(() => import('@/pages/k8s/PvcDetail'))
const PvList = lazy(() => import('@/pages/k8s/PvList'))
const PvDetail = lazy(() => import('@/pages/k8s/PvDetail'))
const StorageClassList = lazy(() => import('@/pages/k8s/StorageClassList'))
const ClusterRoleBindingList = lazy(() => import('@/pages/k8s/ClusterRoleBindingList'))
const ClusterRolesList = lazy(() => import('@/pages/k8s/ClusterRolesList'))
const RoleBindingList = lazy(() => import('@/pages/k8s/RoleBindingList'))
const RolesK8sList = lazy(() => import('@/pages/k8s/RolesList'))
const ServiceAccountsK8sList = lazy(() => import('@/pages/k8s/ServiceAccountsList'))

// Create pages
const DeployCreate = lazy(() => import('@/pages/deploy/DeployCreate'))
const DeployCreateByYaml = lazy(() => import('@/pages/deploy/DeployCreateByYaml'))
const StatefulSetCreate = lazy(() => import('@/pages/k8s/StatefulSetCreate'))
const CronJobCreate = lazy(() => import('@/pages/k8s/CronJobCreate'))
const ServiceCreate = lazy(() => import('@/pages/k8s/ServiceCreate'))
const IngressCreate = lazy(() => import('@/pages/k8s/IngressCreate'))
const ConfigMapCreate = lazy(() => import('@/pages/k8s/ConfigMapCreate'))
const SecretCreate = lazy(() => import('@/pages/k8s/SecretCreate'))
const HpaCreate = lazy(() => import('@/pages/k8s/HpaCreate'))
const GatewayCreate = lazy(() => import('@/pages/k8s/GatewayCreate'))
const HttpRouteCreate = lazy(() => import('@/pages/k8s/HttpRouteCreate'))
const GrpcRouteCreate = lazy(() => import('@/pages/k8s/GrpcRouteCreate'))
const TcpRouteCreate = lazy(() => import('@/pages/k8s/TcpRouteCreate'))
const UdpRouteCreate = lazy(() => import('@/pages/k8s/UdpRouteCreate'))
const NamespaceCreate = lazy(() => import('@/pages/k8s/NamespaceCreate'))

// Create-by-YAML pages
const ConfigMapCreateByYaml = lazy(() => import('@/pages/k8s/ConfigMapCreateByYaml'))
const SecretCreateByYaml = lazy(() => import('@/pages/k8s/SecretCreateByYaml'))
const ServiceCreateByYaml = lazy(() => import('@/pages/k8s/ServiceCreateByYaml'))
const IngressCreateByYaml = lazy(() => import('@/pages/k8s/IngressCreateByYaml'))
const PvCreateByYaml = lazy(() => import('@/pages/k8s/PvCreateByYaml'))
const PvcCreateByYaml = lazy(() => import('@/pages/k8s/PvcCreateByYaml'))

// YAML view pages
const StatefulSetYaml = lazy(() => import('@/pages/k8s/StatefulSetYaml'))
const DaemonSetYaml = lazy(() => import('@/pages/k8s/DaemonSetYaml'))
const JobYaml = lazy(() => import('@/pages/k8s/JobYaml'))
const CronJobYaml = lazy(() => import('@/pages/k8s/CronJobYaml'))
const PodYaml = lazy(() => import('@/pages/k8s/PodYaml'))
const NodeYaml = lazy(() => import('@/pages/k8s/NodeYaml'))
const NamespaceYaml = lazy(() => import('@/pages/k8s/NamespaceYaml'))
const ServiceYaml = lazy(() => import('@/pages/k8s/ServiceYaml'))
const IngressYaml = lazy(() => import('@/pages/k8s/IngressYaml'))
const GatewayClassYaml = lazy(() => import('@/pages/k8s/GatewayClassYaml'))
const GatewayYaml = lazy(() => import('@/pages/k8s/GatewayYaml'))
const HttpRouteYaml = lazy(() => import('@/pages/k8s/HttpRouteYaml'))
const GrpcRouteYaml = lazy(() => import('@/pages/k8s/GrpcRouteYaml'))
const TcpRouteYaml = lazy(() => import('@/pages/k8s/TcpRouteYaml'))
const UdpRouteYaml = lazy(() => import('@/pages/k8s/UdpRouteYaml'))
const PvcYaml = lazy(() => import('@/pages/k8s/PvcYaml'))
const PvYaml = lazy(() => import('@/pages/k8s/PvYaml'))
const StorageClassYaml = lazy(() => import('@/pages/k8s/StorageClassYaml'))
const StorageClassDetail = lazy(() => import('@/pages/k8s/StorageClassDetail'))
const ClusterRoleBindingYaml = lazy(() => import('@/pages/k8s/ClusterRoleBindingYaml'))
const ClusterRolesYaml = lazy(() => import('@/pages/k8s/ClusterRolesYaml'))
const RoleBindingYaml = lazy(() => import('@/pages/k8s/RoleBindingYaml'))
const RolesYaml = lazy(() => import('@/pages/k8s/RolesYaml'))
const ServiceAccountsYaml = lazy(() => import('@/pages/k8s/ServiceAccountsYaml'))
const CrdYaml = lazy(() => import('@/pages/k8s/CrdYaml'))
const HpaYaml = lazy(() => import('@/pages/k8s/HpaYaml'))
const ReplicaSetYaml = lazy(() => import('@/pages/k8s/ReplicaSetYaml'))

// Misc
const CreateBackup = lazy(() => import('@/pages/ops/CreateBackup'))
const NamespaceResLimit = lazy(() => import('@/pages/k8s/NamespaceResLimit'))

// Ops
const BackupList = lazy(() => import('@/pages/ops/BackupList'))

// Log/Trace — now via Grafana

// Alert
const AlertDashboard = lazy(() => import('@/pages/alerts/AlertDashboard'))

function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-muted-foreground">加载中...</div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout><HomePage /></MainLayout>
          </ProtectedRoute>
        } />

        {/* Cluster */}
        <Route path="/cluster/list" element={
          <ProtectedRoute><MainLayout><ClusterList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cluster/add" element={
          <ProtectedRoute><MainLayout><ClusterAdd /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cluster/edit/:id" element={
          <ProtectedRoute><MainLayout><ClusterEdit /></MainLayout></ProtectedRoute>
        } />

        {/* Deploy */}
        <Route path="/deploy/list" element={
          <ProtectedRoute><MainLayout><DeployList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/deploy/detail" element={
          <ProtectedRoute><MainLayout><DeployDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/deploy/yaml" element={
          <ProtectedRoute><MainLayout><DeployYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/deploy/create" element={
          <ProtectedRoute><MainLayout><DeployCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/deploy/create-by-yaml" element={
          <ProtectedRoute><MainLayout><DeployCreateByYaml /></MainLayout></ProtectedRoute>
        } />

        {/* RBAC */}
        <Route path="/rbac/adminList" element={
          <ProtectedRoute><MainLayout><AdminList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/adminEdit/:id" element={
          <ProtectedRoute><MainLayout><AdminEdit /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/adminAdd" element={
          <ProtectedRoute><MainLayout><AdminEdit /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/roleList" element={
          <ProtectedRoute><MainLayout><RoleList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/roleToUserList" element={
          <ProtectedRoute><MainLayout><RoleToUserList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/roleToNodeList" element={
          <ProtectedRoute><MainLayout><RoleToNodeList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/clusterToUserList" element={
          <ProtectedRoute><MainLayout><ClusterToUserList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/myClusterList" element={
          <ProtectedRoute><MainLayout><MyClusterList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/groupList" element={
          <ProtectedRoute><MainLayout><GroupList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/nodeList" element={
          <ProtectedRoute><MainLayout><NodeList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/auditLogList" element={
          <ProtectedRoute><MainLayout><AuditLogList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/lockList" element={
          <ProtectedRoute><MainLayout><LockList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/myinfo" element={
          <ProtectedRoute><MainLayout><MyInfo /></MainLayout></ProtectedRoute>
        } />
        <Route path="/rbac/changepassword" element={
          <ProtectedRoute><MainLayout><ChangePassword /></MainLayout></ProtectedRoute>
        } />

        {/* Search */}
        <Route path="/search" element={
          <ProtectedRoute><MainLayout><SearchPage /></MainLayout></ProtectedRoute>
        } />

        {/* Favorite */}
        <Route path="/favorite/list" element={
          <ProtectedRoute><MainLayout><FavoriteList /></MainLayout></ProtectedRoute>
        } />

        {/* App */}
        <Route path="/app/list" element={
          <ProtectedRoute><MainLayout><AppNameList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/app/add" element={
          <ProtectedRoute><MainLayout><AppNameAdd /></MainLayout></ProtectedRoute>
        } />
        <Route path="/app/edit/:id" element={
          <ProtectedRoute><MainLayout><AppNameEdit /></MainLayout></ProtectedRoute>
        } />
        <Route path="/app/down" element={
          <ProtectedRoute><MainLayout><AppDown /></MainLayout></ProtectedRoute>
        } />

        {/* AI */}
        <Route path="/ai/chat" element={
          <ProtectedRoute><MainLayout><AIChat /></MainLayout></ProtectedRoute>
        } />
        <Route path="/ai/analysis" element={
          <ProtectedRoute><MainLayout><AIAnalysis /></MainLayout></ProtectedRoute>
        } />

        {/* Tools */}
        <Route path="/tools/apply-yaml" element={
          <ProtectedRoute><MainLayout><ApplyYAML /></MainLayout></ProtectedRoute>
        } />
        <Route path="/tools/clone-resource" element={
          <ProtectedRoute><MainLayout><CloneResource /></MainLayout></ProtectedRoute>
        } />

        {/* Monitor — Grafana embedded */}
        <Route path="/monitor/dashboard" element={
          <ProtectedRoute><MainLayout><GrafanaDashboard /></MainLayout></ProtectedRoute>
        } />
        <Route path="/monitor/prometheus" element={
          <ProtectedRoute><MainLayout><GrafanaDashboard /></MainLayout></ProtectedRoute>
        } />
        <Route path="/monitor/service-health" element={
          <ProtectedRoute><MainLayout><GrafanaDashboard /></MainLayout></ProtectedRoute>
        } />

        {/* CI/CD */}
        <Route path="/cicd/list" element={
          <ProtectedRoute><MainLayout><CICDList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cicd/pipelines" element={
          <ProtectedRoute><MainLayout><PipelinesIndex /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cicd/pipelines/add" element={
          <ProtectedRoute><MainLayout><PipelinesAdd /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cicd/pipelines/edit" element={
          <ProtectedRoute><MainLayout><PipelinesEdit /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cicd/pipelines/detail" element={
          <ProtectedRoute><MainLayout><PipelinesDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cicd/pipelines/log" element={
          <ProtectedRoute><MainLayout><PipelinesLog /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cicd/jenkins" element={
          <ProtectedRoute><MainLayout><JenkinsList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cicd/jenkins/detail" element={
          <ProtectedRoute><MainLayout><JenkinsJobDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cicd/jenkins/log" element={
          <ProtectedRoute><MainLayout><JenkinsLog /></MainLayout></ProtectedRoute>
        } />
        <Route path="/cicd/aliyunak" element={
          <ProtectedRoute><MainLayout><AliyunAKList /></MainLayout></ProtectedRoute>
        } />

        {/* Wiki */}
        <Route path="/wiki/list" element={
          <ProtectedRoute><MainLayout><WikiList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/wiki/detail/:id" element={
          <ProtectedRoute><MainLayout><WikiDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/wiki/add" element={
          <ProtectedRoute><MainLayout><WikiAdd /></MainLayout></ProtectedRoute>
        } />
        <Route path="/wiki/edit/:id" element={
          <ProtectedRoute><MainLayout><WikiEdit /></MainLayout></ProtectedRoute>
        } />
        <Route path="/wiki/columns" element={
          <ProtectedRoute><MainLayout><ColumnList /></MainLayout></ProtectedRoute>
        } />

        {/* K8s Resources */}
        <Route path="/k8s/node" element={
          <ProtectedRoute><MainLayout><NodeK8sList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/nodepool" element={
          <ProtectedRoute><MainLayout><NodePoolList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/namespace" element={
          <ProtectedRoute><MainLayout><NamespaceK8sList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/podmetrics" element={
          <ProtectedRoute><MainLayout><TopPodMetric /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/event" element={
          <ProtectedRoute><MainLayout><EventK8sList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/pod" element={
          <ProtectedRoute><MainLayout><PodK8sList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/statefulset" element={
          <ProtectedRoute><MainLayout><StatefulSetList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/daemonset" element={
          <ProtectedRoute><MainLayout><DaemonSetList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/job" element={
          <ProtectedRoute><MainLayout><JobK8sList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/cronjob" element={
          <ProtectedRoute><MainLayout><CronJobK8sList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/crd" element={
          <ProtectedRoute><MainLayout><CrdList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/hpa" element={
          <ProtectedRoute><MainLayout><HpaList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/hpa/detail" element={
          <ProtectedRoute><MainLayout><HpaDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/service" element={
          <ProtectedRoute><MainLayout><ServiceK8sList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/ingress" element={
          <ProtectedRoute><MainLayout><IngressList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/gatewayclass" element={
          <ProtectedRoute><MainLayout><GatewayClassList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/gateway" element={
          <ProtectedRoute><MainLayout><GatewayK8sList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/httproute" element={
          <ProtectedRoute><MainLayout><HttpRouteList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/grpcroute" element={
          <ProtectedRoute><MainLayout><GrpcRouteList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/tcproute" element={
          <ProtectedRoute><MainLayout><TcpRouteList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/udproute" element={
          <ProtectedRoute><MainLayout><UdpRouteList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/configmap" element={
          <ProtectedRoute><MainLayout><ConfigMapList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/secret" element={
          <ProtectedRoute><MainLayout><SecretK8sList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/pvc" element={
          <ProtectedRoute><MainLayout><PvcList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/pv" element={
          <ProtectedRoute><MainLayout><PvList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/storageclass" element={
          <ProtectedRoute><MainLayout><StorageClassList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/clusterrolebinding" element={
          <ProtectedRoute><MainLayout><ClusterRoleBindingList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/clusterroles" element={
          <ProtectedRoute><MainLayout><ClusterRolesList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/rolebinding" element={
          <ProtectedRoute><MainLayout><RoleBindingList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/roles" element={
          <ProtectedRoute><MainLayout><RolesK8sList /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/serviceaccounts" element={
          <ProtectedRoute><MainLayout><ServiceAccountsK8sList /></MainLayout></ProtectedRoute>
        } />

        {/* K8s Create Pages */}
        <Route path="/k8s/statefulset/create" element={
          <ProtectedRoute><MainLayout><StatefulSetCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/cronjob/create" element={
          <ProtectedRoute><MainLayout><CronJobCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/service/create" element={
          <ProtectedRoute><MainLayout><ServiceCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/ingress/create" element={
          <ProtectedRoute><MainLayout><IngressCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/configmap/create" element={
          <ProtectedRoute><MainLayout><ConfigMapCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/secret/create" element={
          <ProtectedRoute><MainLayout><SecretCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/hpa/create" element={
          <ProtectedRoute><MainLayout><HpaCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/gateway/create" element={
          <ProtectedRoute><MainLayout><GatewayCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/httproute/create" element={
          <ProtectedRoute><MainLayout><HttpRouteCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/grpcroute/create" element={
          <ProtectedRoute><MainLayout><GrpcRouteCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/tcproute/create" element={
          <ProtectedRoute><MainLayout><TcpRouteCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/udproute/create" element={
          <ProtectedRoute><MainLayout><UdpRouteCreate /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/namespace/create" element={
          <ProtectedRoute><MainLayout><NamespaceCreate /></MainLayout></ProtectedRoute>
        } />

        {/* K8s Create-by-YAML Pages */}
        <Route path="/k8s/configmap/create-yaml" element={
          <ProtectedRoute><MainLayout><ConfigMapCreateByYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/secret/create-yaml" element={
          <ProtectedRoute><MainLayout><SecretCreateByYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/service/create-yaml" element={
          <ProtectedRoute><MainLayout><ServiceCreateByYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/ingress/create-yaml" element={
          <ProtectedRoute><MainLayout><IngressCreateByYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/pv/create-yaml" element={
          <ProtectedRoute><MainLayout><PvCreateByYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/pvc/create-yaml" element={
          <ProtectedRoute><MainLayout><PvcCreateByYaml /></MainLayout></ProtectedRoute>
        } />

        {/* K8s Detail Pages */}
        <Route path="/pod/detail" element={
          <ProtectedRoute><MainLayout><PodDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/pod/log" element={
          <ProtectedRoute><MainLayout><PodLog /></MainLayout></ProtectedRoute>
        } />
        <Route path="/pod/terminal" element={
          <ProtectedRoute><MainLayout><PodTerminal /></MainLayout></ProtectedRoute>
        } />
        <Route path="/node/detail" element={
          <ProtectedRoute><MainLayout><NodeDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/statefulset/detail" element={
          <ProtectedRoute><MainLayout><StatefulSetDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/daemonset/detail" element={
          <ProtectedRoute><MainLayout><DaemonSetDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/job/detail" element={
          <ProtectedRoute><MainLayout><JobDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/cronjob/detail" element={
          <ProtectedRoute><MainLayout><CronJobDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/service/detail" element={
          <ProtectedRoute><MainLayout><ServiceDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/ingress/detail" element={
          <ProtectedRoute><MainLayout><IngressDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/gatewayclass/detail" element={
          <ProtectedRoute><MainLayout><GatewayClassDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/gateway/detail" element={
          <ProtectedRoute><MainLayout><GatewayDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/httproute/detail" element={
          <ProtectedRoute><MainLayout><HttpRouteDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/grpcroute/detail" element={
          <ProtectedRoute><MainLayout><GrpcRouteDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/tcproute/detail" element={
          <ProtectedRoute><MainLayout><TcpRouteDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/udproute/detail" element={
          <ProtectedRoute><MainLayout><UdpRouteDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/configmap/detail" element={
          <ProtectedRoute><MainLayout><ConfigMapDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/secret/detail" element={
          <ProtectedRoute><MainLayout><SecretDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/pvc/detail" element={
          <ProtectedRoute><MainLayout><PvcDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/pv/detail" element={
          <ProtectedRoute><MainLayout><PvDetail /></MainLayout></ProtectedRoute>
        } />

        {/* K8s YAML View Pages */}
        <Route path="/k8s/statefulset/yaml" element={
          <ProtectedRoute><MainLayout><StatefulSetYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/daemonset/yaml" element={
          <ProtectedRoute><MainLayout><DaemonSetYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/job/yaml" element={
          <ProtectedRoute><MainLayout><JobYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/cronjob/yaml" element={
          <ProtectedRoute><MainLayout><CronJobYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/pod/yaml" element={
          <ProtectedRoute><MainLayout><PodYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/node/yaml" element={
          <ProtectedRoute><MainLayout><NodeYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/namespace/yaml" element={
          <ProtectedRoute><MainLayout><NamespaceYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/service/yaml" element={
          <ProtectedRoute><MainLayout><ServiceYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/ingress/yaml" element={
          <ProtectedRoute><MainLayout><IngressYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/gatewayclass/yaml" element={
          <ProtectedRoute><MainLayout><GatewayClassYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/gateway/yaml" element={
          <ProtectedRoute><MainLayout><GatewayYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/httproute/yaml" element={
          <ProtectedRoute><MainLayout><HttpRouteYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/grpcroute/yaml" element={
          <ProtectedRoute><MainLayout><GrpcRouteYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/tcproute/yaml" element={
          <ProtectedRoute><MainLayout><TcpRouteYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/udproute/yaml" element={
          <ProtectedRoute><MainLayout><UdpRouteYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/pvc/yaml" element={
          <ProtectedRoute><MainLayout><PvcYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/pv/yaml" element={
          <ProtectedRoute><MainLayout><PvYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/storageclass/yaml" element={
          <ProtectedRoute><MainLayout><StorageClassYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/storageclass/detail" element={
          <ProtectedRoute><MainLayout><StorageClassDetail /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/clusterrolebinding/yaml" element={
          <ProtectedRoute><MainLayout><ClusterRoleBindingYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/clusterroles/yaml" element={
          <ProtectedRoute><MainLayout><ClusterRolesYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/rolebinding/yaml" element={
          <ProtectedRoute><MainLayout><RoleBindingYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/roles/yaml" element={
          <ProtectedRoute><MainLayout><RolesYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/serviceaccounts/yaml" element={
          <ProtectedRoute><MainLayout><ServiceAccountsYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/crd/yaml" element={
          <ProtectedRoute><MainLayout><CrdYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/hpa/yaml" element={
          <ProtectedRoute><MainLayout><HpaYaml /></MainLayout></ProtectedRoute>
        } />
        <Route path="/k8s/replicaset/yaml" element={
          <ProtectedRoute><MainLayout><ReplicaSetYaml /></MainLayout></ProtectedRoute>
        } />

        {/* K8s Misc */}
        <Route path="/k8s/namespace/reslimit" element={
          <ProtectedRoute><MainLayout><NamespaceResLimit /></MainLayout></ProtectedRoute>
        } />

        {/* Ops */}
        <Route path="/ops/backup/create" element={
          <ProtectedRoute><MainLayout><CreateBackup /></MainLayout></ProtectedRoute>
        } />
        <Route path="/ops/backup" element={
          <ProtectedRoute><MainLayout><BackupList /></MainLayout></ProtectedRoute>
        } />

        {/* Alert */}
        <Route path="/alerts" element={
          <ProtectedRoute><MainLayout><AlertDashboard /></MainLayout></ProtectedRoute>
        } />

        {/* Log — Grafana embedded */}
        <Route path="/log/loki" element={
          <ProtectedRoute><MainLayout><GrafanaDashboard /></MainLayout></ProtectedRoute>
        } />
        <Route path="/log/trace" element={
          <ProtectedRoute><MainLayout><GrafanaDashboard /></MainLayout></ProtectedRoute>
        } />
        <Route path="/log/trace/detail" element={
          <ProtectedRoute><MainLayout><GrafanaDashboard /></MainLayout></ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  )
}
