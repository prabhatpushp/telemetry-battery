import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  REVIEW_REASON_DEFINITIONS,
  TELEMETRY_STATUS_LABELS,
} from '@/lib/telemetry-policy'

import type { TelemetryEventSummary } from '@/lib/telemetry-event-insights'

export type TelemetryEventPanelsProps = {
  readonly summary: TelemetryEventSummary
}

const timestampFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

const STATUS_COLORS = {
  charging: 'var(--battery-status-charging)',
  discharging: 'var(--battery-status-discharging)',
  idle: 'var(--muted-foreground)',
} as const

const REASON_ITEMS = [
  ['critical-charge', 'var(--battery-status-critical)'],
  ['low-charge', 'var(--battery-status-low)'],
  ['high-temperature', 'var(--chart-4)'],
  ['low-health', 'var(--battery-status-metric)'],
] as const

const REASON_PROGRESS_CLASSES = {
  'critical-charge':
    '[&_[data-slot=progress-indicator]]:bg-[var(--battery-status-critical)]',
  'low-charge':
    '[&_[data-slot=progress-indicator]]:bg-[var(--battery-status-low)]',
  'high-temperature':
    '[&_[data-slot=progress-indicator]]:bg-[var(--chart-4)]',
  'low-health':
    '[&_[data-slot=progress-indicator]]:bg-[var(--battery-status-metric)]',
} as const

function percentage(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100
}

function formatDuration(durationMs: number): string {
  if (durationMs === 0) return 'None'
  const hours = durationMs / (60 * 60 * 1000)
  return hours < 48 ? `${hours.toFixed(1)} h` : `${(hours / 24).toFixed(1)} d`
}

function StatusCoverage({ summary }: TelemetryEventPanelsProps) {
  const chargingPercent = percentage(
    summary.statusCounts.charging,
    summary.eventCount,
  )
  const dischargingPercent = percentage(
    summary.statusCounts.discharging,
    summary.eventCount,
  )

  return (
    <section className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-sm font-semibold">Filtered coverage</h2>
      <div className="mt-5 grid grid-cols-1 items-center justify-items-center gap-5 sm:grid-cols-[7rem_1fr] sm:justify-items-stretch">
        <div
          aria-label={`${summary.statusCounts.charging} charging, ${summary.statusCounts.discharging} discharging, ${summary.statusCounts.idle} idle events`}
          className="relative size-28 rounded-full"
          role="img"
          style={{
            background:
              summary.eventCount === 0
                ? 'var(--muted)'
                : `conic-gradient(var(--battery-status-charging) 0 ${chargingPercent}%, var(--battery-status-discharging) ${chargingPercent}% ${chargingPercent + dischargingPercent}%, var(--muted-foreground) ${chargingPercent + dischargingPercent}% 100%)`,
          }}
        >
          <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-card">
            <span className="text-2xl font-semibold tabular-nums">
              {summary.eventCount.toLocaleString()}
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
                {summary.statusCounts[status].toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-3 text-xs">
            <span className="text-muted-foreground">Batteries</span>
            <span className="font-semibold tabular-nums">
              {summary.batteryCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center">
          <span className="size-2 rounded-full bg-foreground" />
          <span className="h-px flex-1 bg-border" />
          <span className="size-2 rounded-full bg-foreground" />
        </div>
        <div className="mt-2 flex justify-between gap-3 text-[11px] tabular-nums text-muted-foreground">
          <span>
            {summary.firstTimestampMs === null
              ? '—'
              : timestampFormatter.format(summary.firstTimestampMs)}
          </span>
          <span className="text-right">
            {summary.lastTimestampMs === null
              ? '—'
              : timestampFormatter.format(summary.lastTimestampMs)}
          </span>
        </div>
      </div>
    </section>
  )
}

function ReviewOccurrences({ summary }: TelemetryEventPanelsProps) {
  return (
    <section className="border-t p-4 sm:p-6 lg:border-t-0 lg:border-l lg:p-8">
      <h2 className="text-sm font-semibold">Review occurrences</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Independent event counts; conditions may overlap.
      </p>
      <div className="mt-6 space-y-5">
        {REASON_ITEMS.map(([reason, color]) => {
          const count = summary.reasonCounts[reason]
          const share = percentage(count, summary.eventCount)
          return (
            <div className="space-y-2.5" key={reason}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {REVIEW_REASON_DEFINITIONS[reason].label}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {count.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress
                  className={`h-2 ${REASON_PROGRESS_CLASSES[reason]}`}
                  value={share}
                />
                <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                  {share.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function EvidenceQuality({ summary }: TelemetryEventPanelsProps) {
  const reviewShare = percentage(summary.reviewEventCount, summary.eventCount)
  const multipleShare = percentage(
    summary.multipleConditionCount,
    summary.eventCount,
  )
  const gaps = [
    ['≥24 h', summary.gapCounts.over24Hours],
    ['≥48 h', summary.gapCounts.over48Hours],
    ['≥72 h', summary.gapCounts.over72Hours],
  ] as const

  return (
    <section className="border-t p-4 sm:p-6 lg:border-t-0 lg:border-l lg:p-8">
      <h2 className="text-sm font-semibold">Observation evidence</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Gaps indicate missing observations, not confirmed downtime.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-xl font-semibold tabular-nums">
            {summary.reviewEventCount.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Rule match · {reviewShare.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="text-xl font-semibold tabular-nums">
            {summary.multipleConditionCount.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Multiple · {multipleShare.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {gaps.map(([label, count]) => (
          <div className="flex items-center gap-3" key={label}>
            <span className="w-11 text-xs text-muted-foreground">{label}</span>
            <Progress
              aria-label={`${count} events after a gap ${label}`}
              className="h-2 [&_[data-slot=progress-indicator]]:bg-[var(--chart-3)]"
              value={percentage(count, Math.max(1, summary.eventCount))}
            />
            <span className="w-12 text-right text-xs font-medium tabular-nums">
              {count.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t pt-4 text-xs">
        <span className="text-muted-foreground">Longest prior gap</span>
        <span className="font-semibold tabular-nums">
          {formatDuration(summary.longestGapMs)}
        </span>
      </div>
    </section>
  )
}

export function TelemetryEventPanels({ summary }: TelemetryEventPanelsProps) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="grid px-0 lg:grid-cols-[1.05fr_1.1fr_1fr]">
        <StatusCoverage summary={summary} />
        <ReviewOccurrences summary={summary} />
        <EvidenceQuality summary={summary} />
      </CardContent>
    </Card>
  )
}
