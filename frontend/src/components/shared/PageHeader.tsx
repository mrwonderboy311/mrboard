import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  children?: ReactNode
}

export function PageHeader({ title, description, eyebrow, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6 animate-[fadeInUp_0.3s_ease-out]">
      <div>
        {eyebrow && (
          <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium bg-primary/5 text-primary border border-primary/10 mb-3">
            {eyebrow}
          </span>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}
