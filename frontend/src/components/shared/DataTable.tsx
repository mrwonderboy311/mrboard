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
  /** Display mode: 'table' for traditional table, 'cards' for card-wrapped rows */
  variant?: 'table' | 'cards'
}

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  emptyMessage = '暂无数据',
  emptyIcon = Inbox,
  onRowClick,
  variant = 'table',
}: DataTableProps<T>) {
  if (loading) {
    return <TableSkeleton rows={5} columns={columns.length} />
  }

  if (!data || data.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyMessage} />
  }

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1

  if (variant === 'cards') {
    // Split columns: all except last (actions) go in the main grid
    const contentCols = columns.slice(0, -1)
    const actionCol = columns[columns.length - 1]
    const hasActions = actionCol?.key === 'actions'

    return (
      <div>
        <div className="space-y-2">
          {/* Card rows */}
          {data.map((item, idx) => (
            <div
              key={idx}
              className={`group rounded-xl border border-border/60 bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                onRowClick ? 'cursor-pointer hover:border-primary/30 hover:-translate-y-[1px] active:scale-[0.998]' : ''
              }`}
              onClick={() => onRowClick?.(item)}
            >
              <div className="flex items-center gap-4 px-4 py-3">
                {/* Content grid */}
                <div className="flex-1 min-w-0 grid gap-x-4 gap-y-1 items-center"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(contentCols.length, 5)}, minmax(0, 1fr))`,
                  }}>
                  {contentCols.map(col => (
                    <div key={col.key} className={`text-sm min-w-0 ${col.className || ''}`}>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5 md:hidden">{col.header}</div>
                      {col.render(item)}
                    </div>
                  ))}
                </div>
                {/* Actions - fixed right */}
                {hasActions && (
                  <div className="shrink-0" onClick={e => e.stopPropagation()}>
                    {actionCol.render(item)}
                  </div>
                )}
              </div>
            </div>
          ))}
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
                  if (totalPages <= 5) pageNum = i + 1
                  else if (pagination.page <= 3) pageNum = i + 1
                  else if (pagination.page >= totalPages - 2) pageNum = totalPages - 4 + i
                  else pageNum = pagination.page - 2 + i
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink isActive={pageNum === pagination.page} onClick={() => onPageChange?.(pageNum)}>
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

  // Default table variant
  return (
    <div>
      <div className="rounded-xl overflow-hidden shadow-[var(--shadow-card)] transition-shadow duration-200">
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
                className={[
                  idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/20',
                  onRowClick ? 'cursor-pointer hover:bg-primary/5 transition-all duration-150' : '',
                ].filter(Boolean).join(' ')}
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
                if (totalPages <= 5) pageNum = i + 1
                else if (pagination.page <= 3) pageNum = i + 1
                else if (pagination.page >= totalPages - 2) pageNum = totalPages - 4 + i
                else pageNum = pagination.page - 2 + i
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink isActive={pageNum === pagination.page} onClick={() => onPageChange?.(pageNum)}>
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
