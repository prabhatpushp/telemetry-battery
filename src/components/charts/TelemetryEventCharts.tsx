import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EXPLORE_METRIC_VALUES } from '@/lib/explore-data-filters'
import { TELEMETRY_METRICS } from '@/lib/telemetry-policy'

import type { HistogramData } from '@/lib/telemetry-chart-data'
import type { EventActivityBucket } from '@/lib/telemetry-event-insights'
import type { TelemetryMetricKey } from '@/lib/telemetry-policy'

export type TelemetryEventChartsProps = {
  readonly activity: readonly EventActivityBucket[]
  readonly histogram: HistogramData
  readonly metric: TelemetryMetricKey
  readonly onMetricChange: (metric: TelemetryMetricKey) => void
}

const utcTickFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})

const utcTooltipFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--popover-foreground)',
} as const

function formatValue(value: unknown): string {
  const numericValue = Number(value)
  return Number.isFinite(numericValue)
    ? numberFormatter.format(numericValue)
    : '—'
}

type ActivityTooltipProps = {
  readonly active?: boolean
  readonly payload?: readonly {
    readonly payload?: EventActivityBucket
  }[]
}

function ActivityTooltip({ active, payload }: ActivityTooltipProps) {
  const bucket = payload?.[0]?.payload
  if (!active || !bucket) return null

  return (
    <div className="min-w-60 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
      <p className="font-semibold">
        {utcTooltipFormatter.format(bucket.startMs)} –{' '}
        {utcTooltipFormatter.format(bucket.endMsExclusive - 1)} UTC
      </p>
      <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1.5 tabular-nums">
        <span className="text-muted-foreground">Events</span>
        <span className="text-right font-medium">
          {bucket.eventCount.toLocaleString()}
        </span>
        <span className="text-muted-foreground">Batteries</span>
        <span className="text-right font-medium">
          {bucket.batteryCount.toLocaleString()}
        </span>
        <span className="text-muted-foreground">Charging</span>
        <span className="text-right">{bucket.charging.toLocaleString()}</span>
        <span className="text-muted-foreground">Discharging</span>
        <span className="text-right">
          {bucket.discharging.toLocaleString()}
        </span>
        <span className="text-muted-foreground">Idle</span>
        <span className="text-right">{bucket.idle.toLocaleString()}</span>
        <span className="text-muted-foreground">Review matches</span>
        <span className="text-right">
          {bucket.reviewEventCount.toLocaleString()}
        </span>
        <span className="text-muted-foreground">Multiple conditions</span>
        <span className="text-right">
          {bucket.multipleConditionCount.toLocaleString()}
        </span>
      </div>
    </div>
  )
}

function ActivityChart({
  activity,
}: Pick<TelemetryEventChartsProps, 'activity'>) {
  const hasEvents = activity.some((bucket) => bucket.eventCount > 0)

  return (
    <Card className="gap-0 py-0 xl:col-span-3">
      <CardHeader className="border-b py-4">
        <CardTitle>Observation activity</CardTitle>
        <CardDescription>
          Event counts by UTC interval; status bars do not represent time spent.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pt-5 pb-4 sm:px-5">
        {hasEvents ? (
          <div className="h-80">
            <ResponsiveContainer height="100%" width="100%">
              <ComposedChart
                data={activity}
                margin={{ top: 10, right: 16, bottom: 4, left: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="startMs"
                  domain={['dataMin', 'dataMax']}
                  minTickGap={42}
                  scale="time"
                  tickFormatter={(value: number) =>
                    utcTickFormatter.format(value)
                  }
                  tickLine={false}
                  type="number"
                />
                <YAxis allowDecimals={false} tickLine={false} width={44} />
                <Tooltip content={<ActivityTooltip />} />
                <Legend />
                <Bar
                  dataKey="charging"
                  fill="var(--battery-status-charging)"
                  isAnimationActive={false}
                  name="Charging events"
                  stackId="status"
                />
                <Bar
                  dataKey="discharging"
                  fill="var(--battery-status-discharging)"
                  isAnimationActive={false}
                  name="Discharging events"
                  stackId="status"
                />
                <Bar
                  dataKey="idle"
                  fill="var(--muted-foreground)"
                  isAnimationActive={false}
                  name="Idle events"
                  stackId="status"
                />
                <Line
                  dataKey="reviewEventCount"
                  dot={false}
                  isAnimationActive={false}
                  name="Events matching review rules"
                  stroke="var(--chart-4)"
                  strokeWidth={2}
                  type="linear"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            No event activity matches the selected filters.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DistributionChart({
  histogram,
  metric,
  onMetricChange,
}: Omit<TelemetryEventChartsProps, 'activity'>) {
  const definition = TELEMETRY_METRICS[metric]
  const chartData = histogram.bins.map((bin) => ({
    range: `${bin.minimum.toFixed(definition.decimals)}–${bin.maximum.toFixed(definition.decimals)}`,
    count: bin.count,
  }))
  const summaryItems = [
    ['Minimum', histogram.summary.minimum],
    ['Median', histogram.summary.median],
    ['P90', histogram.summary.p90],
    ['Maximum', histogram.summary.maximum],
  ] as const

  return (
    <Card className="gap-0 py-0 xl:col-span-2">
      <CardHeader className="border-b py-4">
        <CardTitle>{definition.label} distribution</CardTitle>
        <CardAction>
          <Select
            onValueChange={(value) =>
              onMetricChange(value as TelemetryMetricKey)
            }
            value={metric}
          >
            <SelectTrigger
              aria-label="Distribution metric"
              className="h-8 w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {EXPLORE_METRIC_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {TELEMETRY_METRICS[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
        <CardDescription>
          {histogram.summary.eventCount.toLocaleString()} filtered events
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pt-5 pb-4 sm:px-5">
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                data={chartData}
                margin={{ top: 4, right: 4, bottom: 18, left: 0 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  interval="preserveStartEnd"
                  minTickGap={28}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} tickLine={false} width={42} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatValue(value)}
                />
                <Bar
                  dataKey="count"
                  fill="var(--chart-1)"
                  isAnimationActive={false}
                  name="Events"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No metric values match the selected filters.
          </div>
        )}

        <dl className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-4">
          {summaryItems.map(([label, value]) => (
            <div className="rounded-lg bg-muted/50 p-2.5" key={label}>
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-medium tabular-nums">
                {value === null
                  ? '—'
                  : `${value.toFixed(definition.decimals)} ${definition.unit}`}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

export default function TelemetryEventCharts({
  activity,
  histogram,
  metric,
  onMetricChange,
}: TelemetryEventChartsProps) {
  return (
    <section
      aria-label="Filtered telemetry event charts"
      className="grid gap-4 xl:grid-cols-5"
    >
      <ActivityChart activity={activity} />
      <DistributionChart
        histogram={histogram}
        metric={metric}
        onMetricChange={onMetricChange}
      />
    </section>
  )
}
