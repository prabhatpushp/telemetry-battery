import {
  REVIEW_REASON_DEFINITIONS,
  getTelemetryMetricValue,
} from '@/lib/telemetry-policy'

import type {
  ReviewPriority,
  ReviewReasonCode,
  TelemetryMetricKey,
} from '@/lib/telemetry-policy'
import type {
  BatteryTableRow,
  TelemetryEventRow,
} from '@/lib/telemetry-queries'
import type { TelemetryStatus } from '@/types/telemetry'

const HOURS_24_MS = 24 * 60 * 60 * 1000
const MAX_BUCKET_COUNT = 200
const MAX_HISTOGRAM_BIN_COUNT = 100

export type CategoryCount<Key extends string = string> = {
  readonly key: Key
  readonly label: string
  readonly count: number
  readonly percentage: number
}

export type MetricBandDefinition = {
  readonly key: string
  readonly label: string
  readonly minimum: number
  readonly maximum: number
  readonly isMaximumInclusive?: boolean
}

export type MetricBandCount = MetricBandDefinition & {
  readonly count: number
  readonly percentage: number
}

export const STATE_OF_CHARGE_BANDS = [
  { key: 'soc-0-10', label: '0–<10%', minimum: 0, maximum: 10 },
  { key: 'soc-10-20', label: '10–<20%', minimum: 10, maximum: 20 },
  { key: 'soc-20-50', label: '20–<50%', minimum: 20, maximum: 50 },
  { key: 'soc-50-80', label: '50–<80%', minimum: 50, maximum: 80 },
  {
    key: 'soc-80-100',
    label: '80–100%',
    minimum: 80,
    maximum: 100,
    isMaximumInclusive: true,
  },
] as const satisfies readonly MetricBandDefinition[]

export const STATE_OF_HEALTH_BANDS = [
  { key: 'soh-80-85', label: '80–<85%', minimum: 80, maximum: 85 },
  { key: 'soh-85-90', label: '85–<90%', minimum: 85, maximum: 90 },
  { key: 'soh-90-95', label: '90–<95%', minimum: 90, maximum: 95 },
  {
    key: 'soh-95-100',
    label: '95–100%',
    minimum: 95,
    maximum: 100,
    isMaximumInclusive: true,
  },
] as const satisfies readonly MetricBandDefinition[]

export const TEMPERATURE_BANDS = [
  {
    key: 'temperature-20-30',
    label: '20–<30 °C',
    minimum: 20,
    maximum: 30,
  },
  {
    key: 'temperature-30-40',
    label: '30–<40 °C',
    minimum: 30,
    maximum: 40,
  },
  {
    key: 'temperature-40-45',
    label: '40–45 °C',
    minimum: 40,
    maximum: 45,
    isMaximumInclusive: true,
  },
] as const satisfies readonly MetricBandDefinition[]

export type RecordedPowerSnapshot = {
  readonly chargingWatts: number
  readonly dischargingWatts: number
  readonly netWatts: number
  readonly contributingBatteryCount: number
  readonly earliestReadingMs: number | null
  readonly latestReadingMs: number | null
}

export type SnapshotChartData = {
  readonly priorities: readonly CategoryCount<ReviewPriority>[]
  readonly reasons: readonly CategoryCount<ReviewReasonCode>[]
  readonly statuses: readonly CategoryCount<TelemetryStatus>[]
  readonly stateOfChargeBands: readonly MetricBandCount[]
  readonly stateOfHealthBands: readonly MetricBandCount[]
  readonly temperatureBands: readonly MetricBandCount[]
  readonly recordedPower: RecordedPowerSnapshot
}

export type DistributionSummary = {
  readonly eventCount: number
  readonly batteryCount: number
  readonly minimum: number | null
  readonly p10: number | null
  readonly p25: number | null
  readonly median: number | null
  readonly mean: number | null
  readonly p75: number | null
  readonly p90: number | null
  readonly maximum: number | null
  readonly iqr: number | null
  readonly first: number | null
  readonly latest: number | null
  readonly observedDelta: number | null
  readonly firstTimestampMs: number | null
  readonly latestTimestampMs: number | null
}

export type HistogramBin = {
  readonly minimum: number
  readonly maximum: number
  readonly isMaximumInclusive: boolean
  readonly count: number
  readonly percentage: number
}

export type HistogramData = {
  readonly metric: TelemetryMetricKey
  readonly bins: readonly HistogramBin[]
  readonly summary: DistributionSummary
}

export type FleetTrendOptions = {
  readonly metric: TelemetryMetricKey
  readonly fromMs: number
  readonly toMs: number
  readonly bucketCount?: number
}

export type FleetTrendBucket = {
  readonly startMs: number
  readonly endMsExclusive: number
  readonly median: number | null
  readonly p10: number | null
  readonly p90: number | null
  readonly batteryCount: number
  readonly eventCount: number
}

