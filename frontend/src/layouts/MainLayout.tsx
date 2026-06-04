import { useState, useEffect, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@/types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Server, GitBranch,
  Search, Menu, LogOut, User, ChevronDown,
  ChevronRight, Settings, Cpu,
  Network, Database, HardDrive, Globe,
  Shield, Zap, MonitorDot, BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'

interface NavItem {
  label: string
  icon: ReactNode
  path?: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  // K8s管理
  { label: 'K8S管理', icon: <Server size={18} />, children: [
    { label: '全部集群', icon: <ChevronRight size={14} />, path: '/cluster/list' },
    { label: '我的k8s', icon: <ChevronRight size={14} />, path: '/rbac/myClusterList' },
    { label: '我的收藏', icon: <ChevronRight size={14} />, path: '/favorite/list' },
  ]},
  { label: '集群信息', icon: <MonitorDot size={18} />, children: [
    { label: '节点池', icon: <ChevronRight size={14} />, path: '/k8s/nodepool' },
    { label: '节点[node]', icon: <ChevronRight size={14} />, path: '/k8s/node' },
    { label: '命名空间[ns]', icon: <ChevronRight size={14} />, path: '/k8s/namespace' },
    { label: 'Pod指标', icon: <ChevronRight size={14} />, path: '/k8s/podmetrics' },
    { label: '集群角色绑定', icon: <ChevronRight size={14} />, path: '/k8s/clusterrolebinding' },
    { label: '集群角色', icon: <ChevronRight size={14} />, path: '/k8s/clusterroles' },
    { label: '角色绑定', icon: <ChevronRight size={14} />, path: '/k8s/rolebinding' },
    { label: '角色', icon: <ChevronRight size={14} />, path: '/k8s/roles' },
    { label: '服务帐号', icon: <ChevronRight size={14} />, path: '/k8s/serviceaccounts' },
    { label: '事件中心', icon: <ChevronRight size={14} />, path: '/k8s/event' },
  ]},
  { label: '工作负载', icon: <Cpu size={18} />, children: [
    { label: '无状态[deploy]', icon: <ChevronRight size={14} />, path: '/deploy/list' },
    { label: '有状态[sts]', icon: <ChevronRight size={14} />, path: '/k8s/statefulset' },
    { label: '守护进程集[ds]', icon: <ChevronRight size={14} />, path: '/k8s/daemonset' },
    { label: '任务[job]', icon: <ChevronRight size={14} />, path: '/k8s/job' },
    { label: '定时任务[cron]', icon: <ChevronRight size={14} />, path: '/k8s/cronjob' },
    { label: '容器组[Pod]', icon: <ChevronRight size={14} />, path: '/k8s/pod' },
    { label: '自定义资源[crd]', icon: <ChevronRight size={14} />, path: '/k8s/crd' },
    { label: '自动伸缩[hpa]', icon: <ChevronRight size={14} />, path: '/k8s/hpa' },
    { label: '应用配置[apply]', icon: <ChevronRight size={14} />, path: '/tools/apply-yaml' },
  ]},
  { label: '网络', icon: <Network size={18} />, children: [
    { label: '服务[service]', icon: <ChevronRight size={14} />, path: '/k8s/service' },
    { label: '路由[ingress]', icon: <ChevronRight size={14} />, path: '/k8s/ingress' },
  ]},
  { label: '网关管理', icon: <Globe size={18} />, children: [
    { label: '控制器[gc]', icon: <ChevronRight size={14} />, path: '/k8s/gatewayclass' },
    { label: '网关[gtw]', icon: <ChevronRight size={14} />, path: '/k8s/gateway' },
    { label: 'HTTP路由', icon: <ChevronRight size={14} />, path: '/k8s/httproute' },
    { label: 'GRPC路由', icon: <ChevronRight size={14} />, path: '/k8s/grpcroute' },
    { label: 'TCP路由', icon: <ChevronRight size={14} />, path: '/k8s/tcproute' },
    { label: 'UDP路由', icon: <ChevronRight size={14} />, path: '/k8s/udproute' },
  ]},
  { label: '配置管理', icon: <Database size={18} />, children: [
    { label: '配置项[cm]', icon: <ChevronRight size={14} />, path: '/k8s/configmap' },
    { label: '加密字典[secret]', icon: <ChevronRight size={14} />, path: '/k8s/secret' },
  ]},
  { label: '存储', icon: <HardDrive size={18} />, children: [
    { label: '存储声明[pvc]', icon: <ChevronRight size={14} />, path: '/k8s/pvc' },
    { label: '存储卷[pv]', icon: <ChevronRight size={14} />, path: '/k8s/pv' },
    { label: '存储类', icon: <ChevronRight size={14} />, path: '/k8s/storageclass' },
  ]},
  // 运维管理
  { label: '运维管理', icon: <Settings size={18} />, children: [
    { label: '应用集', icon: <ChevronRight size={14} />, path: '/app/list' },
    { label: '资源克隆', icon: <ChevronRight size={14} />, path: '/tools/clone-resource' },
    { label: '备份管理', icon: <ChevronRight size={14} />, path: '/ops/backup' },
  ]},
  { label: '构建发布', icon: <GitBranch size={18} />, children: [
    { label: '代码发布', icon: <ChevronRight size={14} />, path: '/cicd/list' },
    { label: '阿里云AK', icon: <ChevronRight size={14} />, path: '/cicd/aliyunak' },
    { label: 'Jenkins设置', icon: <ChevronRight size={14} />, path: '/cicd/jenkins' },
    { label: '流水线', icon: <ChevronRight size={14} />, path: '/cicd/pipelines' },
  ]},
  // 可观测性
  { label: '可观测性', icon: <BarChart3 size={18} />, children: [
    { label: '监控面板', icon: <ChevronRight size={14} />, path: '/monitor/dashboard' },
    { label: '指标查看', icon: <ChevronRight size={14} />, path: '/monitor/prometheus' },
    { label: '服务健康', icon: <ChevronRight size={14} />, path: '/monitor/service-health' },
    { label: '日志查询', icon: <ChevronRight size={14} />, path: '/log/loki' },
    { label: '链路追踪', icon: <ChevronRight size={14} />, path: '/log/trace' },
  ]},
  { label: '权限管理', icon: <Shield size={18} />, children: [
    { label: '管理员', icon: <ChevronRight size={14} />, path: '/rbac/adminList' },
    { label: '角色列表', icon: <ChevronRight size={14} />, path: '/rbac/roleList' },
    { label: '目录分组', icon: <ChevronRight size={14} />, path: '/rbac/groupList' },
    { label: '目录结构', icon: <ChevronRight size={14} />, path: '/rbac/nodeList' },
    { label: '集群授权', icon: <ChevronRight size={14} />, path: '/rbac/clusterToUserList' },
    { label: '登录解锁', icon: <ChevronRight size={14} />, path: '/rbac/lockList' },
    { label: '审计日志', icon: <ChevronRight size={14} />, path: '/rbac/auditLogList' },
  ]},
  // 工具
  { label: '搜索', icon: <Search size={18} />, path: '/search' },
  { label: 'AI助手', icon: <Zap size={18} />, path: '/ai/chat' },
]

function SidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const toggle = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {navItems.map(item => {
        if (item.path) {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        }

        const isOpen = openGroups[item.label]
        return (
          <div key={item.label}>
            <button
              onClick={() => toggle(item.label)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && item.children && (
              <div className="ml-4 mt-1 space-y-0.5">
                {item.children.map(child => {
                  const childActive = location.pathname === child.path
                  return (
                    <Link
                      key={child.label}
                      to={child.path!}
                      onClick={onItemClick}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        childActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {child.icon}
                      {child.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Auto-set default clusterId if not in localStorage
  useEffect(() => {
    if (!user) return
    const saved = localStorage.getItem('clusterId')
    if (saved) return
    api<ApiResponse<{ cluster_id: string }[]>>('/mrboard/cluster/v1/List')
      .then(resp => {
        const list = resp.data || []
        if (list.length > 0) {
          localStorage.setItem('clusterId', list[0].cluster_id)
        }
      })
      .catch(() => {})
  }, [user])

  const handleLogout = async () => {
    await logout()
    toast.success('已退出登录')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-gradient-to-b from-slate-900 to-slate-950 text-white">
        <div className="h-14 flex items-center px-5 font-bold text-lg tracking-wide">
          MRBoard
        </div>
        <Separator className="bg-white/10" />
        <SidebarNav />
        <Separator className="bg-white/10" />
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-white/10" />}
            >
              <User size={16} className="mr-2" />
              {user?.username || '用户'}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/rbac/myinfo')}>
                <Settings size={14} className="mr-2" /> 个人信息
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut size={14} className="mr-2" /> 退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 bg-white border-b flex items-center px-4 lg:px-6 gap-4">
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="lg:hidden" />}
            >
              <Menu size={20} />
            </SheetTrigger>
            <div className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                <User size={16} className="mr-2" />
                {user?.username || '用户'}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/rbac/myinfo')}>
                  <Settings size={14} className="mr-2" /> 个人信息
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut size={14} className="mr-2" /> 退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </div>

        <SheetContent side="left" className="w-64 p-0 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="h-14 flex items-center px-5 font-bold text-lg text-white tracking-wide">
            MRBoard
          </div>
          <Separator className="bg-white/10" />
          <SidebarNav />
        </SheetContent>
      </Sheet>
    </div>
  )
}
