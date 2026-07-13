import { useMemo, useState } from 'react'
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  DatabaseIcon,
  RotateCcwIcon,
  SearchIcon,
} from 'lucide-react'
import {
  Link,
  useLocation,
  useParams,
} from 'react-router'

import { BatteryDetailOverview } from '@/components/batteries/BatteryDetailOverview'
import { BatteryDetailPanels } from '@/components/batteries/BatteryDetailPanels'
import { BatteryTelemetryProfile } from '@/components/batteries/BatteryTelemetryProfile'
import { BatteryTelemetryChart } from '@/components/charts/BatteryTelemetryChart'
import { DateRangeFilter } from '@/components/filters/DateRangeFilter'
import { TelemetryEventTable } from '@/components/telemetry/TelemetryEventTable'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  buildAsOfPeerComparison,
  buildSynchronizedBatteryHistory,
} from '@/lib/telemetry-p1-data'
import {
  REVIEW_REASON_DEFINITIONS,
  TELEMETRY_METRIC_KEYS,
  TELEMETRY_STATUS_LABELS,
} from '@/lib/telemetry-policy'
import { queryEventRows } from '@/lib/telemetry-queries'
import { useTelemetryStore } from '@/store/use-telemetry-store'

import type { TableSort } from '@/components/TableWithFilters'
import type {
  ReviewReasonCode,
  TelemetryMetricKey,
} from '@/lib/telemetry-policy'
import type {
  BatteryFleetData,
  EventSort,
  TelemetryEventRow,
} from '@/lib/telemetry-queries'
import type { TelemetryStatus } from '@/types/telemetry'

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  timeZone: 'UTC',
})

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  timeZone: 'UTC',
})

const yearFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  timeZone: 'UTC',
})

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'UTC',
})

const EVENT_STATUS_COLORS: Readonly<Record<TelemetryStatus, string>> = {
  charging: 'var(--battery-status-charging)',
  discharging: 'var(--battery-status-discharging)',
  idle: 'var(--muted-foreground)',
}

const REASON_COLORS: Readonly<Record<ReviewReasonCode, string>> = {
  'critical-charge': 'var(--battery-status-critical)',
  'low-charge': 'var(--battery-status-low)',
  'high-temperature': 'var(--battery-status-critical)',
  'low-health': 'var(--battery-status-low)',
}

function reviewReasonText(
  row: TelemetryEventRow,
  reason: ReviewReasonCode,
): string {
  const { metrics } = row.event
  switch (reason) {
    case 'critical-charge':
      return `${metrics.stateOfCharge.toFixed(1)}% < 10% rule`
    case 'low-charge':
      return `${metrics.stateOfCharge.toFixed(1)}% < 20% rule`
    case 'high-temperature':
      return `${metrics.temperature.toFixed(1)} °C ≥ 40 °C rule`
    case 'low-health':
      return `${metrics.stateOfHealth.toFixed(1)}% < 85% rule`
  }
}

function BatteryLoadingState() {
  return (
    <div aria-label="Loading battery details" className="space-y-4 py-6" role="status">
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-[30rem] rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton className="h-80 rounded-xl" key={index} />
        ))}
      </div>
    </div>
  )
}