export type BatteryTrendOptions = {
  readonly batteryId: string
  readonly metric: TelemetryMetricKey
  readonly fromMs?: number
  readonly toMs?: number
  readonly gapThresholdMs?: number
}

export type BatteryTrendPoint = {
  readonly eventId: string
  readonly timestampMs: number
  readonly value: number
  readonly status: TelemetryStatus
  readonly primaryPriority: ReviewPriority
  readonly reasonCodes: readonly ReviewReasonCode[]
  readonly gapBeforeMs: number | null
}

export type ObservationGap = {
  readonly fromEventId: string
  readonly toEventId: string
  readonly fromMs: number
  readonly toMs: number
  readonly durationMs: number
}

export type MetricThreshold = {
  readonly value: number
  readonly label: string
}

export type BatteryTrendData = {
  readonly batteryId: string
  readonly metric: TelemetryMetricKey
  readonly rows: readonly TelemetryEventRow[]
  readonly points: readonly BatteryTrendPoint[]
  readonly gaps: readonly ObservationGap[]
  readonly thresholds: readonly MetricThreshold[]
  readonly summary: DistributionSummary
}

export type StatusComparisonGroup = {
  readonly status: TelemetryStatus
  readonly summary: DistributionSummary
}

function toPercentage(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100
}

function quantile(sortedValues: readonly number[], percentile: number): number {
  if (sortedValues.length === 0) return 0

  const position = (sortedValues.length - 1) * percentile
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  const lower = sortedValues[lowerIndex] ?? 0
  const upper = sortedValues[upperIndex] ?? lower

  return lower + (upper - lower) * (position - lowerIndex)
}

function buildCategoryCounts<Key extends string>(
  keys: readonly Key[],
  labels: Readonly<Record<Key, string>>,
  total: number,
  getCount: (key: Key) => number,
): readonly CategoryCount<Key>[] {
  return keys.map((key) => {
    const count = getCount(key)
    return { key, label: labels[key], count, percentage: toPercentage(count, total) }
  })
}

export function buildBandDistribution(
  rows: readonly TelemetryEventRow[],
  metric: TelemetryMetricKey,
  bands: readonly MetricBandDefinition[],
): readonly MetricBandCount[] {
  return bands.map((band) => {
    const count = rows.filter((row) => {
      const value = getTelemetryMetricValue(row.event, metric)
      return (
        value >= band.minimum &&
        (value < band.maximum ||
          (band.isMaximumInclusive === true && value === band.maximum))
      )
    }).length

    return {
      ...band,
      count,
      percentage: toPercentage(count, rows.length),
    }
  })
}

export function buildSnapshotChartData(
  rows: readonly BatteryTableRow[],
): SnapshotChartData {
  const priorityKeys = ['critical', 'low', 'metric', 'none'] as const
  const priorityLabels: Readonly<Record<ReviewPriority, string>> = {
    critical: 'Critical charge',
    low: 'Low charge',
    metric: 'Metric review',
    none: 'No rule match',
  }
  const reasonKeys = [
    'critical-charge',
    'low-charge',
    'high-temperature',
    'low-health',
  ] as const
  const reasonLabels: Readonly<Record<ReviewReasonCode, string>> = {
    'critical-charge': REVIEW_REASON_DEFINITIONS['critical-charge'].label,
    'low-charge': REVIEW_REASON_DEFINITIONS['low-charge'].label,
    'high-temperature': REVIEW_REASON_DEFINITIONS['high-temperature'].label,
    'low-health': REVIEW_REASON_DEFINITIONS['low-health'].label,
  }
  const statusKeys = ['charging', 'discharging', 'idle'] as const
  const statusLabels: Readonly<Record<TelemetryStatus, string>> = {
    charging: 'Charging',
    discharging: 'Discharging',
    idle: 'Idle',
  }
  let chargingWatts = 0
  let dischargingWatts = 0
  let earliestReadingMs: number | null = null
  let latestReadingMs: number | null = null

  for (const row of rows) {
    if (row.recordedPowerWatts > 0) chargingWatts += row.recordedPowerWatts
    else dischargingWatts += Math.abs(row.recordedPowerWatts)

    earliestReadingMs =
      earliestReadingMs === null
        ? row.event.timestampMs
        : Math.min(earliestReadingMs, row.event.timestampMs)
    latestReadingMs =
      latestReadingMs === null
        ? row.event.timestampMs
        : Math.max(latestReadingMs, row.event.timestampMs)
  }

  return {
    priorities: buildCategoryCounts(
      priorityKeys,
      priorityLabels,
      rows.length,
      (key) => rows.filter((row) => row.primaryPriority === key).length,
    ),
    reasons: buildCategoryCounts(
      reasonKeys,
      reasonLabels,
      rows.length,
      (key) => rows.filter((row) => row.reasonCodes.includes(key)).length,
    ),
    statuses: buildCategoryCounts(
      statusKeys,
      statusLabels,
      rows.length,
      (key) => rows.filter((row) => row.event.status === key).length,
    ),
    stateOfChargeBands: buildBandDistribution(
      rows,
      'stateOfCharge',
      STATE_OF_CHARGE_BANDS,
    ),
    stateOfHealthBands: buildBandDistribution(
      rows,
      'stateOfHealth',
      STATE_OF_HEALTH_BANDS,
    ),
    temperatureBands: buildBandDistribution(
      rows,
      'temperature',
      TEMPERATURE_BANDS,
    ),
    recordedPower: {
      chargingWatts,
      dischargingWatts,
      netWatts: chargingWatts - dischargingWatts,
      contributingBatteryCount: rows.length,
      earliestReadingMs,
      latestReadingMs,
    },
  }
}

