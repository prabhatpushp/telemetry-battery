import { useMemo } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  DistributionBoxPlot,
  type BoxPlotDatum,
} from '@/components/charts/DistributionBoxPlot'
import { BatteryTelemetryChart } from '@/components/charts/BatteryTelemetryChart'
import { MetricSummary } from '@/components/telemetry/MetricSummary'
import { Button } from '@/components/ui/button'
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
import {
  REVIEW_REASON_DEFINITIONS,
  TELEMETRY_METRICS,
  TELEMETRY_STATUS_LABELS,
} from '@/lib/telemetry-policy'

import type {
  FleetTrendBucket,
  HistogramData,
  StatusComparisonGroup,
  DistributionSummary,
} from '@/lib/telemetry-chart-data'
import type { TelemetryMetricKey } from '@/lib/telemetry-policy'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'

export type ExploreTelemetryChartsProps = {
  readonly eventRows: readonly TelemetryEventRow[]
  readonly histogram: HistogramData
  readonly metric: TelemetryMetricKey
  readonly statusComparison: readonly StatusComparisonGroup[]
  readonly trend: readonly FleetTrendBucket[]
  readonly onMetricChange: (metric: TelemetryMetricKey) => void
}

const METRIC_OPTIONS = [
  'stateOfCharge',
  'stateOfHealth',
  'voltage',
  'current',
  'temperature',
  'recordedPower',
] as const satisfies readonly TelemetryMetricKey[]

const REVIEW_REASON_KEYS = [
  'critical-charge',
  'low-charge',
  'high-temperature',
  'low-health',
] as const

const REVIEW_REASON_COLORS = {
  'critical-charge': 'var(--chart-5)',
  'low-charge': 'var(--chart-3)',
  'high-temperature': 'var(--chart-4)',
  'low-health': 'var(--chart-1)',
} as const

const utcTickFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
})

const chartNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 4,
})

function formatChartValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatChartValue).join(' – ')
  const numericValue = Number(value)
  return Number.isFinite(numericValue)
    ? chartNumberFormatter.format(numericValue)
    : typeof value === 'string'
      ? value
      : '—'
}

function toBoxPlotDatum(
  label: string,
  summary: DistributionSummary,
  color: string,
): BoxPlotDatum | null {
  if (
    summary.minimum === null ||
    summary.p10 === null ||
    summary.p25 === null ||
    summary.median === null ||
    summary.p75 === null ||
    summary.p90 === null ||
    summary.maximum === null
  ) {
    return null
  }

  return {
    color,
    count: summary.eventCount,
    label,
    maximum: summary.maximum,
    median: summary.median,
    minimum: summary.minimum,
    p10: summary.p10,
    p25: summary.p25,
    p75: summary.p75,
    p90: summary.p90,
  }
}

function MetricRail({
  metric,
  onMetricChange,
}: Pick<ExploreTelemetryChartsProps, 'metric' | 'onMetricChange'>) {
  return (
    <fieldset className="flex min-w-0 gap-1 overflow-x-auto border-y bg-card px-2 py-1.5">
      <legend className="sr-only">Primary telemetry metric</legend>
      {METRIC_OPTIONS.map((option) => (
        <Button
          aria-pressed={metric === option}
          className="shrink-0"
          key={option}
          onClick={() => onMetricChange(option)}
          size="sm"
          type="button"
          variant={metric === option ? 'secondary' : 'ghost'}
        >
          {TELEMETRY_METRICS[option].label}
        </Button>
      ))}
    </fieldset>
  )
}

