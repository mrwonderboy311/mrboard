import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const STATUS_MAP: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  Running:     { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  Active:      { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  Ready:       { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  Healthy:     { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  Succeeded:   { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  Bound:       { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  Available:   { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  Established: { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  True:        { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
  Pending:     { variant: 'secondary', className: 'bg-amber-50 text-amber-700 border-amber-200/60' },
  Warning:     { variant: 'secondary', className: 'bg-amber-50 text-amber-700 border-amber-200/60' },
  ContainerCreating: { variant: 'secondary', className: 'bg-amber-50 text-amber-700 border-amber-200/60' },
  Terminating: { variant: 'secondary', className: 'bg-amber-50 text-amber-700 border-amber-200/60' },
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
  Inactive:    { variant: 'secondary', className: 'bg-muted text-muted-foreground' },
  Stopped:     { variant: 'secondary', className: 'bg-muted text-muted-foreground' },
  Completed:   { variant: 'secondary', className: 'bg-muted text-muted-foreground' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || { variant: 'outline' as const }
  return (
    <Badge variant={config.variant} className={cn('text-[10px] px-1.5 py-0', config.className, className)}>
      {status}
    </Badge>
  )
}
