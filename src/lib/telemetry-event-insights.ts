import type { ReviewReasonCode } from '@/lib/telemetry-policy'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'
import type { TelemetryStatus } from '@/types/telemetry'

const HOUR_MS = 60 * 60 * 1000
const MAX_ACTIVITY_BUCKETS = 72

export type TelemetryEventSummary = {
  readonly eventCount: number
  readonly batteryCount: number
  readonly firstTimestampMs: number | null
  readonly lastTimestampMs: number | null
  readonly statusCounts: Readonly<Record<TelemetryStatus, number>>
  readonly reasonCounts: Readonly<Record<ReviewReasonCode, number>>
  readonly reviewEventCount: number
  readonly multipleConditionCount: number
  readonly gapCounts: {
    readonly over24Hours: number
    readonly over48Hours: number
    readonly over72Hours: number
  }
  readonly longestGapMs: number
}

export type EventActivityBucket = {
  readonly startMs: number
  readonly endMsExclusive: number
  readonly charging: number
  readonly discharging: number
  readonly idle: number
  readonly reviewEventCount: number
  readonly multipleConditionCount: number
  readonly batteryCount: number
  readonly eventCount: number
}

export type EventActivityOptions = {
  readonly fromMs: number
  readonly toMs: number
  readonly bucketCount?: number
}

export function buildTelemetryEventSummary(
  rows: readonly TelemetryEventRow[],
): TelemetryEventSummary {
  const batteryIds = new Set<string>()
  const statusCounts: Record<TelemetryStatus, number> = {
    charging: 0,
    discharging: 0,
    idle: 0,
  }
  const reasonCounts: Record<ReviewReasonCode, number> = {
    'critical-charge': 0,
    'low-charge': 0,
    'high-temperature': 0,
    'low-health': 0,
  }
  let firstTimestampMs: number | null = null
  let lastTimestampMs: number | null = null
  let reviewEventCount = 0
  let multipleConditionCount = 0
  let over24Hours = 0
  let over48Hours = 0
  let over72Hours = 0
  let longestGapMs = 0

  for (const row of rows) {
    const timestampMs = row.event.timestampMs
    batteryIds.add(row.event.batteryId)
    statusCounts[row.event.status] += 1
    firstTimestampMs =
      firstTimestampMs === null
        ? timestampMs
        : Math.min(firstTimestampMs, timestampMs)
    lastTimestampMs =
      lastTimestampMs === null
        ? timestampMs
        : Math.max(lastTimestampMs, timestampMs)

    if (row.reasonCodes.length > 0) reviewEventCount += 1
    if (row.reasonCodes.length > 1) multipleConditionCount += 1
    for (const reason of row.reasonCodes) reasonCounts[reason] += 1

    const gapMs = row.gapBeforeMs ?? 0
    if (gapMs >= 24 * HOUR_MS) over24Hours += 1
    if (gapMs >= 48 * HOUR_MS) over48Hours += 1
    if (gapMs >= 72 * HOUR_MS) over72Hours += 1
    longestGapMs = Math.max(longestGapMs, gapMs)
  }

  return {
    eventCount: rows.length,
    batteryCount: batteryIds.size,
    firstTimestampMs,
    lastTimestampMs,
    statusCounts,
    reasonCounts,
    reviewEventCount,
    multipleConditionCount,
    gapCounts: { over24Hours, over48Hours, over72Hours },
    longestGapMs,
  }
}

export function buildEventActivity(
  rows: readonly TelemetryEventRow[],
  options: EventActivityOptions,
): readonly EventActivityBucket[] {
  if (options.toMs < options.fromMs) return []

  const requestedBucketCount = Math.min(
    MAX_ACTIVITY_BUCKETS,
    Math.max(1, Math.trunc(options.bucketCount ?? 36)),
  )
  const spanMs = options.toMs - options.fromMs + 1
  const bucketSizeMs = Math.max(1, Math.ceil(spanMs / requestedBucketCount))
  const bucketCount = Math.ceil(spanMs / bucketSizeMs)
  const buckets = Array.from({ length: bucketCount }, () => ({
    charging: 0,
    discharging: 0,
    idle: 0,
    reviewEventCount: 0,
    multipleConditionCount: 0,
    batteryIds: new Set<string>(),
    eventCount: 0,
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

    bucket[row.event.status] += 1
    bucket.eventCount += 1
    bucket.batteryIds.add(row.event.batteryId)
    if (row.reasonCodes.length > 0) bucket.reviewEventCount += 1
    if (row.reasonCodes.length > 1) bucket.multipleConditionCount += 1
  }

  return buckets.map((bucket, index) => {
    const startMs = options.fromMs + index * bucketSizeMs
    return {
      startMs,
      endMsExclusive: Math.min(options.toMs + 1, startMs + bucketSizeMs),
      charging: bucket.charging,
      discharging: bucket.discharging,
      idle: bucket.idle,
      reviewEventCount: bucket.reviewEventCount,
      multipleConditionCount: bucket.multipleConditionCount,
      batteryCount: bucket.batteryIds.size,
      eventCount: bucket.eventCount,
    }
  })
}
