import { useState, useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import type { ApiResponse } from '@/types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  Shield, Zap, MonitorDot, BarChart3, Brain,
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
    { label: '应用部署', icon: <ChevronRight size={14} />, path: '/deploy/list' },
    { label: '有状态服务部署', icon: <ChevronRight size={14} />, path: '/k8s/statefulset' },
    { label: '守护进程部署', icon: <ChevronRight size={14} />, path: '/k8s/daemonset' },
    { label: '任务', icon: <ChevronRight size={14} />, path: '/k8s/job' },
    { label: '定时任务', icon: <ChevronRight size={14} />, path: '/k8s/cronjob' },
    { label: 'Pod管理', icon: <ChevronRight size={14} />, path: '/k8s/pod' },
    { label: '自定义资源管理', icon: <ChevronRight size={14} />, path: '/k8s/crd' },
    { label: '弹性伸缩', icon: <ChevronRight size={14} />, path: '/k8s/hpa' },
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
    { label: 'Grafana', icon: <ChevronRight size={14} />, path: '/monitor/dashboard' },
    { label: '告警管理', icon: <ChevronRight size={14} />, path: '/alerts' },
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
  { label: 'AI 分析', icon: <Brain size={18} />, path: '/ai/analysis' },
  { label: 'AI助手', icon: <Zap size={18} />, path: '/ai/chat' },
]

/** Smoothly animated collapsible section */
function CollapseContent({ open, children }: { open: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!ref.current) return
    if (open) {
      const h = ref.current.scrollHeight
      setHeight(h)
      // After transition, let content size naturally
      const timer = setTimeout(() => setHeight(undefined), 200)
      return () => clearTimeout(timer)
    } else {
      // Set explicit height first, then collapse
      setHeight(ref.current.scrollHeight)
      requestAnimationFrame(() => setHeight(0))
    }
  }, [open])

  return (
    <div
      ref={ref}
      className="overflow-hidden transition-[height] duration-200 ease-in-out"
      style={{ height: height !== undefined ? height : undefined }}
    >
      {children}
    </div>
  )
}

function SidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  const toggle = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
      {navItems.map(item => {
        if (item.path) {
          const active = location.pathname === item.path
          const isSearch = item.label === '搜索'
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onItemClick}
              className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                active
                  ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium shadow-sm shadow-sidebar-primary/10'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-sidebar-primary" />
              )}
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {isSearch && (
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-600 text-slate-400 bg-slate-800">
                  ⌘K
                </kbd>
              )}
            </Link>
          )
        }

        const isOpen = openGroups[item.label]
        return (
          <div key={item.label}>
            <button
              onClick={() => toggle(item.label)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-150"
            >
              {item.icon}
              <span className="flex-1 text-left tracking-wider text-[11px] text-slate-500 font-semibold uppercase">
                {item.label}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <CollapseContent open={!!isOpen}>
              {item.children && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {item.children.map(child => {
                    const childActive = location.pathname === child.path
                    return (
                      <Link
                        key={child.label}
                        to={child.path!}
                        onClick={onItemClick}
                        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-all duration-150 ${
                          childActive
                            ? 'bg-sidebar-primary/15 text-sidebar-primary font-medium'
                            : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                        }`}
                      >
                        {childActive && (
                          <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-sidebar-primary" />
                        )}
                        {child.icon}
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </CollapseContent>
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

  const userInitial = (user?.username || 'U').charAt(0).toUpperCase()

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="h-14 flex items-center gap-2.5 px-5">
          <div className="w-7 h-7 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
            <Server size={15} className="text-sidebar-primary" />
          </div>
          <span className="font-bold text-[15px] tracking-tight">MRBoard</span>
        </div>
        <Separator className="bg-sidebar-border" />
        <SidebarNav />
        <Separator className="bg-sidebar-border" />
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="w-full justify-start gap-2 text-slate-300 hover:text-white hover:bg-white/10" />}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{user?.username || '用户'}</span>
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
          <header className="h-14 bg-card border-b flex items-center px-4 lg:px-6 gap-4">
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
          <main className="flex-1 overflow-auto p-4 lg:p-6 animate-[fadeInUp_0.3s_ease-out]">
            {children}
          </main>
        </div>

        <SheetContent side="left" className="w-64 p-0 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="h-14 flex items-center px-5 font-bold text-lg text-white tracking-wide">
            MRBoard
          </div>
          <Separator className="bg-sidebar-border" />
          <SidebarNav />
        </SheetContent>
      </Sheet>
    </div>
  )
}
