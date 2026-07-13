import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  TELEMETRY_METRICS,
  TELEMETRY_STATUS_LABELS,
} from '@/lib/telemetry-policy'

import type {
  AsOfPeerComparison,
  ReviewActivityKey,
  SynchronizedBatteryHistory,
} from '@/lib/telemetry-p1-data'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'

type BatteryDetailPanelsProps = {
  readonly history: SynchronizedBatteryHistory
  readonly peerComparisons: readonly AsOfPeerComparison[]
  readonly rows: readonly TelemetryEventRow[]
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

const CONDITION_LABELS: Readonly<Record<ReviewActivityKey, string>> = {
  'critical-charge': 'Charge below 10%',
  'low-charge': 'Charge below 20%',
  'high-temperature': 'Temperature 40+ °C',
  'low-health': 'Health below 85%',
  'multi-condition': 'Multiple rules',
}

const STATUS_COLORS = {
  charging: 'var(--battery-status-charging)',
  discharging: 'var(--battery-status-discharging)',
  idle: 'var(--muted-foreground)',
} as const

const CONDITION_COLORS: Readonly<Record<ReviewActivityKey, string>> = {
  'critical-charge': 'var(--battery-status-critical)',
  'low-charge': 'var(--battery-status-low)',
  'high-temperature': 'var(--battery-status-critical)',
  'low-health': 'var(--battery-status-metric)',
  'multi-condition': 'var(--chart-4)',
}

const CONDITION_PROGRESS_CLASSES: Readonly<Record<ReviewActivityKey, string>> = {
  'critical-charge':
    '[&_[data-slot=progress-indicator]]:bg-[var(--battery-status-critical)]',
  'low-charge':
    '[&_[data-slot=progress-indicator]]:bg-[var(--battery-status-low)]',
  'high-temperature':
    '[&_[data-slot=progress-indicator]]:bg-[var(--battery-status-critical)]',
  'low-health':
    '[&_[data-slot=progress-indicator]]:bg-[var(--battery-status-metric)]',
  'multi-condition': '[&_[data-slot=progress-indicator]]:bg-[var(--chart-4)]',
}

function formatDuration(durationMs: number): string {
  const hours = durationMs / (60 * 60 * 1000)
  return hours < 48
    ? `${hours.toFixed(1)} h`
    : `${(hours / 24).toFixed(1)} d`
}

function formatPeerValue(
  comparison: AsOfPeerComparison,
  value: number | null,
): string {
  if (value === null) return '—'
  if (
    comparison.metric === 'absoluteCurrent' ||
    comparison.metric === 'absoluteRecordedPower' ||
    comparison.metric === 'observationAge'
  ) {
    return value.toFixed(1)
  }
  const definition = TELEMETRY_METRICS[comparison.metric]
  return `${value.toFixed(definition.decimals)} ${definition.unit}`
}

function peerMetricColor(metric: AsOfPeerComparison['metric']): string {
  if (metric === 'stateOfCharge') return 'var(--battery-status-charging)'
  if (metric === 'stateOfHealth') return 'var(--battery-status-metric)'
  if (metric === 'temperature') return 'var(--battery-status-critical)'
  return 'var(--chart-1)'
}

function Coverage({
  history,
  rows,
}: {
  readonly history: SynchronizedBatteryHistory
  readonly rows: readonly TelemetryEventRow[]
}) {
  const longestGapMs = history.gaps.reduce(
    (maximum, gap) => Math.max(maximum, gap.durationMs),
    0,
  )
  const statusCounts = { charging: 0, discharging: 0, idle: 0 }
  for (const row of rows) statusCounts[row.event.status] += 1
  const chargingPercent =
    rows.length === 0 ? 0 : (statusCounts.charging / rows.length) * 100
  const dischargingPercent =
    rows.length === 0 ? 0 : (statusCounts.discharging / rows.length) * 100
  const spanMs =
    history.firstTimestampMs === null || history.latestTimestampMs === null
      ? 0
      : history.latestTimestampMs - history.firstTimestampMs
  const gaps = [
    ['>24 h', history.gaps.length],
    [
      '>48 h',
      history.gaps.filter((gap) => gap.durationMs > 48 * 60 * 60 * 1000)
        .length,
    ],
    [
      '>72 h',
      history.gaps.filter((gap) => gap.durationMs > 72 * 60 * 60 * 1000)
        .length,
    ],
    ['Longest', longestGapMs === 0 ? 'None' : formatDuration(longestGapMs)],
  ] as const

  return (
    <section className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-sm font-semibold">Coverage</h2>
      <div className="mt-5 grid grid-cols-1 items-center justify-items-center gap-5 sm:grid-cols-[7rem_1fr] sm:justify-items-stretch">
        <div
          aria-label={`${statusCounts.charging} charging, ${statusCounts.discharging} discharging, ${statusCounts.idle} idle events`}
          className="relative size-28 rounded-full"
          role="img"
          style={{
            background:
              rows.length === 0
                ? 'var(--muted)'
                : `conic-gradient(var(--battery-status-charging) 0 ${chargingPercent}%, var(--battery-status-discharging) ${chargingPercent}% ${chargingPercent + dischargingPercent}%, var(--muted-foreground) ${chargingPercent + dischargingPercent}% 100%)`,
          }}
        >
          <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-card">
            <span className="text-2xl font-semibold tabular-nums">
              {history.eventCount.toLocaleString()}
            </span>
            <span className="text-[11px] text-muted-foreground">Events</span>
          </div>
        </div>
        <div className="w-full space-y-3">
          {(['charging', 'discharging', 'idle'] as const).map((status) => (
            <div className="flex items-center gap-2 text-xs" key={status}>
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="flex-1 text-muted-foreground">
                {TELEMETRY_STATUS_LABELS[status]}
              </span>
              <span className="font-semibold tabular-nums">
                {statusCounts[status].toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-3 text-xs">
            <span className="text-muted-foreground">Recorded span</span>
            <span className="font-semibold tabular-nums">
              {formatDuration(spanMs)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {gaps.map(([label, value]) => (
          <div className="rounded-lg bg-muted/60 px-2 py-3 text-center" key={label}>
            <p className="font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center">
          <span className="size-2 rounded-full bg-foreground" />
          <span className="h-px flex-1 bg-border" />
          <span className="size-2 rounded-full bg-foreground" />
        </div>
        <div className="mt-2 flex justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>
            {history.firstTimestampMs === null
              ? '—'
              : dateFormatter.format(history.firstTimestampMs)}
          </span>
          <span>
            {history.latestTimestampMs === null
              ? '—'
              : dateFormatter.format(history.latestTimestampMs)}
          </span>
        </div>
      </div>
    </section>
  )
}

function RuleOccurrences({
  history,
}: {
  readonly history: SynchronizedBatteryHistory
}) {
  return (
    <section className="border-t p-4 sm:p-6 lg:border-t-0 lg:border-l lg:p-8">
      <h2 className="text-sm font-semibold">Rule occurrences</h2>
      <div className="mt-6 space-y-5">
        {history.conditions.map((condition) => (
          <div className="space-y-2.5" key={condition.key}>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: CONDITION_COLORS[condition.key] }}
                />
                {CONDITION_LABELS[condition.key]}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {condition.count.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Progress
                className={`h-2 ${CONDITION_PROGRESS_CLASSES[condition.key]}`}
                value={condition.percentage}
              />
              <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                {condition.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FleetContext({
  comparisons,
}: {
  readonly comparisons: readonly AsOfPeerComparison[]
}) {
  return (
    <section className="border-t p-4 sm:p-6 lg:border-t-0 lg:border-l lg:p-8">
      <h2 className="text-sm font-semibold">Fleet context</h2>
      <div className="mt-6 space-y-7">
        {comparisons.map((comparison) => {
          if (
            comparison.metric === 'absoluteCurrent' ||
            comparison.metric === 'absoluteRecordedPower' ||
            comparison.metric === 'observationAge'
          ) {
            return null
          }
          const definition = TELEMETRY_METRICS[comparison.metric]
          const color = peerMetricColor(comparison.metric)

          return (
            <div className="space-y-3" key={comparison.metric}>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-semibold tabular-nums">
                    {formatPeerValue(comparison, comparison.selectedValue)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {definition.label}
                  </p>
                </div>
                <p
                  className="rounded-lg px-2.5 py-1 text-lg font-semibold tabular-nums"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                    color,
                  }}
                >
                  {comparison.percentile === null
                    ? '—'
                    : `P${comparison.percentile.toFixed(0)}`}
                </p>
              </div>
              <div
                aria-label={`${definition.label} fleet percentile ${comparison.percentile === null ? 'not available' : comparison.percentile.toFixed(0)}`}
                className="relative h-5"
                role="img"
              >
                <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 left-[10%] h-2 w-4/5 -translate-y-1/2 rounded-full"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                  }}
                />
                <span className="absolute top-0 bottom-0 left-1/2 w-px bg-foreground/40" />
                {comparison.percentile !== null && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background"
                    style={{
                      backgroundColor: color,
                      left: `${Math.min(100, Math.max(0, comparison.percentile))}%`,
                    }}
                  />
                )}
              </div>
              <div className="grid grid-cols-3 text-[11px] tabular-nums text-muted-foreground">
                <span>P10 {formatPeerValue(comparison, comparison.p10)}</span>
                <span className="text-center">
                  P50 {formatPeerValue(comparison, comparison.median)}
                </span>
                <span className="text-right">
                  P90 {formatPeerValue(comparison, comparison.p90)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function BatteryDetailPanels({
  history,
  peerComparisons,
  rows,
}: BatteryDetailPanelsProps) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="grid px-0 lg:grid-cols-[1.1fr_1fr_1.2fr]">
        <Coverage history={history} rows={rows} />
        <RuleOccurrences history={history} />
        <FleetContext comparisons={peerComparisons} />
      </CardContent>
    </Card>
  )
}
