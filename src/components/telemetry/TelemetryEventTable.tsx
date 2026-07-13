import { Link } from 'react-router'

import { TelemetryEventDetailDialog } from '@/components/telemetry/TelemetryEventDetailDialog'
import {
  TableWithFilters,
  type TableColumn,
  type TableSort,
} from '@/components/TableWithFilters'
import { Badge } from '@/components/ui/badge'
import {
  REVIEW_REASON_DEFINITIONS,
  TELEMETRY_METRICS,
  TELEMETRY_STATUS_LABELS,
} from '@/lib/telemetry-policy'

import type { TelemetryEventRow } from '@/lib/telemetry-queries'
import type { ReactNode } from 'react'

export type TelemetryEventTableProps = {
  readonly matchingBatteryCount: number
  readonly rows: readonly TelemetryEventRow[]
  readonly sort: TableSort
  readonly totalEventCount: number
  readonly filters?: ReactNode
  readonly onSortChange: (sort: TableSort) => void
}

const timestampFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'medium',
  timeZone: 'UTC',
})

const STATUS_CLASSES = {
  charging: 'text-[var(--battery-status-charging)]',
  discharging: 'text-[var(--battery-status-discharging)]',
  idle: 'text-muted-foreground',
} as const

const PRIORITY_CLASSES = {
  critical: 'text-[var(--battery-status-critical)]',
  low: 'text-[var(--battery-status-low)]',
  metric: 'text-[var(--battery-status-metric)]',
  none: 'text-[var(--battery-status-normal)]',
} as const

function formatMetric(row: TelemetryEventRow, metric: keyof typeof TELEMETRY_METRICS): string {
  const definition = TELEMETRY_METRICS[metric]
  const value =
    metric === 'recordedPower'
      ? row.recordedPowerWatts
      : row.event.metrics[metric]
  return `${value.toFixed(definition.decimals)} ${definition.unit}`
}

function formatGap(gapMs: number | null): string {
  if (gapMs === null) return 'First observation'
  return `${(gapMs / (60 * 60 * 1000)).toFixed(1)} h`
}

const COLUMNS: readonly TableColumn<TelemetryEventRow>[] = [
  {
    id: 'id',
    header: 'Event ID',
    width: '128px',
    renderCell: (row) => <span className="font-mono text-xs">{row.event.id}</span>,
  },
  {
    id: 'timestamp',
    header: 'Timestamp · UTC',
    width: '190px',
    isSortable: true,
    renderCell: (row) => timestampFormatter.format(row.event.timestampMs),
  },
  {
    id: 'batteryId',
    header: 'Battery',
    width: '105px',
    isSortable: true,
    renderCell: (row) => (
      <Link
        className="font-medium underline-offset-4 hover:underline"
        to={`/batteries/${encodeURIComponent(row.event.batteryId)}`}
      >
        {row.event.batteryId}
      </Link>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    width: '112px',
    renderCell: (row) => (
      <span className={STATUS_CLASSES[row.event.status]}>
        {TELEMETRY_STATUS_LABELS[row.event.status]}
      </span>
    ),
  },
  {
    id: 'stateOfCharge',
    header: 'SoC',
    width: '88px',
    isSortable: true,
    cellClassName: 'text-right tabular-nums',
    headerClassName: 'text-right',
    renderCell: (row) => formatMetric(row, 'stateOfCharge'),
  },
  {
    id: 'stateOfHealth',
    header: 'SoH',
    width: '88px',
    isSortable: true,
    cellClassName: 'text-right tabular-nums',
    headerClassName: 'text-right',
    renderCell: (row) => formatMetric(row, 'stateOfHealth'),
  },
  {
    id: 'voltage',
    header: 'Voltage',
    width: '96px',
    isSortable: true,
    cellClassName: 'text-right tabular-nums',
    headerClassName: 'text-right',
    renderCell: (row) => formatMetric(row, 'voltage'),
  },
  {
    id: 'current',
    header: 'Current',
    width: '96px',
    isSortable: true,
    cellClassName: 'text-right tabular-nums',
    headerClassName: 'text-right',
    renderCell: (row) => formatMetric(row, 'current'),
  },
  {
    id: 'temperature',
    header: 'Temperature',
    width: '120px',
    isSortable: true,
    cellClassName: 'text-right tabular-nums',
    headerClassName: 'text-right',
    renderCell: (row) => formatMetric(row, 'temperature'),
  },
  {
    id: 'recordedPower',
    header: 'Recorded power',
    width: '132px',
    isSortable: true,
    cellClassName: 'text-right tabular-nums',
    headerClassName: 'text-right',
    renderCell: (row) => formatMetric(row, 'recordedPower'),
  },
  {
    id: 'review',
    header: 'Review reasons',
    width: '220px',
    renderCell: (row) => (
      <div className="flex gap-1 overflow-hidden">
        {row.reasonCodes.length > 0 ? (
          row.reasonCodes.map((reason) => (
            <Badge className={PRIORITY_CLASSES[row.primaryPriority]} key={reason} variant="outline">
              {REVIEW_REASON_DEFINITIONS[reason].label}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
  },
  {
    id: 'gap',
    header: 'Previous gap',
    width: '112px',
    cellClassName: 'text-right tabular-nums',
    headerClassName: 'text-right',
    renderCell: (row) => formatGap(row.gapBeforeMs),
  },
  {
    id: 'details',
    header: 'Details',
    width: '84px',
    renderCell: (row) => <TelemetryEventDetailDialog row={row} />,
  },
]

export function TelemetryEventTable({
  filters,
  matchingBatteryCount,
  onSortChange,
  rows,
  sort,
  totalEventCount,
}: TelemetryEventTableProps) {
  return (
    <TableWithFilters
      ariaLabel="Filtered telemetry events"
      columns={COLUMNS}
      emptyMessage="No telemetry events match this analysis scope. Reset or widen the filters."
      filters={filters}
      getRowId={(row) => row.event.id}
      onSortChange={onSortChange}
      resultDescription={`${rows.length.toLocaleString()} of ${totalEventCount.toLocaleString()} events · ${matchingBatteryCount.toLocaleString()} batteries`}
      rows={rows}
      sort={sort}
    />
  )
}
