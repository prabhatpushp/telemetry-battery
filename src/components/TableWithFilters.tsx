import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/cn'
import { getVirtualRange } from '@/lib/virtual-range'

import type { ReactNode, UIEvent } from 'react'

export type TableSort = {
  readonly id: string
  readonly descending: boolean
}

export type TableColumn<Row> = {
  readonly id: string
  readonly header: string
  readonly width?: string
  readonly isSortable?: boolean
  readonly headerClassName?: string
  readonly cellClassName?: string
  readonly renderCell: (row: Row) => ReactNode
}

export type TableWithFiltersProps<Row> = {
  readonly ariaLabel: string
  readonly columns: readonly TableColumn<Row>[]
  readonly emptyMessage: string
  readonly filters?: ReactNode
  readonly getRowId: (row: Row) => string
  readonly resultDescription: string
  readonly rows: readonly Row[]
  readonly sort?: TableSort
  readonly onSortChange?: (sort: TableSort) => void
  readonly className?: string
  readonly rowHeight?: number
}

const DEFAULT_ROW_HEIGHT = 52
const OVERSCAN_ROW_COUNT = 8

export function TableWithFilters<Row>({
  ariaLabel,
  className,
  columns,
  emptyMessage,
  filters,
  getRowId,
  onSortChange,
  resultDescription,
  rowHeight = DEFAULT_ROW_HEIGHT,
  rows,
  sort,
}: TableWithFiltersProps<Row>) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const range = getVirtualRange({
    itemCount: rows.length,
    itemSize: rowHeight,
    overscan: OVERSCAN_ROW_COUNT,
    scrollOffset: scrollTop,
    viewportSize: viewportHeight,
  })
  const visibleRows = rows.slice(range.startIndex, range.endIndex)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updateViewportHeight = () => setViewportHeight(viewport.clientHeight)
    updateViewportHeight()

    const observer = new ResizeObserver(updateViewportHeight)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || viewport.scrollTop === 0) return
    viewport.scrollTop = 0
    setScrollTop(0)
  }, [rows])

  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    setScrollTop(event.currentTarget.scrollTop)
  }

  function handleSort(column: TableColumn<Row>): void {
    if (!column.isSortable || !onSortChange) return
    onSortChange({
      id: column.id,
      descending: sort?.id === column.id ? !sort.descending : false,
    })
  }

  return (
    <section className={cn('space-y-3', className)}>
      {filters}
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {resultDescription}
      </p>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div
          className="max-h-[min(64vh,44rem)] overflow-auto"
          onScroll={handleScroll}
          ref={viewportRef}
        >
          <table
            aria-label={ariaLabel}
            aria-rowcount={rows.length}
            className="w-full min-w-[1120px] table-fixed border-collapse text-sm"
          >
            <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_var(--border)]">
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {columns.map((column) => {
                  const isSorted = sort?.id === column.id
                  return (
                    <TableHead
                      aria-sort={
                        isSorted
                          ? sort.descending
                            ? 'descending'
                            : 'ascending'
                          : column.isSortable
                            ? 'none'
                            : undefined
                      }
                      className={cn(
                        'relative h-10 select-none px-3 text-xs font-semibold',
                        column.headerClassName,
                      )}
                      key={column.id}
                      scope="col"
                      style={column.width ? { width: column.width } : undefined}
                    >
                      {column.isSortable && onSortChange ? (
                        <Button
                          className="-ml-2 h-8 px-2 text-xs text-muted-foreground"
                          onClick={() => handleSort(column)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          {column.header}
                          {isSorted ? (
                            sort.descending ? (
                              <ChevronDownIcon aria-hidden="true" />
                            ) : (
                              <ChevronUpIcon aria-hidden="true" />
                            )
                          ) : (
                            <ChevronsUpDownIcon aria-hidden="true" />
                          )}
                        </Button>
                      ) : (
                        column.header
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {range.paddingBefore > 0 && (
                <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
                  <TableCell
                    className="p-0"
                    colSpan={columns.length}
                    style={{ height: range.paddingBefore }}
                  />
                </TableRow>
              )}
              {visibleRows.map((row, visibleIndex) => (
                <TableRow
                  aria-rowindex={range.startIndex + visibleIndex + 1}
                  key={getRowId(row)}
                  style={{ height: rowHeight }}
                >
                  {columns.map((column) => (
                    <TableCell
                      className={cn(
                        'overflow-hidden px-3 py-2 whitespace-nowrap text-ellipsis',
                        column.cellClassName,
                      )}
                      key={column.id}
                    >
                      {column.renderCell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {range.paddingAfter > 0 && (
                <TableRow aria-hidden="true" className="border-0 hover:bg-transparent">
                  <TableCell
                    className="p-0"
                    colSpan={columns.length}
                    style={{ height: range.paddingAfter }}
                  />
                </TableRow>
              )}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    className="h-32 px-4 text-center text-muted-foreground"
                    colSpan={columns.length}
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>
    </section>
  )
}
