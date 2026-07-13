import { useMemo, useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  BATTERY_CHART_METRICS,
  BATTERY_PROFILE_PERIODS,
  buildBatteryTelemetryProfile,
} from '@/lib/battery-telemetry-chart'
import { TELEMETRY_METRICS } from '@/lib/telemetry-policy'

import type { BatteryProfilePeriod } from '@/lib/battery-telemetry-chart'
import type { TelemetryMetricKey } from '@/lib/telemetry-policy'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'

type BatteryTelemetryProfileProps = {
  readonly rows: readonly TelemetryEventRow[]
}

const PERIODS = Object.keys(BATTERY_PROFILE_PERIODS) as BatteryProfilePeriod[]

const METRIC_LABELS: Readonly<Record<TelemetryMetricKey, string>> = {
  stateOfCharge: 'SoC',
  stateOfHealth: 'SoH',
  voltage: 'Voltage',
  current: 'Current',
  temperature: 'Temp',
  recordedPower: 'Power',
}

const LEGEND = [
  ['Critical', 'var(--battery-status-critical)'],
  ['Low', 'var(--battery-status-low)'],
  ['Higher', 'var(--battery-status-charging)'],
  ['Neutral', 'var(--chart-1)'],
] as const

const rangeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})

const columnFormatters: Readonly<Record<BatteryProfilePeriod, Intl.DateTimeFormat>> = {
  daily: new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }),
  weekly: new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    timeZone: 'UTC',
  }),
  monthly: new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    timeZone: 'UTC',
  }),
  yearly: new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  }),
}

function formatMetric(value: number, metric: TelemetryMetricKey): string {
  const definition = TELEMETRY_METRICS[metric]
  const signed =
    (metric === 'current' || metric === 'recordedPower') && value > 0
  return `${signed ? '+' : ''}${value.toFixed(definition.decimals)} ${definition.unit}`
}

