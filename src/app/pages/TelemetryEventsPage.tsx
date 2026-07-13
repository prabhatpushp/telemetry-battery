import { lazy, Suspense, useDeferredValue, useMemo } from 'react'
import { CircleAlertIcon, DatabaseIcon } from 'lucide-react'

import { ExploreDataFilterBar } from '@/components/telemetry/ExploreDataFilterBar'
import { TelemetryEventPanels } from '@/components/telemetry/TelemetryEventPanels'
import { TelemetryEventTable } from '@/components/telemetry/TelemetryEventTable'
import { TelemetryEventsExportButton } from '@/components/telemetry/TelemetryEventsExportButton'
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
  buildExploreEventQuery,
  EXPLORE_SORT_FIELDS,
} from '@/lib/explore-data-filters'
import { buildHistogram } from '@/lib/telemetry-chart-data'
import {
  buildEventActivity,
  buildTelemetryEventSummary,
} from '@/lib/telemetry-event-insights'
import { queryEventRows } from '@/lib/telemetry-queries'
import { useTelemetryStore } from '@/store/use-telemetry-store'

import type { TableSort } from '@/components/TableWithFilters'
import type { ExploreSortField } from '@/lib/explore-data-filters'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'
import type { TelemetrySnapshot } from '@/types/telemetry'

const TelemetryEventCharts = lazy(
  () => import('@/components/charts/TelemetryEventCharts'),
)

const timestampFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

function toUtcDate(timestampMs: number | null): string {
  return timestampMs === null
    ? ''
    : new Date(timestampMs).toISOString().slice(0, 10)
}

function formatTimestamp(timestampMs: number | null): string {
  return timestampMs === null ? '—' : timestampFormatter.format(timestampMs)
}

function TelemetryEventsLoadingState() {
  return (
    <div
      aria-label="Loading telemetry events"
      className="space-y-4 py-6"
      role="status"
    >
      <Skeleton className="h-16" />
      <Skeleton className="h-14" />
      <Skeleton className="h-80" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[420px]" />
        <Skeleton className="h-[420px]" />
      </div>
      <Skeleton className="h-[520px]" />
    </div>
  )
}

type TelemetryEventsWorkspaceProps = {
  readonly eventRows: readonly TelemetryEventRow[]
  readonly snapshot: TelemetrySnapshot
}

function TelemetryEventsWorkspace({
  eventRows,
  snapshot,
}: TelemetryEventsWorkspaceProps) {
  const filterState = useExploreDataFilters()
  const deferredFilters = useDeferredValue(filterState.filters)
  const queryResult = useMemo(
    () => queryEventRows(eventRows, buildExploreEventQuery(deferredFilters)),
    [deferredFilters, eventRows],
  )
  const summary = useMemo(
    () => buildTelemetryEventSummary(queryResult.rows),
    [queryResult.rows],
  )
  const fromMs =
    deferredFilters.fromDate === ''
      ? (snapshot.firstTimestampMs ?? 0)
      : Date.parse(`${deferredFilters.fromDate}T00:00:00.000Z`)
  const toMs =
    deferredFilters.toDate === ''
      ? (snapshot.lastTimestampMs ?? 0)
      : Date.parse(`${deferredFilters.toDate}T23:59:59.999Z`)
  const activity = useMemo(
    () =>
      buildEventActivity(queryResult.rows, {
        fromMs,
        toMs,
        bucketCount: 36,
      }),
    [fromMs, queryResult.rows, toMs],
  )
  const histogram = useMemo(
    () => buildHistogram(queryResult.rows, deferredFilters.metric, 14),
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
    <div
      aria-busy={deferredFilters !== filterState.filters}
      className="space-y-5 py-5"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Telemetry events
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete recorded evidence · {snapshot.eventCount.toLocaleString()}{' '}
            events · {snapshot.batteryCount.toLocaleString()} batteries
          </p>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            {formatTimestamp(snapshot.firstTimestampMs)} –{' '}
            {formatTimestamp(snapshot.lastTimestampMs)} UTC
          </p>
        </div>
        <Badge variant="outline">Historical · not live</Badge>
      </header>

      <ExploreDataFilterBar
        ariaLabel="Telemetry event filters"
        batteryIds={snapshot.batteryIds}
        filters={filterState.filters}
        firstDate={toUtcDate(snapshot.firstTimestampMs)}
        hasActiveFilters={filterState.hasActiveFilters}
        lastDate={toUtcDate(snapshot.lastTimestampMs)}
        onFiltersChange={filterState.updateFilters}
        onReset={filterState.clearFilters}
        variant="events"
      />

      <section aria-labelledby="event-summary-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" id="event-summary-heading">
              Filtered evidence
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Counts describe recorded observations, not duration or live state.
            </p>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {queryResult.matchingEventCount.toLocaleString()} events ·{' '}
            {queryResult.matchingBatteryCount.toLocaleString()} batteries
          </p>
        </div>
        <TelemetryEventPanels summary={summary} />
      </section>

      <Suspense
        fallback={
          <Skeleton aria-label="Loading event charts" className="h-[420px]" />
        }
      >
        <TelemetryEventCharts
          activity={activity}
          histogram={histogram}
          metric={deferredFilters.metric}
          onMetricChange={(metric) => filterState.updateFilters({ metric })}
        />
      </Suspense>

      <section aria-labelledby="event-records-heading" className="space-y-3 pt-1">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" id="event-records-heading">
              Event records
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Virtualized full result set with direct metrics, derived power,
              review reasons, and prior-observation gaps.
            </p>
          </div>
          <TelemetryEventsExportButton
            filters={deferredFilters}
            rows={queryResult.rows}
          />
        </div>
        <TelemetryEventTable
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

export function TelemetryEventsPage() {
  const loadState = useTelemetryStore((state) => state.loadState)
  const retry = useTelemetryStore((state) => state.retry)

  if (loadState.status === 'error') {
    return (
      <div className="py-6">
        <Alert className="mx-auto max-w-2xl" variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Telemetry events could not be loaded</AlertTitle>
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
          <EmptyTitle>No telemetry events found</EmptyTitle>
          <EmptyDescription>
            No recorded battery events are available for exploration.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (loadState.status !== 'ready') return <TelemetryEventsLoadingState />

  return (
    <TelemetryEventsWorkspace
      eventRows={loadState.batteryFleetData.eventRows}
      snapshot={loadState.telemetry.snapshot}
    />
  )
}