function MissingBattery({ batteryId, backTo }: { readonly batteryId: string; readonly backTo: string }) {
  return (
    <Empty className="my-6 min-h-80 border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <DatabaseIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Battery not found</EmptyTitle>
        <EmptyDescription>
          No recorded telemetry belongs to {batteryId || 'this battery'}.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link to={backTo}>Return to batteries</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function LatestEventCard({ row }: { readonly row: TelemetryEventRow }) {
  const timestampMs = row.event.timestampMs

  return (
    <Card className="h-full gap-0 py-0">
      <CardContent className="flex h-full flex-col p-6 lg:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Latest event</h2>
        <Badge variant="outline">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: EVENT_STATUS_COLORS[row.event.status] }}
            />
            {TELEMETRY_STATUS_LABELS[row.event.status]}
        </Badge>
        </div>

        <div className="mt-6 grid grid-cols-[5.25rem_1fr] items-center gap-5">
          <div className="rounded-xl bg-muted/60 py-4 text-center">
            <p className="text-3xl font-semibold tabular-nums leading-none">
              {dayFormatter.format(timestampMs)}
            </p>
            <p className="mt-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {monthFormatter.format(timestampMs)}
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {yearFormatter.format(timestampMs)}
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {timeFormatter.format(timestampMs)}
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">UTC</p>
            <p className="mt-4 w-fit rounded-md bg-muted/60 px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
              {row.event.id}
            </p>
          </div>
        </div>

        {row.reasonCodes.length > 0 && (
          <div className="mt-auto pt-6">
            <ul className="space-y-2">
              {row.reasonCodes.map((reason) => (
                <li
                  className="flex items-center gap-3 rounded-lg bg-muted/45 px-3 py-2.5"
                  key={reason}
                >
                  <CircleAlertIcon
                    aria-hidden="true"
                    className="size-4 shrink-0"
                    style={{ color: REASON_COLORS[reason] }}
                  />
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {REVIEW_REASON_DEFINITIONS[reason].label}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {reviewReasonText(row, reason)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Review rules, not fault diagnoses
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BatteryWorkspace({
  batteryFleetData,
  batteryId,
}: {
  readonly batteryFleetData: BatteryFleetData
  readonly batteryId: string
}) {
  const location = useLocation()
  const [eventSearch, setEventSearch] = useState('')
  const [eventFromDate, setEventFromDate] = useState('')
  const [eventToDate, setEventToDate] = useState('')
  const [eventStatus, setEventStatus] = useState<TelemetryStatus | 'all'>('all')
  const [tableSort, setTableSort] = useState<TableSort>({
    id: 'timestamp',
    descending: true,
  })
  const routeState = location.state as { readonly from?: unknown } | null
  const backTo =
    typeof routeState?.from === 'string' && routeState.from.startsWith('/batteries')
      ? routeState.from
      : '/batteries'
  const rows = useMemo(
    () =>
      batteryFleetData.eventRows
        .filter((row) => row.event.batteryId === batteryId)
        .sort(
          (left, right) =>
            left.event.timestampMs - right.event.timestampMs ||
            left.event.id.localeCompare(right.event.id),
        ),
    [batteryFleetData.eventRows, batteryId],
  )
  const history = useMemo(
    () => buildSynchronizedBatteryHistory(rows, { batteryId }),
    [batteryId, rows],
  )
  const peerComparisons = useMemo(
    () =>
      (['stateOfCharge', 'stateOfHealth', 'temperature'] as const).map((metric) =>
        buildAsOfPeerComparison(batteryFleetData.asOfData, { batteryId, metric }),
      ),
    [batteryFleetData.asOfData, batteryId],
  )
  const eventQuery = useMemo(() => {
    const field = tableSort.id as EventSort['field']
    return queryEventRows(rows, {
      search: eventSearch,
      ...(eventFromDate === ''
        ? {}
        : { fromMs: Date.parse(`${eventFromDate}T00:00:00.000Z`) }),
      ...(eventToDate === ''
        ? {}
        : { toMs: Date.parse(`${eventToDate}T23:59:59.999Z`) }),
      ...(eventStatus === 'all' ? {} : { statuses: [eventStatus] }),
      sort: {
        field,
        direction: tableSort.descending ? 'descending' : 'ascending',
      },
    })
  }, [eventFromDate, eventSearch, eventStatus, eventToDate, rows, tableSort])
  const latestRow = rows.at(-1)
  const firstDate = rows[0]?.event.timestamp.slice(0, 10) ?? ''
  const lastDate = latestRow?.event.timestamp.slice(0, 10) ?? ''

  if (!latestRow) return <MissingBattery backTo={backTo} batteryId={batteryId} />

  function handleSortChange(sort: TableSort): void {
    const isSortableField =
      sort.id === 'timestamp' ||
      TELEMETRY_METRIC_KEYS.includes(sort.id as TelemetryMetricKey)
    if (isSortableField) setTableSort(sort)
  }

  return (
    <div className="space-y-4 py-4">
      <Card className="gap-0 py-0">
        <CardContent className="flex min-h-16 flex-wrap items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild size="icon" variant="ghost">
            <Link to={backTo}>
              <ArrowLeftIcon aria-hidden="true" />
              <span className="sr-only">Batteries</span>
            </Link>
            </Button>
            <div className="min-w-0 border-l pl-4">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Historical battery
              </p>
              <h1 className="truncate font-mono text-lg font-semibold">{batteryId}</h1>
            </div>
          </div>
          <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {rows.length.toLocaleString()} events · UTC
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(19rem,1fr)]">
        <BatteryDetailOverview
          latestRow={latestRow}
        />
        <LatestEventCard row={latestRow} />
      </div>

      <BatteryTelemetryProfile rows={rows} />
      <BatteryTelemetryChart rows={rows} title="Telemetry history" />

      <BatteryDetailPanels
        history={history}
        peerComparisons={peerComparisons}
        rows={rows}
      />

      <section aria-labelledby="battery-events-heading" className="space-y-3">
        <h2 className="text-base font-semibold text-muted-foreground" id="battery-events-heading">
          Event evidence
        </h2>
        <TelemetryEventTable
          filters={
            <div className="grid grid-cols-2 items-center gap-2 rounded-lg border bg-card p-2 md:flex md:overflow-x-auto">
              <div className="relative col-span-2 w-full md:w-56 md:shrink-0">
                <SearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search this battery's events"
                  className="h-8 pl-8"
                  onChange={(event) => setEventSearch(event.target.value)}
                  placeholder="Search event ID"
                  type="search"
                  value={eventSearch}
                />
              </div>
              <DateRangeFilter
                end={eventToDate}
                maximum={lastDate}
                minimum={firstDate}
                onChange={(fromDate, toDate) => {
                  setEventFromDate(fromDate)
                  setEventToDate(toDate)
                }}
                start={eventFromDate}
              />
              <Select
                onValueChange={(value) =>
                  setEventStatus(value as TelemetryStatus | 'all')
                }
                value={eventStatus}
              >
                <SelectTrigger aria-label="Filter events by status" className="h-8 w-full md:w-36 md:shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="charging">Charging</SelectItem>
                  <SelectItem value="discharging">Discharging</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                </SelectContent>
              </Select>
              <Button
                aria-label="Reset event filters"
                className="size-8 shrink-0"
                disabled={
                  eventSearch === '' &&
                  eventFromDate === '' &&
                  eventToDate === '' &&
                  eventStatus === 'all'
                }
                onClick={() => {
                  setEventSearch('')
                  setEventFromDate('')
                  setEventToDate('')
                  setEventStatus('all')
                }}
                size="icon"
                title="Reset event filters"
                type="button"
                variant="outline"
              >
                <RotateCcwIcon aria-hidden="true" />
              </Button>
            </div>
          }
          matchingBatteryCount={eventQuery.rows.length > 0 ? 1 : 0}
          onSortChange={handleSortChange}
          rows={eventQuery.rows}
          sort={tableSort}
          totalEventCount={rows.length}
        />
      </section>
    </div>
  )
}

export function BatteryPage() {
  const { batteryId = '' } = useParams()
  const loadState = useTelemetryStore((state) => state.loadState)
  const retry = useTelemetryStore((state) => state.retry)

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
    return <MissingBattery backTo="/batteries" batteryId={batteryId} />
  }

  if (loadState.status !== 'ready') return <BatteryLoadingState />

  return (
    <BatteryWorkspace
      batteryFleetData={loadState.batteryFleetData}
      batteryId={batteryId}
    />
  )
}
