import { EyeIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  REVIEW_PRIORITY_LABELS,
  REVIEW_REASON_DEFINITIONS,
  TELEMETRY_METRICS,
  TELEMETRY_STATUS_LABELS,
  getTelemetryMetricValue,
} from '@/lib/telemetry-policy'

import type { TelemetryMetricKey } from '@/lib/telemetry-policy'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'

export type TelemetryEventDetailDialogProps = {
  readonly onOpenChange?: (open: boolean) => void
  readonly open?: boolean
  readonly row: TelemetryEventRow
  readonly showTrigger?: boolean
}

const timestampFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'full',
  timeStyle: 'long',
  timeZone: 'UTC',
})

const METRICS = [
  'stateOfCharge',
  'stateOfHealth',
  'voltage',
  'current',
  'temperature',
  'recordedPower',
] as const satisfies readonly TelemetryMetricKey[]

function metricValue(row: TelemetryEventRow, metric: TelemetryMetricKey): number {
  return getTelemetryMetricValue(row.event, metric)
}

function formatGap(gapMs: number | null): string {
  if (gapMs === null) return 'First recorded observation for this battery'
  const hours = gapMs / (60 * 60 * 1000)
  return `${hours.toFixed(1)} hours since the previous recorded observation`
}

export function TelemetryEventDetailDialog({
  onOpenChange,
  open,
  row,
  showTrigger = true,
}: TelemetryEventDetailDialogProps) {
  const dialogProps = {
    ...(onOpenChange === undefined ? {} : { onOpenChange }),
    ...(open === undefined ? {} : { open }),
  }

  return (
    <Dialog {...dialogProps}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button
            aria-label={`View details for ${row.event.id}`}
            className="h-8 px-2"
            size="sm"
            type="button"
            variant="ghost"
          >
            <EyeIcon aria-hidden="true" />
            View
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">
            {row.event.id}
          </DialogTitle>
          <DialogDescription>
            {timestampFormatter.format(row.event.timestampMs)} · UTC
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">Battery</dt>
            <dd className="mt-1 font-semibold">
              <Link
                className="underline-offset-4 hover:underline"
                to={`/batteries/${encodeURIComponent(row.event.batteryId)}`}
              >
                {row.event.batteryId}
              </Link>
            </dd>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-1 font-semibold">
              {TELEMETRY_STATUS_LABELS[row.event.status]}
            </dd>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">Derived priority</dt>
            <dd className="mt-1 font-semibold">
              {REVIEW_PRIORITY_LABELS[row.primaryPriority]}
            </dd>
          </div>
        </dl>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {METRICS.map((metric) => {
            const definition = TELEMETRY_METRICS[metric]
            return (
              <div className="rounded-lg bg-muted/50 p-3" key={metric}>
                <dt className="text-xs text-muted-foreground">
                  {definition.label}
                </dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {metricValue(row, metric).toFixed(definition.decimals)}{' '}
                  {definition.unit}
                </dd>
              </div>
            )
          })}
        </dl>

        <section className="space-y-2 rounded-lg border p-3">
          <h3 className="text-xs font-semibold">Supporting review evidence</h3>
          <div className="flex flex-wrap gap-1.5">
            {row.reasonCodes.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                No application review rule matched this event.
              </span>
            ) : (
              row.reasonCodes.map((reason) => (
                <Badge key={reason} variant="outline">
                  {REVIEW_REASON_DEFINITIONS[reason].label}
                </Badge>
              ))
            )}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          {formatGap(row.gapBeforeMs)}. Gaps describe missing observations, not
          confirmed downtime.
        </p>
      </DialogContent>
    </Dialog>
  )
}