export function summarizeMetric(
  rows: readonly TelemetryEventRow[],
  metric: TelemetryMetricKey,
): DistributionSummary {
  if (rows.length === 0) {
    return {
      eventCount: 0,
      batteryCount: 0,
      minimum: null,
      p10: null,
      p25: null,
      median: null,
      mean: null,
      p75: null,
      p90: null,
      maximum: null,
      iqr: null,
      first: null,
      latest: null,
      observedDelta: null,
      firstTimestampMs: null,
      latestTimestampMs: null,
    }
  }

  const values = rows
    .map((row) => getTelemetryMetricValue(row.event, metric))
    .sort((left, right) => left - right)
  const chronologicalRows = [...rows].sort(
    (left, right) =>
      left.event.timestampMs - right.event.timestampMs ||
      left.event.id.localeCompare(right.event.id),
  )
  const firstRow = chronologicalRows[0]
  const latestRow = chronologicalRows.at(-1)
  const batteryCount = new Set(rows.map((row) => row.event.batteryId)).size
  const isSingleBattery = batteryCount === 1
  const first = isSingleBattery && firstRow
    ? getTelemetryMetricValue(firstRow.event, metric)
    : null
  const latest = isSingleBattery && latestRow
    ? getTelemetryMetricValue(latestRow.event, metric)
    : null
  const p25 = quantile(values, 0.25)
  const p75 = quantile(values, 0.75)

  return {
    eventCount: rows.length,
    batteryCount,
    minimum: values[0] ?? null,
    p10: quantile(values, 0.1),
    p25,
    median: quantile(values, 0.5),
    mean: values.reduce((total, value) => total + value, 0) / values.length,
    p75,
    p90: quantile(values, 0.9),
    maximum: values.at(-1) ?? null,
    iqr: p75 - p25,
    first,
    latest,
    observedDelta: first === null || latest === null ? null : latest - first,
    firstTimestampMs: firstRow?.event.timestampMs ?? null,
    latestTimestampMs: latestRow?.event.timestampMs ?? null,
  }
}

export function buildHistogram(
  rows: readonly TelemetryEventRow[],
  metric: TelemetryMetricKey,
  requestedBinCount = 10,
): HistogramData {
  const summary = summarizeMetric(rows, metric)
  if (summary.minimum === null || summary.maximum === null) {
    return { metric, bins: [], summary }
  }
  const minimum = summary.minimum
  const maximum = summary.maximum

  if (minimum === maximum) {
    return {
      metric,
      bins: [
        {
          minimum,
          maximum,
          isMaximumInclusive: true,
          count: rows.length,
          percentage: rows.length === 0 ? 0 : 100,
        },
      ],
      summary,
    }
  }

  const binCount = Math.min(
    MAX_HISTOGRAM_BIN_COUNT,
    Math.max(1, Math.trunc(requestedBinCount)),
  )
  const width = (maximum - minimum) / binCount
  const counts = Array.from({ length: binCount }, () => 0)

  for (const row of rows) {
    const value = getTelemetryMetricValue(row.event, metric)
    const index = Math.min(
      binCount - 1,
      Math.floor((value - minimum) / width),
    )
    counts[index] = (counts[index] ?? 0) + 1
  }

  return {
    metric,
    bins: counts.map((count, index) => ({
      minimum: minimum + width * index,
      maximum: minimum + width * (index + 1),
      isMaximumInclusive: index === binCount - 1,
      count,
      percentage: toPercentage(count, rows.length),
    })),
    summary,
  }
}