function formatObservationCount(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? 'observation' : 'observations'}`
}

function metricColor(
  metric: TelemetryMetricKey,
  value: number,
  strength: number,
): string {
  if (metric === 'stateOfCharge') {
    if (value < 10) return 'var(--battery-status-critical)'
    if (value < 20) return 'var(--battery-status-low)'
    return `color-mix(in srgb, var(--battery-status-charging) ${strength}%, var(--card))`
  }
  if (metric === 'stateOfHealth') {
    if (value < 85) return 'var(--battery-status-low)'
    return `color-mix(in srgb, var(--battery-status-charging) ${strength}%, var(--card))`
  }
  if (metric === 'temperature') {
    return value >= 40
      ? 'var(--battery-status-critical)'
      : `color-mix(in srgb, var(--chart-1) ${strength}%, var(--card))`
  }
  if (metric === 'current' || metric === 'recordedPower') {
    if (value > 0) return 'var(--battery-status-charging)'
    if (value < 0) return 'var(--battery-status-discharging)'
  }
  return `color-mix(in srgb, var(--chart-1) ${strength}%, var(--card))`
}

export function BatteryTelemetryProfile({ rows }: BatteryTelemetryProfileProps) {
  const [period, setPeriod] = useState<BatteryProfilePeriod>('monthly')
  const profiles = useMemo(
    () =>
      Object.fromEntries(
        PERIODS.map((item) => [
          item,
          buildBatteryTelemetryProfile(rows, item),
        ]),
      ) as Readonly<
        Record<
          BatteryProfilePeriod,
          ReturnType<typeof buildBatteryTelemetryProfile>
        >
      >,
    [rows],
  )
  const ranges = useMemo(
    () =>
      Object.fromEntries(
        BATTERY_CHART_METRICS.map((metric) => {
          const values = rows.map((row) =>
            metric === 'recordedPower'
              ? row.recordedPowerWatts
              : row.event.metrics[metric],
          )
          return [
            metric,
            { minimum: Math.min(...values), maximum: Math.max(...values) },
          ]
        }),
      ) as Readonly<
        Record<
          TelemetryMetricKey,
          { readonly minimum: number; readonly maximum: number }
        >
      >,
    [rows],
  )
  const buckets = profiles[period]

  return (
    <Card className="gap-0 overflow-visible py-0">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-muted-foreground">
            Telemetry profile
          </h2>
          <div className="flex w-full flex-wrap items-center gap-4 sm:w-auto sm:justify-end">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {LEGEND.map(([label, color]) => (
                <span className="flex items-center gap-1.5" key={label}>
                  <span
                    aria-hidden="true"
                    className="size-3 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ))}
            </div>
            <Tabs
              aria-label="Telemetry profile period"
              onValueChange={(value) => setPeriod(value as BatteryProfilePeriod)}
              value={period}
            >
              <TabsList>
                {PERIODS.map((item) => (
                  <TabsTrigger className="capitalize" key={item} value={item}>
                    {item}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </header>

        <TooltipProvider delayDuration={120}>
          <div className="mt-5 flex items-start py-4 sm:px-1">
            <div className="grid w-16 shrink-0 gap-y-4 border-r pr-2 sm:w-24 sm:pr-3">
              {BATTERY_CHART_METRICS.map((metric) => (
                <span
                  className="flex h-9 items-center text-sm text-muted-foreground"
                  key={metric}
                >
                  {METRIC_LABELS[metric]}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1 overflow-x-auto pl-3">
              <div
                className="grid w-fit items-center gap-x-3 gap-y-4"
                style={{
                  gridTemplateColumns: `repeat(${buckets.length}, 36px)`,
                }}
              >
                {BATTERY_CHART_METRICS.flatMap((metric) => {
                  const range = ranges[metric]
                  const span = Math.max(
                    Number.EPSILON,
                    range.maximum - range.minimum,
                  )
                  return buckets.map((bucket) => {
                    const value = bucket.values[metric]
                    const strength =
                      value === null
                        ? 0
                        : 22 + ((value - range.minimum) / span) * 70
                    const rangeLabel = `${rangeFormatter.format(bucket.startMs)}–${rangeFormatter.format(bucket.endMs - 1)} UTC`
                    return (
                      <Tooltip key={`${metric}-${bucket.startMs}`}>
                        <TooltipTrigger asChild>
                          <button
                            aria-label={
                              value === null
                                ? `${TELEMETRY_METRICS[metric].label}: no observations, ${rangeLabel}`
                                : `${TELEMETRY_METRICS[metric].label} average ${formatMetric(value, metric)}, ${formatObservationCount(bucket.eventCount)}, ${rangeLabel}`
                            }
                            className="size-9 rounded-md shadow-[inset_0_1px_0_rgb(255_255_255/0.14)] transition-[transform,filter,box-shadow] hover:z-10 hover:-translate-y-1 hover:scale-105 hover:brightness-110 hover:shadow-lg focus-visible:z-10 focus-visible:-translate-y-1 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                            style={
                              value === null
                                ? {
                                    backgroundColor: 'var(--muted)',
                                    backgroundImage:
                                      'repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in srgb, var(--muted-foreground) 18%, transparent) 5px 7px)',
                                  }
                                : {
                                    backgroundColor: metricColor(
                                      metric,
                                      value,
                                      strength,
                                    ),
                                  }
                            }
                            type="button"
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          className="block min-w-52"
                          side="top"
                          sideOffset={8}
                        >
                          <p className="font-semibold">
                            {TELEMETRY_METRICS[metric].label}
                          </p>
                          {value === null ? (
                            <p className="mt-1">No observations</p>
                          ) : (
                            <>
                              <p className="mt-1 text-sm tabular-nums">
                                {formatMetric(value, metric)} average
                              </p>
                              <p className="mt-1 opacity-70">
                                {formatObservationCount(bucket.eventCount)}
                              </p>
                            </>
                          )}
                          <p className="mt-0.5 opacity-70">{rangeLabel}</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })
                })}
                {buckets.map((bucket) => (
                  <span
                    className="text-center text-[11px] tabular-nums text-muted-foreground"
                    key={`sample-${bucket.startMs}`}
                  >
                    {columnFormatters[period].format(bucket.startMs)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
