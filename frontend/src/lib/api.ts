const BASE_URL = ''

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...options?.headers,
    },
  })

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('mrboard_user')
    // Don't redirect if already on login page (prevents infinite reload)
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  // Handle 302 redirects — backend redirected to login template, treat as auth failure
  if (res.redirected && res.url.includes('/public/login')) {
    localStorage.removeItem('mrboard_user')
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `API error: ${res.status}`)
  }

  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return res.json()
  }
  return res.text() as unknown as T
}

// Trace RED metrics
export interface REDServiceMetrics {
  serviceName: string
  rate: [number, string][]
  errorRate: [number, string][]
  durationP99: [number, string][]
}

export interface REDMetricsResponse {
  code: number
  data: {
    services: REDServiceMetrics[]
  }
}

export async function fetchREDMetrics(params: {
  clusterId: string
  service?: string
  start: string
  end: string
  step?: string
}): Promise<REDMetricsResponse> {
  const qs = new URLSearchParams({
    clusterId: params.clusterId,
    start: params.start,
    end: params.end,
    ...(params.service && { service: params.service }),
    ...(params.step && { step: params.step }),
  })
  return api<REDMetricsResponse>(`/mrboard/trace/v1/REDMetrics?${qs}`)
}

export async function fetchTraceMetricsQueryRange(params: {
  clusterId: string
  query: string
  start: string
  end: string
  step?: string
}): Promise<{ code: number; data: { resultType: string; result: Array<{ metric: Record<string, string>; values: [number, string][] }> } }> {
  const qs = new URLSearchParams({
    clusterId: params.clusterId,
    query: params.query,
    start: params.start,
    end: params.end,
    ...(params.step && { step: params.step }),
  })
  return api(`/mrboard/trace/v1/MetricsQueryRange?${qs}`)
}
