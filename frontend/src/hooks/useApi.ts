import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>(url: string | null, options?: RequestInit) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: !!url,
    error: null,
  })

  const refetch = useCallback(async () => {
    if (!url) return
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const data = await api<T>(url, options)
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState({ data: null, loading: false, error: (err as Error).message })
    }
  }, [url, options])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { ...state, refetch }
}
