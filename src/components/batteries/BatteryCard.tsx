import { memo } from 'react'
import { ArrowUpRightIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Battery } from '@/components/batteries/Battery'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  REVIEW_PRIORITY_LABELS,
  TELEMETRY_STATUS_LABELS,
} from '@/lib/telemetry-policy'

import type { BatteryTableRow } from '@/lib/telemetry-queries'

import './BatteryCard.css'

type BatteryCardProps = {
  readonly returnTo: string
  readonly row: BatteryTableRow
}

type BatteryCardBodyProps = {
  readonly row: BatteryTableRow
}

function formatSigned(value: number, decimals: number, unit: string): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)} ${unit}`
}

const BatteryCardBody = memo(function BatteryCardBody({
  row,
}: BatteryCardBodyProps) {
  const { event } = row
  const { metrics } = event
  const headingId = `battery-${event.batteryId}-heading`
  const visualTone =
    metrics.stateOfCharge < 10
      ? 'critical'
      : metrics.stateOfCharge < 20
        ? 'low'
        : 'standard'

  return (
    <Card
      aria-labelledby={headingId}
      className="battery-grid-card h-auto min-w-0 rounded-xl transition-[transform,box-shadow] duration-200 group-hover/battery:-translate-y-0.5 group-hover/battery:shadow-md group-focus-visible/battery:ring-3 group-focus-visible/battery:ring-ring/50 sm:aspect-square sm:h-full"
      role="article"
      size="sm"
    >
      <CardHeader className="min-w-0 border-b">
        <CardTitle className="min-w-0">
          <h3 className="truncate font-mono tracking-tight" id={headingId}>
            {event.batteryId}
          </h3>
        </CardTitle>
        <CardAction className="flex items-center gap-2">
          {row.primaryPriority !== 'none' && (
            <Badge variant="secondary">
              {REVIEW_PRIORITY_LABELS[row.primaryPriority]}
            </Badge>
          )}
          <ArrowUpRightIcon
            aria-hidden="true"
            className="size-4 -translate-x-1 text-muted-foreground opacity-0 transition-[transform,opacity] group-hover/battery:translate-x-0 group-hover/battery:opacity-100 group-focus-visible/battery:translate-x-0 group-focus-visible/battery:opacity-100"
          />
        </CardAction>
      </CardHeader>

      <CardContent className="flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-3">
        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-4">
          <div className="battery-grid-visual flex min-h-24 items-center justify-center rounded-lg sm:min-h-28">
            <Battery
              className="h-20 w-9 sm:h-24 sm:w-10"
              label={event.batteryId}
              level={metrics.stateOfCharge}
              tone={visualTone}
              variant="compact"
            />
          </div>

          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Charge</p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">
              {metrics.stateOfCharge.toFixed(1)}
              <span className="ml-0.5 text-sm font-medium text-muted-foreground">
                %
              </span>
            </p>
            <Badge
              className="battery-grid-status mt-2"
              data-status={event.status}
              variant="outline"
            >
              {TELEMETRY_STATUS_LABELS[event.status]}
            </Badge>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t pt-3 min-[380px]:grid-cols-3">
          <div>
            <dt className="text-[11px] text-muted-foreground">Health</dt>
            <dd className="text-sm font-medium tabular-nums">
              {metrics.stateOfHealth.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Temp</dt>
            <dd className="text-sm font-medium tabular-nums">
              {metrics.temperature.toFixed(1)}°C
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Voltage</dt>
            <dd className="text-sm font-medium tabular-nums">
              {metrics.voltage.toFixed(2)} V
            </dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">Current</dt>
            <dd className="text-sm font-medium tabular-nums">
              {formatSigned(metrics.current, 2, 'A')}
            </dd>
          </div>
          <div className="min-[380px]:col-span-2">
            <dt className="text-[11px] text-muted-foreground">Recorded power</dt>
            <dd className="text-sm font-medium tabular-nums">
              {formatSigned(row.recordedPowerWatts, 2, 'W')}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
})

export const BatteryCard = memo(function BatteryCard({
  returnTo,
  row,
}: BatteryCardProps) {
  return (
    <Link
      aria-label={`Open ${row.event.batteryId} battery details`}
      className="group/battery block min-w-0 rounded-xl focus-visible:outline-none"
      state={{ from: returnTo }}
      to={`/batteries/${encodeURIComponent(row.event.batteryId)}`}
    >
      <BatteryCardBody row={row} />
    </Link>
  )
})
