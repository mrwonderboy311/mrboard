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
