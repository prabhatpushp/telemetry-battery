import { memo, useMemo } from 'react'
import { SearchXIcon } from 'lucide-react'
import { useLocation } from 'react-router'

import { BatteryCard } from '@/components/batteries/BatteryCard'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

import type { BatteryTableRow } from '@/lib/telemetry-queries'

type BatteryGridProps = {
  readonly allRows: readonly BatteryTableRow[]
  readonly rows: readonly BatteryTableRow[]
  readonly hasActiveFilters: boolean
  readonly onClearFilters: () => void
}

export const BatteryGrid = memo(function BatteryGrid({
  allRows,
  hasActiveFilters,
  onClearFilters,
  rows,
}: BatteryGridProps) {
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const visibleBatteryIds = useMemo(
    () => new Set(rows.map((row) => row.event.batteryId)),
    [rows],
  )
  const renderedRows = useMemo(
    () => [
      ...rows,
      ...allRows.filter(
        (row) => !visibleBatteryIds.has(row.event.batteryId),
      ),
    ],
    [allRows, rows, visibleBatteryIds],
  )
  const hasResults = rows.length > 0

  return (
    <>
      {!hasResults && (
        <Empty className="min-h-72 border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No batteries found</EmptyTitle>
            <EmptyDescription>
              {hasActiveFilters
                ? 'No represented batteries match the active search and filters.'
                : 'No batteries have an observation inside this snapshot window.'}
            </EmptyDescription>
          </EmptyHeader>
          {hasActiveFilters && (
            <EmptyContent>
              <Button onClick={onClearFilters} type="button" variant="outline">
                Clear filters
              </Button>
            </EmptyContent>
          )}
        </Empty>
      )}
      <ul
        aria-label="Battery results"
        className="grid min-w-0 grid-cols-1 list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4"
        hidden={!hasResults}
      >
        {renderedRows.map((row) => (
          <li
            className="min-w-0"
            hidden={!visibleBatteryIds.has(row.event.batteryId)}
            key={row.event.batteryId}
          >
            <BatteryCard returnTo={returnTo} row={row} />
          </li>
        ))}
      </ul>
    </>
  )
})
