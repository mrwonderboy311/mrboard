// Log drilldown shared types

export interface DetectedFieldValue {
  value: string
  count: number
}

export interface DetectedField {
  name: string
  type: string
  values: DetectedFieldValue[]
}

export interface LogPattern {
  pattern: string
  count: number
  percentage: number
  sample: string
}

export interface LabelWithValues {
  name: string
  values: DetectedFieldValue[]
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  namespace: string
  pod: string
  container: string
  app: string
  service_name: string
  labels: Record<string, string>
}

export interface HistogramBucket {
  time: number
  total: number
  error: number
  warn: number
  info: number
  debug: number
}

export interface LevelCount {
  level: string
  count: number
}

export interface FilterState {
  labels: Record<string, string[]>
  excludeLabels: Record<string, string[]>
  fields: Record<string, string[]>
  excludeFields: Record<string, string[]>
  levels: string[]
  search: string
  logql: string
}

export function emptyFilterState(): FilterState {
  return {
    labels: {},
    excludeLabels: {},
    fields: {},
    excludeFields: {},
    levels: ['error', 'warn', 'info', 'debug'],
    search: '',
    logql: '',
  }
}

export function filterStateToQueryString(fs: FilterState): string {
  const params = new URLSearchParams()
  for (const [k, vs] of Object.entries(fs.labels)) {
    for (const v of vs) params.append(`label_${k}`, v)
  }
  for (const [k, vs] of Object.entries(fs.excludeLabels)) {
    for (const v of vs) params.append(`xLabel_${k}`, v)
  }
  for (const [k, vs] of Object.entries(fs.fields)) {
    for (const v of vs) params.append(`field_${k}`, v)
  }
  for (const [k, vs] of Object.entries(fs.excludeFields)) {
    for (const v of vs) params.append(`xField_${k}`, v)
  }
  if (fs.levels.length > 0) params.set('levels', fs.levels.join(','))
  if (fs.search) params.set('search', fs.search)
  if (fs.logql) params.set('logql', fs.logql)
  return params.toString()
}

export function parseFilterStateFromURL(): FilterState {
  const params = new URLSearchParams(window.location.search)
  const fs = emptyFilterState()
  for (const [key, val] of params.entries()) {
    if (key.startsWith('label_')) {
      const name = key.slice(6)
      fs.labels[name] = fs.labels[name] || []
      fs.labels[name].push(val)
    } else if (key.startsWith('xLabel_')) {
      const name = key.slice(7)
      fs.excludeLabels[name] = fs.excludeLabels[name] || []
      fs.excludeLabels[name].push(val)
    } else if (key.startsWith('field_')) {
      const name = key.slice(6)
      fs.fields[name] = fs.fields[name] || []
      fs.fields[name].push(val)
    } else if (key.startsWith('xField_')) {
      const name = key.slice(7)
      fs.excludeFields[name] = fs.excludeFields[name] || []
      fs.excludeFields[name].push(val)
    } else if (key === 'levels') {
      fs.levels = val.split(',').filter(Boolean)
    } else if (key === 'search') {
      fs.search = val
    } else if (key === 'logql') {
      fs.logql = val
    }
  }
  return fs
}
