import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '@/lib/api'
import type { User, LoginRequest, LoginResponse } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (req: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkSession = useCallback(async () => {
    try {
      // Use /public/myinfo as the real auth check (not /public/check which always returns OK)
      const info = await api<{ data: { username: string; role?: string } }>('/public/myinfo')
      if (info.data) {
        const u: User = { username: info.data.username, role: info.data.role || 'admin', permissions: [] }
        setUser(u)
        localStorage.setItem('mrboard_user', JSON.stringify(u))
      } else {
        setUser(null)
        localStorage.removeItem('mrboard_user')
      }
    } catch {
      // Session invalid — clear user state
      setUser(null)
      localStorage.removeItem('mrboard_user')
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (req: LoginRequest) => {
    const params = new URLSearchParams()
    params.append('isajax', '1')
    params.append('username', req.username)
    params.append('password', req.password)
    params.append('src', 'mrboardApp')
    const res = await api<LoginResponse>('/public/login', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    if (!res.status) throw new Error(res.msg || res.info || '登录失败')
    const u: User = { username: req.username, role: res.role || 'admin', permissions: [] }
    setUser(u)
    localStorage.setItem('mrboard_user', JSON.stringify(u))
  }, [])

  const logout = useCallback(async () => {
    try { await api('/public/logout') } catch { /* ignore */ }
    setUser(null)
    localStorage.removeItem('mrboard_user')
  }, [])

  useEffect(() => { checkSession() }, [checkSession])

  // Detect cross-tab logout (storage event fires in OTHER tabs when one tab changes localStorage)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'mrboard_user' && e.newValue === null) {
        setUser(null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Re-validate session when tab regains focus (handles same-tab localStorage clear)
  useEffect(() => {
    const onFocus = () => {
      if (!localStorage.getItem('mrboard_user')) {
        setUser(null)
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
