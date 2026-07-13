import { TELEMETRY_METRICS } from '@/lib/telemetry-policy'

import type { DistributionSummary } from '@/lib/telemetry-chart-data'
import type { TelemetryMetricKey } from '@/lib/telemetry-policy'

export type MetricSummaryProps = {
  readonly metric: TelemetryMetricKey
  readonly summary: DistributionSummary
}

const SUMMARY_FIELDS = [
  ['Minimum', 'minimum'],
  ['P10', 'p10'],
  ['Median', 'median'],
  ['Mean', 'mean'],
  ['P90', 'p90'],
  ['Maximum', 'maximum'],
] as const

export function MetricSummary({ metric, summary }: MetricSummaryProps) {
  const definition = TELEMETRY_METRICS[metric]

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {SUMMARY_FIELDS.map(([label, field]) => {
        const value = summary[field]
        return (
          <div className="rounded-lg border bg-muted/20 p-3" key={field}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium tabular-nums">
              {value === null
                ? '—'
                : `${value.toFixed(definition.decimals)} ${definition.unit}`}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
