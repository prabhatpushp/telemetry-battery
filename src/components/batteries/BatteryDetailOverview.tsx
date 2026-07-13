import { Battery } from '@/components/batteries/Battery'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  REVIEW_PRIORITY_LABELS,
  TELEMETRY_METRICS,
  TELEMETRY_STATUS_LABELS,
} from '@/lib/telemetry-policy'

import type { TelemetryMetricKey } from '@/lib/telemetry-policy'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'

type BatteryDetailOverviewProps = {
  readonly latestRow: TelemetryEventRow
}

function getMetricValue(
  row: TelemetryEventRow,
  metric: TelemetryMetricKey,
): number {
  return metric === 'recordedPower'
    ? row.recordedPowerWatts
    : row.event.metrics[metric]
}

function metricColor(
  row: TelemetryEventRow,
  metric: TelemetryMetricKey,
): string {
  const value = getMetricValue(row, metric)
  if (metric === 'stateOfCharge') {
    if (value < 10) return 'var(--battery-status-critical)'
    if (value < 20) return 'var(--battery-status-low)'
    return 'var(--battery-status-charging)'
  }
  if (metric === 'stateOfHealth') {
    return value < 85
      ? 'var(--battery-status-low)'
      : 'var(--battery-status-charging)'
  }
  if (metric === 'temperature') {
    return value >= 40
      ? 'var(--battery-status-critical)'
      : 'var(--chart-1)'
  }
  if (metric === 'current' || metric === 'recordedPower') {
    return value >= 0
      ? 'var(--battery-status-charging)'
      : 'var(--battery-status-discharging)'
  }
  return 'var(--chart-1)'
}

export function BatteryDetailOverview({
  latestRow,
}: BatteryDetailOverviewProps) {
  const { event } = latestRow
  const { metrics } = event
  const tone =
    metrics.stateOfCharge < 10
      ? 'critical'
      : metrics.stateOfCharge < 20
        ? 'low'
        : 'standard'
  return (
    <Card className="h-full gap-0 py-0">
      <CardContent className="grid h-full px-0 lg:grid-cols-[40%_60%]">
        <div className="relative flex min-h-[19rem] items-center justify-center overflow-hidden border-b bg-muted/20 p-4 sm:p-6 lg:border-r lg:border-b-0">
          <div className="absolute top-7 left-7">
            <p className="text-sm font-medium text-muted-foreground">Charge</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {metrics.stateOfCharge.toFixed(1)}%
            </p>
          </div>
          <Battery
            className="h-60 w-24"
            label={event.batteryId}
            level={metrics.stateOfCharge}
            tone={tone}
            variant="fleet"
          />
          <p className="absolute bottom-7 left-7 font-mono text-xl font-semibold">
            {event.batteryId}
          </p>
        </div>

        <div className="flex min-w-0 flex-col justify-between px-4 py-6 sm:px-7 sm:py-7 lg:px-10 lg:py-9">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold text-muted-foreground">
              Latest observation
            </p>
            <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {TELEMETRY_STATUS_LABELS[event.status]}
            </Badge>
            {latestRow.primaryPriority !== 'none' && (
              <Badge variant="secondary">
                {REVIEW_PRIORITY_LABELS[latestRow.primaryPriority]}
              </Badge>
            )}
            </div>
          </div>

          <dl className="mt-7 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 md:grid-cols-3">
            {(
              [
                'stateOfCharge',
                'stateOfHealth',
                'voltage',
                'current',
                'temperature',
                'recordedPower',
              ] as const
            ).map((metric) => {
              const definition = TELEMETRY_METRICS[metric]
              const value = getMetricValue(latestRow, metric)
              const signed =
                (metric === 'current' || metric === 'recordedPower') && value > 0

              return (
                <div className="rounded-lg bg-muted/45 p-3" key={metric}>
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full"
                      style={{ backgroundColor: metricColor(latestRow, metric) }}
                    />
                    {definition.label}
                  </dt>
                  <dd className="mt-2 text-lg font-semibold tabular-nums tracking-tight">
                    {signed ? '+' : ''}
                    {value.toFixed(definition.decimals)}{' '}
                    <span className="text-xs font-medium text-muted-foreground">
                      {definition.unit}
                    </span>
                  </dd>
                </div>
              )
            })}
          </dl>

          <p className="mt-5 text-xs text-muted-foreground">
            Recorded power = voltage × signed current
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
