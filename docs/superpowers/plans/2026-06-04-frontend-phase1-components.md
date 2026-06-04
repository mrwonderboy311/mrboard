# Frontend Phase 1: Components + Wrappers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add missing shadcn/ui components and create shared wrapper components (PageHeader, DataTable, EmptyState, LoadingSkeleton, StatusBadge) that all pages will use.

**Architecture:** Install shadcn components via CLI, create shared wrappers in `frontend/src/components/shared/`. No existing page changes in this phase — just building the foundation.

**Tech Stack:** React 18, TypeScript, shadcn/ui (base-nova), Tailwind CSS v4, Lucide Icons

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/components/ui/skeleton.tsx` | Create | Loading skeleton primitive |
| `frontend/src/components/ui/pagination.tsx` | Create | Pagination component |
| `frontend/src/components/ui/tooltip.tsx` | Create | Tooltip component |
| `frontend/src/components/ui/switch.tsx` | Create | Switch toggle |
| `frontend/src/components/ui/checkbox.tsx` | Create | Checkbox |
| `frontend/src/components/ui/avatar.tsx` | Create | Avatar component |
| `frontend/src/components/ui/progress.tsx` | Create | Progress bar |
| `frontend/src/components/ui/label.tsx` | Create | Form label |
| `frontend/src/components/ui/scroll-area.tsx` | Create | Scrollable area |
| `frontend/src/components/shared/PageHeader.tsx` | Create | Page title + actions |
| `frontend/src/components/shared/DataTable.tsx` | Create | Table + pagination + skeleton + empty |
| `frontend/src/components/shared/EmptyState.tsx` | Create | Empty state display |
| `frontend/src/components/shared/LoadingSkeleton.tsx` | Create | Table skeleton |
| `frontend/src/components/shared/StatusBadge.tsx` | Create | Unified status badges |

---

## Task 1: Install shadcn/ui components

**Files:**
- Create: `frontend/src/components/ui/skeleton.tsx`
- Create: `frontend/src/components/ui/pagination.tsx`
- Create: `frontend/src/components/ui/tooltip.tsx`
- Create: `frontend/src/components/ui/switch.tsx`
- Create: `frontend/src/components/ui/checkbox.tsx`
- Create: `frontend/src/components/ui/avatar.tsx`
- Create: `frontend/src/components/ui/progress.tsx`
- Create: `frontend/src/components/ui/label.tsx`
- Create: `frontend/src/components/ui/scroll-area.tsx`

**Steps:**

- [ ] **Step 1: Create skeleton component**

Create `frontend/src/components/ui/skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

- [ ] **Step 2: Create pagination component**

Create `frontend/src/components/ui/pagination.tsx`:

```tsx
import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav role="navigation" aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({ className, ...props }, ref) => (
  <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

const PaginationLink = ({ className, isActive, size = "icon", ...props }: { isActive?: boolean; size?: "default" | "sm" | "icon" } & React.ComponentProps<typeof Button>) => (
  <Button aria-current={isActive ? "page" : undefined} variant={isActive ? "outline" : "ghost"} size={size} className={cn(className)} {...props} />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" size="default" className={cn("gap-1 pl-2.5", className)} {...props}>
    <ChevronLeft className="h-4 w-4" />
    <span>上一页</span>
  </PaginationLink>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" size="default" className={cn("gap-1 pr-2.5", className)} {...props}>
    <span>下一页</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis }
```

- [ ] **Step 3: Create tooltip component**

Create `frontend/src/components/ui/tooltip.tsx`:

```tsx
"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

Note: This requires `@radix-ui/react-tooltip`. Install with: `cd frontend && npm install @radix-ui/react-tooltip`

- [ ] **Step 4: Create switch component**

Create `frontend/src/components/ui/switch.tsx`:

```tsx
"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
```

Note: Install with: `cd frontend && npm install @radix-ui/react-switch`

- [ ] **Step 5: Create checkbox component**

Create `frontend/src/components/ui/checkbox.tsx`:

```tsx
"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
```

Note: Install with: `cd frontend && npm install @radix-ui/react-checkbox`

- [ ] **Step 6: Create avatar component**

Create `frontend/src/components/ui/avatar.tsx`:

```tsx
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
```

Note: Install with: `cd frontend && npm install @radix-ui/react-avatar`

- [ ] **Step 7: Create progress component**

Create `frontend/src/components/ui/progress.tsx`:

```tsx
"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
```

Note: Install with: `cd frontend && npm install @radix-ui/react-progress`

- [ ] **Step 8: Create label component**

Create `frontend/src/components/ui/label.tsx`:

```tsx
"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70")

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

Note: Install with: `cd frontend && npm install @radix-ui/react-label class-variance-authority`

- [ ] **Step 9: Create scroll-area component**

Create `frontend/src/components/ui/scroll-area.tsx`:

```tsx
"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
```

Note: Install with: `cd frontend && npm install @radix-ui/react-scroll-area`

- [ ] **Step 10: Install all Radix dependencies**

