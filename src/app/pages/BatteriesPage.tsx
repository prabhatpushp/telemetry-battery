import { CircleAlertIcon, DatabaseIcon } from 'lucide-react'

import { BatteryFleetBanner } from '@/components/batteries/BatteryFleetBanner'
import { BatteryFilters } from '@/components/batteries/BatteryFilters'
import { BatteryGrid } from '@/components/batteries/BatteryGrid'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useBatteryFilters } from '@/hooks/use-battery-filters'
import { useTelemetryStore } from '@/store/use-telemetry-store'

import type { BatteryTableRow } from '@/lib/telemetry-queries'

const EMPTY_BATTERY_ROWS: readonly BatteryTableRow[] = []

function BatteriesLoadingState() {
  return (
    <div
      aria-label="Loading battery grid"
      className="space-y-3 py-6"
      role="status"
    >
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-9 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton className="aspect-square rounded-xl" key={index} />
        ))}
      </div>
    </div>
  )
}

export function BatteriesPage() {
  const loadState = useTelemetryStore((state) => state.loadState)
  const retry = useTelemetryStore((state) => state.retry)
  const fleetData =
    loadState.status === 'ready' ? loadState.batteryFleetData : null
  const batteryFilters = useBatteryFilters(
    fleetData?.asOfData.rows ?? EMPTY_BATTERY_ROWS,
  )

  if (loadState.status === 'error') {
    return (
      <div className="py-6">
        <Alert className="mx-auto max-w-2xl" variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Battery data could not be loaded</AlertTitle>
          <AlertDescription>{loadState.error.message}</AlertDescription>
        </Alert>
        {loadState.error.retryable && (
          <div className="mt-4 flex justify-center">
            <Button onClick={() => void retry()} type="button" variant="outline">
              Try again
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (loadState.status === 'empty') {
    return (
      <Empty className="my-6 min-h-72 border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <DatabaseIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No telemetry found</EmptyTitle>
          <EmptyDescription>
            The data source did not contain any battery events.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (!fleetData) return <BatteriesLoadingState />

  return (
    <div className="space-y-3 py-6">
      <BatteryFleetBanner
        batteryCount={fleetData.asOfData.totalBatteryCount}
        chargingCount={fleetData.statusCounts.charging}
        dischargingCount={fleetData.statusCounts.discharging}
        idleCount={fleetData.statusCounts.idle}
        latestReadingMs={fleetData.asOfData.latestReadingMs}
      />
      <BatteryFilters
        filters={batteryFilters.filters}
        hasActiveFilters={batteryFilters.hasActiveFilters}
        onClear={batteryFilters.clearFilters}
        onPriorityChange={batteryFilters.setPriority}
        onReasonChange={batteryFilters.setReason}
        onSearchChange={batteryFilters.setSearch}
        onSortChange={batteryFilters.setSort}
        onStatusChange={batteryFilters.setStatus}
      />
      <BatteryGrid
        allRows={fleetData.asOfData.rows}
        hasActiveFilters={batteryFilters.hasActiveFilters}
        onClearFilters={batteryFilters.clearFilters}
        rows={batteryFilters.rows}
      />
    </div>
  )
}
