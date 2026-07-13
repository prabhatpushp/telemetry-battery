import {
  lazy,
  Suspense,
  useDeferredValue,
  useMemo,
} from 'react'
import { CircleAlertIcon, DatabaseIcon } from 'lucide-react'

import { ExploreDataFilterBar } from '@/components/telemetry/ExploreDataFilterBar'
import { TelemetryEventTable } from '@/components/telemetry/TelemetryEventTable'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useExploreDataFilters } from '@/hooks/use-explore-data-filters'
import {
  buildFleetTrend,
  buildHistogram,
  buildStatusComparison,
} from '@/lib/telemetry-chart-data'
import {
  buildExploreEventQuery,
  EXPLORE_SORT_FIELDS,
} from '@/lib/explore-data-filters'
import { queryEventRows } from '@/lib/telemetry-queries'
import { useTelemetryStore } from '@/store/use-telemetry-store'

import type { TableSort } from '@/components/TableWithFilters'
import type { ExploreSortField } from '@/lib/explore-data-filters'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'
import type { TelemetrySnapshot } from '@/types/telemetry'

const ExploreTelemetryCharts = lazy(
  () => import('@/components/charts/ExploreTelemetryCharts'),
)

function toUtcDate(timestampMs: number | null): string {
  return timestampMs === null
    ? ''
    : new Date(timestampMs).toISOString().slice(0, 10)
}

function ExploreLoadingState() {
  return (
    <div aria-label="Loading Explore Data" className="space-y-4 py-6" role="status">
      <Skeleton className="h-16" />
      <Skeleton className="h-32" />
      <Skeleton className="h-[420px]" />
    </div>
  )
}

function ExploreWorkspace({
  eventRows,
  snapshot,
}: {
  readonly eventRows: readonly TelemetryEventRow[]
  readonly snapshot: TelemetrySnapshot
}) {
  const filterState = useExploreDataFilters()
  const deferredFilters = useDeferredValue(filterState.filters)
  const queryResult = useMemo(
    () => queryEventRows(eventRows, buildExploreEventQuery(deferredFilters)),
    [deferredFilters, eventRows],
  )
  const histogram = useMemo(
    () => buildHistogram(queryResult.rows, deferredFilters.metric, 16),
    [deferredFilters.metric, queryResult.rows],
  )
  const fromMs =
    deferredFilters.fromDate === ''
      ? (snapshot.firstTimestampMs ?? 0)
      : Date.parse(`${deferredFilters.fromDate}T00:00:00.000Z`)
  const toMs =
    deferredFilters.toDate === ''
      ? (snapshot.lastTimestampMs ?? 0)
      : Date.parse(`${deferredFilters.toDate}T23:59:59.999Z`)
  const trend = useMemo(
    () =>
      buildFleetTrend(queryResult.rows, {
        metric: deferredFilters.metric,
        fromMs,
        toMs,
        bucketCount: 48,
      }),
    [deferredFilters.metric, fromMs, queryResult.rows, toMs],
  )
  const statusComparison = useMemo(
    () => buildStatusComparison(queryResult.rows, deferredFilters.metric),
    [deferredFilters.metric, queryResult.rows],
  )
  const tableSort: TableSort = {
    id: filterState.filters.sortField,
    descending: filterState.filters.sortDirection === 'descending',
  }

  function handleSortChange(sort: TableSort): void {
    if (!EXPLORE_SORT_FIELDS.includes(sort.id as ExploreSortField)) return
    filterState.updateFilters({
      sortField: sort.id as ExploreSortField,
      sortDirection: sort.descending ? 'descending' : 'ascending',
    })
  }

  return (
    <div aria-busy={deferredFilters !== filterState.filters} className="space-y-4 py-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Explore data</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {snapshot.eventCount.toLocaleString()} events ·{' '}
            {snapshot.batteryCount.toLocaleString()} batteries ·{' '}
            {toUtcDate(snapshot.firstTimestampMs)}–{toUtcDate(snapshot.lastTimestampMs)} UTC
          </p>
        </div>
        <Badge variant="outline">Historical</Badge>
      </header>

      <ExploreDataFilterBar
        batteryIds={snapshot.batteryIds}
        filters={filterState.filters}
        firstDate={toUtcDate(snapshot.firstTimestampMs)}
        hasActiveFilters={filterState.hasActiveFilters}
        lastDate={toUtcDate(snapshot.lastTimestampMs)}
        onFiltersChange={filterState.updateFilters}
        onReset={filterState.clearFilters}
      />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold" id="analysis-results-heading">Analysis</h2>
        <p className="text-sm tabular-nums text-muted-foreground">
          {queryResult.matchingEventCount.toLocaleString()} events ·{' '}
          {queryResult.matchingBatteryCount.toLocaleString()} batteries
        </p>
      </div>

      <Suspense fallback={<Skeleton aria-label="Loading charts" className="h-[420px]" />}>
        <ExploreTelemetryCharts
          eventRows={queryResult.rows}
          histogram={histogram}
          metric={deferredFilters.metric}
          onMetricChange={(metric) => filterState.updateFilters({ metric })}
          statusComparison={statusComparison}
          trend={trend}
        />
      </Suspense>

      <section aria-labelledby="supporting-records-heading" className="space-y-3 pt-2">
        <h2 className="text-lg font-semibold" id="supporting-records-heading">
          Events
        </h2>
        <TelemetryEventTable
          filters={
            <ExploreDataFilterBar
              ariaLabel="Event table filters"
              batteryIds={snapshot.batteryIds}
              filters={filterState.filters}
              firstDate={toUtcDate(snapshot.firstTimestampMs)}
              hasActiveFilters={filterState.hasActiveFilters}
              lastDate={toUtcDate(snapshot.lastTimestampMs)}
              onFiltersChange={filterState.updateFilters}
              onReset={filterState.clearFilters}
              variant="events"
            />
          }
          matchingBatteryCount={queryResult.matchingBatteryCount}
          onSortChange={handleSortChange}
          rows={queryResult.rows}
          sort={tableSort}
          totalEventCount={snapshot.eventCount}
        />
      </section>
    </div>
  )
}

export function ExploreDataPage() {
  const loadState = useTelemetryStore((state) => state.loadState)
  const retry = useTelemetryStore((state) => state.retry)

  if (loadState.status === 'error') {
    return (
      <div className="py-6">
        <Alert className="mx-auto max-w-2xl" variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Explore Data could not be loaded</AlertTitle>
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
          <EmptyMedia variant="icon"><DatabaseIcon aria-hidden="true" /></EmptyMedia>
          <EmptyTitle>No telemetry found</EmptyTitle>
          <EmptyDescription>No battery events are available.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (loadState.status !== 'ready') return <ExploreLoadingState />
  return (
    <ExploreWorkspace
      eventRows={loadState.batteryFleetData.eventRows}
      snapshot={loadState.telemetry.snapshot}
    />
  )
}
