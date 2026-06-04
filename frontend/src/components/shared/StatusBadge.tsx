import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const STATUS_MAP: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  Running:     { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Active:      { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Ready:       { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Healthy:     { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Succeeded:   { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Bound:       { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Available:   { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Established: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  True:        { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Pending:     { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Warning:     { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  ContainerCreating: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Terminating: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Failed:           { variant: 'destructive' },
  Error:            { variant: 'destructive' },
  CrashLoopBackOff: { variant: 'destructive' },
  ImagePullBackOff: { variant: 'destructive' },
  ErrImagePull:     { variant: 'destructive' },
  OOMKilled:        { variant: 'destructive' },
  Evicted:          { variant: 'destructive' },
  Unknown:          { variant: 'destructive' },
  Unhealthy:        { variant: 'destructive' },
  False:            { variant: 'destructive' },
  Inactive:    { variant: 'secondary', className: 'bg-gray-100 text-gray-600' },
  Stopped:     { variant: 'secondary', className: 'bg-gray-100 text-gray-600' },
  Completed:   { variant: 'secondary', className: 'bg-gray-100 text-gray-600' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || { variant: 'outline' as const }
  return (
    <Badge variant={config.variant} className={cn('text-[10px] px-1.5 py-0', config.className, className)}>
      {status}
    </Badge>
  )
}