Run: `cd /root/mrboard/frontend && npm install @radix-ui/react-tooltip @radix-ui/react-switch @radix-ui/react-checkbox @radix-ui/react-avatar @radix-ui/react-progress @radix-ui/react-label @radix-ui/react-scroll-area @radix-ui/react-slot class-variance-authority`

- [ ] **Step 11: Verify build**

Run: `cd /root/mrboard/frontend && npm run build 2>&1 | tail -20`

- [ ] **Step 12: Commit**

```bash
git add frontend/src/components/ui/ frontend/package.json frontend/package-lock.json
git commit -m "feat(ui): add skeleton, pagination, tooltip, switch, checkbox, avatar, progress, label, scroll-area components"
```

---

## Task 2: Create PageHeader component

**Files:**
- Create: `frontend/src/components/shared/PageHeader.tsx`

**Steps:**

- [ ] **Step 1: Create directory**

```bash
mkdir -p /root/mrboard/frontend/src/components/shared
```

- [ ] **Step 2: Create PageHeader**

```tsx
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
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
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/PageHeader.tsx
git commit -m "feat(ui): add PageHeader shared component"
```

---

## Task 3: Create EmptyState component

**Files:**
- Create: `frontend/src/components/shared/EmptyState.tsx`

**Steps:**

- [ ] **Step 1: Create EmptyState**

```tsx
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  children?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/EmptyState.tsx
git commit -m "feat(ui): add EmptyState shared component"
```

---

## Task 4: Create LoadingSkeleton component

**Files:**
- Create: `frontend/src/components/shared/LoadingSkeleton.tsx`

**Steps:**

- [ ] **Step 1: Create LoadingSkeleton**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full">
      {/* Header skeleton */}
      <div className="flex gap-4 py-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-3 border-b border-border/40">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-1/4" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/LoadingSkeleton.tsx
git commit -m "feat(ui): add LoadingSkeleton shared components"
```

---

## Task 5: Create StatusBadge component

**Files:**
- Create: `frontend/src/components/shared/StatusBadge.tsx`

**Steps:**

- [ ] **Step 1: Create StatusBadge**

```tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

const STATUS_MAP: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  // Running / Active / Ready / Healthy
  Running:     { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Active:      { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Ready:       { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Healthy:     { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Succeeded:   { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Bound:       { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Available:   { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  Established: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  True:        { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },

  // Pending / Warning / Starting
  Pending:     { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Warning:     { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  ContainerCreating: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Terminating: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },

  // Failed / Error / CrashLoopBackOff
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

  // Inactive / Disabled
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/StatusBadge.tsx
git commit -m "feat(ui): add StatusBadge shared component"
```

---

## Task 6: Create DataTable component

**Files:**
- Create: `frontend/src/components/shared/DataTable.tsx`

**Steps:**

- [ ] **Step 1: Create DataTable**

```tsx
import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Inbox } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  className?: string
  render: (item: T) => ReactNode
}

export interface PaginationState {
  page: number
  limit: number
  total: number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  pagination?: PaginationState
  onPageChange?: (page: number) => void
  emptyMessage?: string
  emptyIcon?: typeof Inbox
  onRowClick?: (item: T) => void
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  emptyMessage = '暂无数据',
  emptyIcon = Inbox,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={5} columns={columns.length} />
  }

  if (!data || data.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyMessage} />
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, idx) => (
              <TableRow
                key={idx}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map(col => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            共 {pagination.total} 条，第 {pagination.page}/{totalPages} 页
          </span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange?.(Math.max(1, pagination.page - 1))}
                  className={pagination.page <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      isActive={pageNum === pagination.page}
                      onClick={() => onPageChange?.(pageNum)}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange?.(Math.min(totalPages, pagination.page + 1))}
                  className={pagination.page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/DataTable.tsx
git commit -m "feat(ui): add DataTable shared component with pagination"
```

---

## Task 7: Create shared/index.ts barrel export

**Files:**
- Create: `frontend/src/components/shared/index.ts`

**Steps:**

- [ ] **Step 1: Create barrel export**

```typescript
export { PageHeader } from './PageHeader'
export { DataTable } from './DataTable'
export type { Column, PaginationState } from './DataTable'
export { EmptyState } from './EmptyState'
export { LoadingSkeleton, TableSkeleton, CardSkeleton, DetailSkeleton } from './LoadingSkeleton'
export { StatusBadge } from './StatusBadge'
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/shared/index.ts
git commit -m "feat(ui): add shared components barrel export"
```

---

## Verification Checklist

- [ ] All shadcn components render without errors
- [ ] PageHeader shows title + description + children
- [ ] DataTable shows loading skeleton when loading=true
- [ ] DataTable shows empty state when data=[]
- [ ] DataTable shows pagination when total > limit
- [ ] StatusBadge maps Running→green, Failed→red, Pending→yellow
- [ ] EmptyState renders icon + title + description
- [ ] TableSkeleton renders correct number of rows/columns
- [ ] Frontend builds: `cd frontend && npm run build`