function FleetTrendPanel({
  metric,
  onMetricChange,
  trend,
}: {
  readonly metric: TelemetryMetricKey
  readonly trend: readonly FleetTrendBucket[]
  readonly onMetricChange: (metric: TelemetryMetricKey) => void
}) {
  const definition = TELEMETRY_METRICS[metric]
  const chartData = trend.map((bucket) => ({
    timestamp: bucket.startMs,
    median: bucket.median,
    band:
      bucket.p10 === null || bucket.p90 === null
        ? null
        : [bucket.p10, bucket.p90],
    batteries: bucket.batteryCount,
    events: bucket.eventCount,
  }))

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>Historical telemetry</CardTitle>
        <CardAction>
          <Select
            onValueChange={(value) =>
              onMetricChange(value as TelemetryMetricKey)
            }
            value={metric}
          >
            <SelectTrigger
              aria-label="Historical telemetry metric"
              className="h-8 w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {METRIC_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {TELEMETRY_METRICS[option].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
        <CardDescription>Median and P10–P90 · UTC</CardDescription>
      </CardHeader>
      <CardContent className="px-3 pt-5 pb-4 sm:px-5">
        <div className="h-[360px]">
          <ResponsiveContainer height="100%" width="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 14, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
              <XAxis
                dataKey="timestamp"
                domain={['dataMin', 'dataMax']}
                minTickGap={42}
                scale="time"
                tickFormatter={(value: number) => utcTickFormatter.format(value)}
                tickLine={false}
                type="number"
              />
              <YAxis
                tickFormatter={(value: number) => `${value.toFixed(definition.decimals)}${definition.unit}`}
                tickLine={false}
                width={64}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--popover-foreground)',
                }}
                formatter={(value) => formatChartValue(value)}
                labelFormatter={(value) => `${new Date(Number(value)).toISOString()} · UTC`}
              />
              <Legend />
              <Area
                connectNulls={false}
                dataKey="band"
                fill="var(--chart-3)"
                fillOpacity={0.2}
                isAnimationActive={false}
                name="P10–P90"
                stroke="var(--chart-3)"
                strokeOpacity={0.35}
                type="linear"
              />
              <Line
                connectNulls={false}
                dataKey="median"
                dot={false}
                isAnimationActive={false}
                name={`Median ${definition.label}`}
                stroke="var(--chart-1)"
                strokeWidth={2}
                type="linear"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function DistributionPanel({ histogram }: { readonly histogram: HistogramData }) {
  const definition = TELEMETRY_METRICS[histogram.metric]
  const chartData = histogram.bins.map((bin) => ({
    range: `${bin.minimum.toFixed(definition.decimals)}–${bin.maximum.toFixed(definition.decimals)}`,
    count: bin.count,
  }))
  const boxPlot = toBoxPlotDatum(
    definition.label,
    histogram.summary,
    'var(--chart-1)',
  )

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>{definition.label} distribution</CardTitle>
        <CardDescription>{histogram.summary.eventCount.toLocaleString()} events</CardDescription>
      </CardHeader>
      <CardContent className="px-3 pt-5 pb-4 sm:px-5">
        <div className="h-56">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 18, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="range" interval="preserveStartEnd" minTickGap={30} tickLine={false} />
              <YAxis allowDecimals={false} tickLine={false} width={42} />
              <Tooltip
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--popover-foreground)',
                }}
                formatter={(value) => formatChartValue(value)}
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
        {boxPlot && (
          <div className="mt-3 border-t pt-3">
            <DistributionBoxPlot
              ariaLabel={`${definition.label} distribution summary`}
              data={[boxPlot]}
              formatValue={(value) =>
                `${value.toFixed(definition.decimals)}${definition.unit}`
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusComparisonPanel({
  groups,
  metric,
}: {
  readonly groups: readonly StatusComparisonGroup[]
  readonly metric: TelemetryMetricKey
}) {
  const definition = TELEMETRY_METRICS[metric]
  const colors = {
    charging: 'var(--chart-2)',
    discharging: 'var(--chart-5)',
    idle: 'var(--chart-4)',
  } as const
  const chartData = groups.flatMap((group) => {
    const datum = toBoxPlotDatum(
      TELEMETRY_STATUS_LABELS[group.status],
      group.summary,
      colors[group.status],
    )
    return datum ? [datum] : []
  })

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>Status comparison</CardTitle>
        <CardDescription>{definition.label} range by status</CardDescription>
      </CardHeader>
      <CardContent className="px-3 pt-5 pb-4 sm:px-5">
        <DistributionBoxPlot
          ariaLabel={`${definition.label} distribution by operating status`}
          data={chartData}
          formatValue={(value) =>
            `${value.toFixed(definition.decimals)}${definition.unit}`
          }
        />
      </CardContent>
    </Card>
  )
}

function StatusMixPanel({
  groups,
}: {
  readonly groups: readonly StatusComparisonGroup[]
}) {
  const counts = Object.fromEntries(
    groups.map((group) => [group.status, group.summary.eventCount]),
  ) as Record<'charging' | 'discharging' | 'idle', number>
  const total = groups.reduce(
    (sum, group) => sum + group.summary.eventCount,
    0,
  )
  const percentage = (count: number) =>
    total === 0 ? 0 : Number(((count / total) * 100).toFixed(4))
  const data = [
    {
      scope: 'Events',
      charging: percentage(counts.charging ?? 0),
      discharging: percentage(counts.discharging ?? 0),
      idle: percentage(counts.idle ?? 0),
    },
  ]

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>Status mix</CardTitle>
        <CardDescription>{total.toLocaleString()} observations</CardDescription>
      </CardHeader>
      <CardContent className="px-3 pt-5 pb-4 sm:px-5">
        <div className="h-40">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <XAxis
                domain={[0, 100]}
                tickFormatter={(value: number) => `${value}%`}
                tickLine={false}
                type="number"
              />
              <YAxis dataKey="scope" hide type="category" />
              <Tooltip
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--popover-foreground)',
                }}
                formatter={(value) => `${formatChartValue(value)}%`}
              />
              <Legend />
              <Bar
                dataKey="charging"
                fill="var(--chart-2)"
                isAnimationActive={false}
                name={`Charging (${(counts.charging ?? 0).toLocaleString()})`}
                radius={[4, 0, 0, 4]}
                stackId="status"
              />
              <Bar
                dataKey="discharging"
                fill="var(--chart-5)"
                isAnimationActive={false}
                name={`Discharging (${(counts.discharging ?? 0).toLocaleString()})`}
                stackId="status"
              />
              <Bar
                dataKey="idle"
                fill="var(--chart-4)"
                isAnimationActive={false}
                name={`Idle (${(counts.idle ?? 0).toLocaleString()})`}
                radius={[0, 4, 4, 0]}
                stackId="status"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewConditionsPanel({
  rows,
}: {
  readonly rows: readonly TelemetryEventRow[]
}) {
  const data = useMemo(
    () =>
      REVIEW_REASON_KEYS.map((reason) => ({
        color: REVIEW_REASON_COLORS[reason],
        count: rows.filter((row) => row.reasonCodes.includes(reason)).length,
        label: REVIEW_REASON_DEFINITIONS[reason].label,
      })),
    [rows],
  )

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle>Review conditions</CardTitle>
        <CardDescription>Independent event counts</CardDescription>
      </CardHeader>
      <CardContent className="px-3 pt-5 pb-4 sm:px-5">
        <div className="h-56">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
            >
              <CartesianGrid
                horizontal={false}
                stroke="var(--border)"
                strokeDasharray="3 5"
              />
              <XAxis allowDecimals={false} tickLine={false} type="number" />
              <YAxis
                dataKey="label"
                tickLine={false}
                type="category"
                width={128}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--popover-foreground)',
                }}
                formatter={(value) => formatChartValue(value)}
              />
              <Bar
                dataKey="count"
                isAnimationActive={false}
                name="Events"
                radius={[0, 4, 4, 0]}
              >
                {data.map((item) => (
                  <Cell fill={item.color} key={item.label} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ExploreTelemetryCharts({
  eventRows,
  histogram,
  metric,
  onMetricChange,
  statusComparison,
  trend,
}: ExploreTelemetryChartsProps) {
  return (
    <section aria-labelledby="analysis-results-heading" className="space-y-4">
      <MetricRail metric={metric} onMetricChange={onMetricChange} />
      <MetricSummary metric={metric} summary={histogram.summary} />
      <div className="grid gap-4 xl:grid-cols-2">
        <DistributionPanel histogram={histogram} />
        <StatusComparisonPanel groups={statusComparison} metric={metric} />
      </div>
      <FleetTrendPanel
        metric={metric}
        onMetricChange={onMetricChange}
        trend={trend}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <StatusMixPanel groups={statusComparison} />
        <ReviewConditionsPanel rows={eventRows} />
      </div>
      <BatteryTelemetryChart rows={eventRows} />
    </section>
  )
}