export function buildFleetTrend(
  rows: readonly TelemetryEventRow[],
  options: FleetTrendOptions,
): readonly FleetTrendBucket[] {
  if (options.toMs < options.fromMs) return []

  const requestedBucketCount = Math.min(
    MAX_BUCKET_COUNT,
    Math.max(1, Math.trunc(options.bucketCount ?? 60)),
  )
  const spanMs = options.toMs - options.fromMs + 1
  const bucketSizeMs = Math.max(1, Math.ceil(spanMs / requestedBucketCount))
  const bucketCount = Math.ceil(spanMs / bucketSizeMs)
  const buckets = Array.from({ length: bucketCount }, () => ({
    eventCount: 0,
    batteryValues: new Map<string, { sum: number; count: number }>(),
  }))

  for (const row of rows) {
    const timestampMs = row.event.timestampMs
    if (timestampMs < options.fromMs || timestampMs > options.toMs) continue

    const bucketIndex = Math.min(
      bucketCount - 1,
      Math.floor((timestampMs - options.fromMs) / bucketSizeMs),
    )
    const bucket = buckets[bucketIndex]
    if (!bucket) continue

    const current = bucket.batteryValues.get(row.event.batteryId) ?? {
      sum: 0,
      count: 0,
    }
    bucket.batteryValues.set(row.event.batteryId, {
      sum: current.sum + getTelemetryMetricValue(row.event, options.metric),
      count: current.count + 1,
    })
    bucket.eventCount += 1
  }

  return buckets.map((bucket, index) => {
    const batteryMeans = [...bucket.batteryValues.values()]
      .map(({ sum, count }) => sum / count)
      .sort((left, right) => left - right)
    const startMs = options.fromMs + index * bucketSizeMs

    return {
      startMs,
      endMsExclusive: Math.min(options.toMs + 1, startMs + bucketSizeMs),
      median:
        batteryMeans.length === 0 ? null : quantile(batteryMeans, 0.5),
      p10: batteryMeans.length === 0 ? null : quantile(batteryMeans, 0.1),
      p90: batteryMeans.length === 0 ? null : quantile(batteryMeans, 0.9),
      batteryCount: batteryMeans.length,
      eventCount: bucket.eventCount,
    }
  })
}

function getMetricThresholds(
  metric: TelemetryMetricKey,
): readonly MetricThreshold[] {
  switch (metric) {
    case 'stateOfCharge':
      return [
        { value: 10, label: 'Critical charge review rule' },
        { value: 20, label: 'Low charge review rule' },
      ]
    case 'stateOfHealth':
      return [{ value: 85, label: 'Health review rule' }]
    case 'temperature':
      return [{ value: 40, label: 'Temperature review rule' }]
    case 'current':
    case 'recordedPower':
      return [{ value: 0, label: 'Direction boundary' }]
    case 'voltage':
      return []
  }
}

export function buildBatteryTrend(
  rows: readonly TelemetryEventRow[],
  options: BatteryTrendOptions,
): BatteryTrendData {
  const gapThresholdMs = Math.max(
    0,
    options.gapThresholdMs ?? HOURS_24_MS,
  )
  const batteryRows = rows
    .filter(
      (row) =>
        row.event.batteryId === options.batteryId &&
        (options.fromMs === undefined ||
          row.event.timestampMs >= options.fromMs) &&
        (options.toMs === undefined || row.event.timestampMs <= options.toMs),
    )
    .sort(
      (left, right) =>
        left.event.timestampMs - right.event.timestampMs ||
        left.event.id.localeCompare(right.event.id),
    )
  const points: BatteryTrendPoint[] = []
  const gaps: ObservationGap[] = []

  for (const [index, row] of batteryRows.entries()) {
    const previousRow = batteryRows[index - 1]
    const gapBeforeMs = previousRow
      ? row.event.timestampMs - previousRow.event.timestampMs
      : null

    points.push({
      eventId: row.event.id,
      timestampMs: row.event.timestampMs,
      value: getTelemetryMetricValue(row.event, options.metric),
      status: row.event.status,
      primaryPriority: row.primaryPriority,
      reasonCodes: row.reasonCodes,
      gapBeforeMs,
    })

    if (
      previousRow &&
      gapBeforeMs !== null &&
      gapBeforeMs > gapThresholdMs
    ) {
      gaps.push({
        fromEventId: previousRow.event.id,
        toEventId: row.event.id,
        fromMs: previousRow.event.timestampMs,
        toMs: row.event.timestampMs,
        durationMs: gapBeforeMs,
      })
    }
  }

  return {
    batteryId: options.batteryId,
    metric: options.metric,
    rows: batteryRows,
    points,
    gaps,
    thresholds: getMetricThresholds(options.metric),
    summary: summarizeMetric(batteryRows, options.metric),
  }
}

export function buildStatusComparison(
  rows: readonly TelemetryEventRow[],
  metric: TelemetryMetricKey,
): readonly StatusComparisonGroup[] {
  const statuses = ['charging', 'discharging', 'idle'] as const

  return statuses.map((status) => ({
    status,
    summary: summarizeMetric(
      rows.filter((row) => row.event.status === status),
      metric,
    ),
  }))
}
