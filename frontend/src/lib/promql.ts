export function formatCPU(cores: number): string {
  if (cores < 1) return `${Math.round(cores * 1000)}m`
  return `${cores.toFixed(2)} cores`
}

export function formatMemory(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`
}

export function formatNetwork(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(1)} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KiB/s`
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MiB/s`
}

export function formatLatency(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
  return `${seconds.toFixed(2)}s`
}

export function formatRate(rate: number): string {
  return `${rate.toFixed(1)} req/s`
}

export function getUnitFormatter(metric: string): (v: number) => string {
  switch (metric) {
    case 'cpu': return formatCPU
    case 'memory': return formatMemory
    case 'network_receive':
    case 'network_transmit': return formatNetwork
    case 'request_latency_p99': return formatLatency
    case 'request_rate': return formatRate
    default: return (v: number) => String(v)
  }
}
