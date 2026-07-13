import type { TelemetryEventRow } from '@/lib/telemetry-queries'
import type { TelemetryMetricKey } from '@/lib/telemetry-policy'
import type { TelemetryStatus } from '@/types/telemetry'

export const BATTERY_CHART_METRICS = [
  'voltage',
  'current',
  'temperature',
  'stateOfCharge',
  'stateOfHealth',
  'recordedPower',
] as const

export type BatteryChartMetric = (typeof BATTERY_CHART_METRICS)[number]

export type BatteryChartPoint = {
  readonly eventId: string | null
  readonly timestampMs: number
  readonly status: TelemetryStatus | null
  readonly voltage: number | null
  readonly current: number | null
  readonly temperature: number | null
  readonly stateOfCharge: number | null
  readonly stateOfHealth: number | null
  readonly recordedPower: number | null
}

export const BATTERY_PROFILE_PERIODS = {
  daily: { bucketCount: 24, durationMs: 24 * 60 * 60 * 1000 },
  weekly: { bucketCount: 7, durationMs: 7 * 24 * 60 * 60 * 1000 },
  monthly: { bucketCount: 30, durationMs: 30 * 24 * 60 * 60 * 1000 },
  yearly: { bucketCount: 12, durationMs: 365 * 24 * 60 * 60 * 1000 },
} as const

export type BatteryProfilePeriod = keyof typeof BATTERY_PROFILE_PERIODS

export type BatteryProfileBucket = {
  readonly startMs: number
  readonly endMs: number
  readonly eventCount: number
  readonly values: Readonly<Record<TelemetryMetricKey, number | null>>
}

function recordedMetricValue(
  row: TelemetryEventRow,
  metric: TelemetryMetricKey,
): number {
  return metric === 'recordedPower'
    ? row.recordedPowerWatts
    : row.event.metrics[metric]
}

export function buildBatteryTelemetryProfile(
  rows: readonly TelemetryEventRow[],
  period: BatteryProfilePeriod,
): readonly BatteryProfileBucket[] {
  if (rows.length === 0) return []

  const definition = BATTERY_PROFILE_PERIODS[period]
  const latestTimestampMs = rows.reduce(
    (latest, row) => Math.max(latest, row.event.timestampMs),
    Number.NEGATIVE_INFINITY,
  )
  const endMs = latestTimestampMs + 1
  const startMs = endMs - definition.durationMs
  const bucketDurationMs = definition.durationMs / definition.bucketCount
  const buckets = Array.from({ length: definition.bucketCount }, (_, index) => ({
    startMs: startMs + index * bucketDurationMs,
    endMs: startMs + (index + 1) * bucketDurationMs,
    rows: [] as TelemetryEventRow[],
  }))

  for (const row of rows) {
    const index = Math.floor(
      (row.event.timestampMs - startMs) / bucketDurationMs,
    )
    if (index >= 0 && index < buckets.length) buckets[index]!.rows.push(row)
  }

  return buckets.map((bucket) => ({
    startMs: bucket.startMs,
    endMs: bucket.endMs,
    eventCount: bucket.rows.length,
    values: Object.fromEntries(
      BATTERY_CHART_METRICS.map((metric) => [
        metric,
        bucket.rows.length === 0
          ? null
          : bucket.rows.reduce(
              (sum, row) => sum + recordedMetricValue(row, metric),
              0,
            ) / bucket.rows.length,
      ]),
    ) as Record<TelemetryMetricKey, number | null>,
  }))
}

const CHART_OVERSCAN_RATIO = 0.62

export function getBatteryChartRenderPoints(
  points: readonly BatteryChartPoint[],
  from: number,
  to: number,
): readonly BatteryChartPoint[] {
  if (points.length === 0) return points

  const overscan = Math.max(1, to - from) * CHART_OVERSCAN_RATIO
  const coverageFrom = from - overscan
  const coverageTo = to + overscan

  let start = 0
  while (start < points.length && points[start]!.timestampMs < coverageFrom) {
    start += 1
  }

  let end = start
  while (end < points.length && points[end]!.timestampMs <= coverageTo) {
    end += 1
  }

  return points.slice(Math.max(0, start - 1), Math.min(points.length, end + 1))
}

const GAP_THRESHOLD_MS = 24 * 60 * 60 * 1000

export function selectBatteryChartRows(
  rows: readonly TelemetryEventRow[],
  sampleCount: number,
): readonly TelemetryEventRow[] {
  const requestedCount = Math.max(0, Math.trunc(sampleCount))
  if (requestedCount === 0 || rows.length === 0) return []
  if (rows.length <= requestedCount) return rows
  if (requestedCount === 1) {
    const latestRow = rows.at(-1)
    return latestRow ? [latestRow] : []
  }

  return Array.from({ length: requestedCount }, (_, index) => {
    const rowIndex = Math.round(
      (index * (rows.length - 1)) / (requestedCount - 1),
    )
    return rows[rowIndex] as TelemetryEventRow
  })
}

export function buildBatteryChartPoints(
  rows: readonly TelemetryEventRow[],
  batteryId: string,
): readonly BatteryChartPoint[] {
  const batteryRows = rows
    .filter((row) => row.event.batteryId === batteryId)
    .sort(
      (left, right) =>
        left.event.timestampMs - right.event.timestampMs ||
        left.event.id.localeCompare(right.event.id),
    )
  const points: BatteryChartPoint[] = []

  for (const [index, row] of batteryRows.entries()) {
    const previous = batteryRows[index - 1]
    if (
      previous &&
      row.event.timestampMs - previous.event.timestampMs > GAP_THRESHOLD_MS
    ) {
      points.push({
        eventId: null,
        timestampMs:
          previous.event.timestampMs +
          (row.event.timestampMs - previous.event.timestampMs) / 2,
        status: null,
        voltage: null,
        current: null,
        temperature: null,
        stateOfCharge: null,
        stateOfHealth: null,
        recordedPower: null,
      })
    }

    points.push({
      eventId: row.event.id,
      timestampMs: row.event.timestampMs,
      status: row.event.status,
      voltage: row.event.metrics.voltage,
      current: row.event.metrics.current,
      temperature: row.event.metrics.temperature,
      stateOfCharge: row.event.metrics.stateOfCharge,
      stateOfHealth: row.event.metrics.stateOfHealth,
      recordedPower: row.recordedPowerWatts,
    })
  }

  return points
}
