import { useState, useCallback, useEffect } from 'react'
import { FilterState, emptyFilterState, parseFilterStateFromURL, filterStateToQueryString } from '@/types/log'

export function useLogFilters() {
  const [filters, setFilters] = useState<FilterState>(() => parseFilterStateFromURL())

  useEffect(() => {
    const qs = filterStateToQueryString(filters)
    const url = new URL(window.location.href)
    url.search = qs ? '?' + qs : ''
    window.history.replaceState({}, '', url.toString())
  }, [filters])

  const toggleLabelValue = useCallback((name: string, value: string, exclude: boolean = false) => {
    setFilters(prev => {
      const target = exclude ? 'excludeLabels' : 'labels'
      const current = prev[target][name] || []
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, [target]: { ...prev[target], [name]: next.length > 0 ? next : undefined } }
    })
  }, [])

  const toggleFieldValue = useCallback((name: string, value: string, exclude: boolean = false) => {
    setFilters(prev => {
      const target = exclude ? 'excludeFields' : 'fields'
      const current = prev[target][name] || []
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      return { ...prev, [target]: { ...prev[target], [name]: next.length > 0 ? next : undefined } }
    })
  }, [])

  const toggleLevel = useCallback((level: string) => {
    setFilters(prev => {
      const next = prev.levels.includes(level) ? prev.levels.filter(l => l !== level) : [...prev.levels, level]
      return { ...prev, levels: next }
    })
  }, [])

  const setSearch = useCallback((search: string) => {
    setFilters(prev => ({ ...prev, search }))
  }, [])

  const setLogql = useCallback((logql: string) => {
    setFilters(prev => ({ ...prev, logql }))
  }, [])

  const removeFilter = useCallback((type: 'label' | 'xLabel' | 'field' | 'xField', name: string, value?: string) => {
    setFilters(prev => {
      const key = type === 'label' ? 'labels' : type === 'xLabel' ? 'excludeLabels' : type === 'field' ? 'fields' : 'excludeFields'
      const current = prev[key][name]
      if (!current) return prev
      if (value) {
        const next = current.filter(v => v !== value)
        return { ...prev, [key]: { ...prev[key], [name]: next.length > 0 ? next : undefined } }
      }
      const { [name]: _, ...rest } = prev[key]
      return { ...prev, [key]: rest }
    })
  }, [])

  const clearAll = useCallback(() => {
    setFilters(emptyFilterState())
  }, [])

  const hasActiveFilters = Object.keys(filters.labels).length > 0
    || Object.keys(filters.excludeLabels).length > 0
    || Object.keys(filters.fields).length > 0
    || Object.keys(filters.excludeFields).length > 0
    || filters.search !== ''

  return { filters, toggleLabelValue, toggleFieldValue, toggleLevel, setSearch, setLogql, removeFilter, clearAll, hasActiveFilters }
}
