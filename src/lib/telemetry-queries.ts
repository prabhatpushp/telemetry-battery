import {
  TELEMETRY_METRIC_KEYS,
  assessTelemetryEvent,
  getTelemetryMetricValue,
  recordedPowerWatts,
} from '@/lib/telemetry-policy'

import type {
  ReviewPriority,
  ReviewReasonCode,
  TelemetryMetricKey,
} from '@/lib/telemetry-policy'
import type {
  TelemetryEvent,
  TelemetrySnapshot,
  TelemetryStatus,
} from '@/types/telemetry'

const HOURS_24_MS = 24 * 60 * 60 * 1000

const PRIORITY_RANK: Readonly<Record<ReviewPriority, number>> = {
  critical: 0,
  low: 1,
  metric: 2,
  none: 3,
}

export const DEFAULT_AS_OF_LOOKBACK_MS = HOURS_24_MS

export type TelemetryEventRow = {
  readonly event: TelemetryEvent
  readonly recordedPowerWatts: number
  readonly primaryPriority: ReviewPriority
  readonly reasonCodes: readonly ReviewReasonCode[]
  readonly gapBeforeMs: number | null
}

export type BatteryTableRow = TelemetryEventRow & {
  readonly observationAgeMs: number
}

export type ReviewQueueRow = BatteryTableRow & {
  readonly primaryPriority: Exclude<ReviewPriority, 'none'>
}

export type AsOfBatteryOptions = {
  readonly referenceTimeMs?: number
  readonly lookbackMs?: number | null
}

export type AsOfBatteryData = {
  readonly rows: readonly BatteryTableRow[]
  readonly excludedBatteryIds: readonly string[]
  readonly referenceTimeMs: number | null
  readonly lookbackMs: number | null
  readonly totalBatteryCount: number
  readonly representedBatteryCount: number
  readonly earliestReadingMs: number | null
  readonly latestReadingMs: number | null
}

export type BatteryFleetData = {
  readonly eventRows: readonly TelemetryEventRow[]
  readonly asOfData: AsOfBatteryData
  readonly statusCounts: Readonly<Record<TelemetryStatus, number>>
}

export type MetricRange = {
  readonly minimum?: number
  readonly maximum?: number
}

export type MetricRanges = Partial<
  Readonly<Record<TelemetryMetricKey, MetricRange>>
>

export type SortDirection = 'ascending' | 'descending'

export type EventSort = {
  readonly field: 'timestamp' | 'batteryId' | TelemetryMetricKey
  readonly direction: SortDirection
}

export type EventQuery = {
  readonly search?: string
  readonly batteryIds?: readonly string[]
  readonly fromMs?: number
  readonly toMs?: number
  readonly statuses?: readonly TelemetryStatus[]
  readonly priorities?: readonly ReviewPriority[]
  readonly reasonCodes?: readonly ReviewReasonCode[]
  readonly minimumReasonCount?: number
  readonly metricRanges?: MetricRanges
  readonly minimumGapMs?: number
  readonly sort?: EventSort
  readonly offset?: number
  readonly limit?: number
}

export type EventQueryResult = {
  readonly rows: readonly TelemetryEventRow[]
  readonly matchingEventCount: number
  readonly matchingBatteryCount: number
}

export type BatterySort = {
  readonly field:
    | 'priority'
    | 'batteryId'
    | 'timestamp'
    | 'observationAge'
    | TelemetryMetricKey
  readonly direction: SortDirection
}

export type BatteryQuery = {
  readonly search?: string
  readonly statuses?: readonly TelemetryStatus[]
  readonly priorities?: readonly ReviewPriority[]
  readonly reasonCodes?: readonly ReviewReasonCode[]
  readonly metricRanges?: MetricRanges
  readonly sort?: BatterySort
}

export type BatteryQueryResult = {
  readonly rows: readonly BatteryTableRow[]
  readonly matchingBatteryCount: number
}

function compareValues(
  left: number | string,
  right: number | string,
): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  return String(left).localeCompare(String(right))
}

function getEventSortValue(
  row: TelemetryEventRow,
  field: EventSort['field'],
): number | string {
  if (field === 'timestamp') return row.event.timestampMs
  if (field === 'batteryId') return row.event.batteryId
  return getTelemetryMetricValue(row.event, field)
}

function getBatterySortValue(
  row: BatteryTableRow,
  field: BatterySort['field'],
): number | string {
  if (field === 'priority') return PRIORITY_RANK[row.primaryPriority]
  if (field === 'batteryId') return row.event.batteryId
  if (field === 'timestamp') return row.event.timestampMs
  if (field === 'observationAge') return row.observationAgeMs
  return getTelemetryMetricValue(row.event, field)
}

function matchesMetricRanges(
  row: TelemetryEventRow,
  ranges: MetricRanges | undefined,
): boolean {
  if (!ranges) return true

  for (const metric of TELEMETRY_METRIC_KEYS) {
    const range = ranges[metric]
    if (!range) continue

    const value = getTelemetryMetricValue(row.event, metric)
    if (range.minimum !== undefined && value < range.minimum) return false
    if (range.maximum !== undefined && value > range.maximum) return false
  }

  return true
}

function matchesReasonCodes(
  row: TelemetryEventRow,
  reasonCodes: readonly ReviewReasonCode[] | undefined,
): boolean {
  if (!reasonCodes) return true
  return reasonCodes.some((reasonCode) =>
    row.reasonCodes.includes(reasonCode),
  )
}

export function buildEventRows(
  snapshot: TelemetrySnapshot,
): readonly TelemetryEventRow[] {
  const previousTimestampByBattery = new Map<string, number>()

  return snapshot.events.map((event) => {
    const previousTimestampMs = previousTimestampByBattery.get(event.batteryId)
    const assessment = assessTelemetryEvent(event)

    previousTimestampByBattery.set(event.batteryId, event.timestampMs)

    return {
      event,
      recordedPowerWatts: recordedPowerWatts(event),
      primaryPriority: assessment.priority,
      reasonCodes: assessment.reasonCodes,
      gapBeforeMs:
        previousTimestampMs === undefined
          ? null
          : event.timestampMs - previousTimestampMs,
    }
  })
}

export function buildAsOfBatteryRows(
  eventRows: readonly TelemetryEventRow[],
  options: AsOfBatteryOptions = {},
): AsOfBatteryData {
  const defaultReferenceTimeMs = eventRows.reduce<number | null>(
    (latestTimestampMs, row) =>
      latestTimestampMs === null
        ? row.event.timestampMs
        : Math.max(latestTimestampMs, row.event.timestampMs),
    null,
  )
  const referenceTimeMs = options.referenceTimeMs ?? defaultReferenceTimeMs
  const requestedLookbackMs =
    options.lookbackMs === undefined
      ? DEFAULT_AS_OF_LOOKBACK_MS
      : options.lookbackMs
  const lookbackMs =
    requestedLookbackMs === null
      ? null
      : Math.max(0, requestedLookbackMs)
  const batteryIds = [
    ...new Set(eventRows.map((row) => row.event.batteryId)),
  ].sort()

  if (referenceTimeMs === null) {
    return {
      rows: [],
      excludedBatteryIds: batteryIds,
      referenceTimeMs,
      lookbackMs,
      totalBatteryCount: batteryIds.length,
      representedBatteryCount: 0,
      earliestReadingMs: null,
      latestReadingMs: null,
    }
  }

  const latestRowByBattery = new Map<string, TelemetryEventRow>()

  for (const row of eventRows) {
    if (row.event.timestampMs > referenceTimeMs) continue

    const latestRow = latestRowByBattery.get(row.event.batteryId)
    if (!latestRow || row.event.timestampMs > latestRow.event.timestampMs) {
      latestRowByBattery.set(row.event.batteryId, row)
    }
  }

  const rows: BatteryTableRow[] = []
  const representedBatteryIds = new Set<string>()
  let earliestReadingMs: number | null = null
  let latestReadingMs: number | null = null

  for (const row of latestRowByBattery.values()) {
    const observationAgeMs = referenceTimeMs - row.event.timestampMs
    if (lookbackMs !== null && observationAgeMs > lookbackMs) continue

    rows.push({ ...row, observationAgeMs })
    representedBatteryIds.add(row.event.batteryId)
    earliestReadingMs =
      earliestReadingMs === null
        ? row.event.timestampMs
        : Math.min(earliestReadingMs, row.event.timestampMs)
    latestReadingMs =
      latestReadingMs === null
        ? row.event.timestampMs
        : Math.max(latestReadingMs, row.event.timestampMs)
  }

  rows.sort((left, right) =>
    left.event.batteryId.localeCompare(right.event.batteryId),
  )

  return {
    rows,
    excludedBatteryIds: batteryIds.filter(
      (batteryId) => !representedBatteryIds.has(batteryId),
    ),
    referenceTimeMs,
    lookbackMs,
    totalBatteryCount: batteryIds.length,
    representedBatteryCount: rows.length,
    earliestReadingMs,
    latestReadingMs,
  }
}

export function buildBatteryFleetData(
  snapshot: TelemetrySnapshot,
): BatteryFleetData {
  const eventRows = buildEventRows(snapshot)
  const asOfData = buildAsOfBatteryRows(eventRows, {
    lookbackMs: null,
  })
  const statusCounts: Record<TelemetryStatus, number> = {
    charging: 0,
    discharging: 0,
    idle: 0,
  }

  for (const row of asOfData.rows) statusCounts[row.event.status] += 1

  return { eventRows, asOfData, statusCounts }
}

function getReviewQueueRank(row: ReviewQueueRow): number {
  if (row.primaryPriority === 'critical') {
    return row.event.status === 'discharging' ? 0 : 1
  }

  if (row.primaryPriority === 'low') {
    return row.event.status === 'discharging' ? 2 : 3
  }

  if (row.primaryPriority === 'metric') {
    return row.reasonCodes.length > 1 ? 4 : 5
  }

  return 6
}

export function buildReviewQueue(
  rows: readonly BatteryTableRow[],
): readonly ReviewQueueRow[] {
  return rows
    .filter(
      (row): row is ReviewQueueRow => row.primaryPriority !== 'none',
    )
    .sort(
      (left, right) =>
        getReviewQueueRank(left) - getReviewQueueRank(right) ||
        left.event.metrics.stateOfCharge -
          right.event.metrics.stateOfCharge ||
        right.event.timestampMs - left.event.timestampMs ||
        left.event.batteryId.localeCompare(right.event.batteryId),
    )
}

export function queryEventRows(
  rows: readonly TelemetryEventRow[],
  query: EventQuery = {},
): EventQueryResult {
  const normalizedSearch = query.search?.trim().toLocaleLowerCase() ?? ''
  const matchingRows = rows.filter((row) => {
    if (
      normalizedSearch.length > 0 &&
      !row.event.id.toLocaleLowerCase().includes(normalizedSearch) &&
      !row.event.batteryId.toLocaleLowerCase().includes(normalizedSearch)
    ) {
      return false
    }

    if (
      query.batteryIds &&
      !query.batteryIds.includes(row.event.batteryId)
    ) {
      return false
    }

    if (query.fromMs !== undefined && row.event.timestampMs < query.fromMs) {
      return false
    }

    if (query.toMs !== undefined && row.event.timestampMs > query.toMs) {
      return false
    }

    if (query.statuses && !query.statuses.includes(row.event.status)) {
      return false
    }

    if (
      query.priorities &&
      !query.priorities.includes(row.primaryPriority)
    ) {
      return false
    }

    if (!matchesReasonCodes(row, query.reasonCodes)) return false
    if (
      query.minimumReasonCount !== undefined &&
      row.reasonCodes.length < query.minimumReasonCount
    ) {
      return false
    }
    if (!matchesMetricRanges(row, query.metricRanges)) return false

    return !(
      query.minimumGapMs !== undefined &&
      (row.gapBeforeMs === null || row.gapBeforeMs < query.minimumGapMs)
    )
  })
  const sort = query.sort ?? {
    field: 'timestamp',
    direction: 'descending',
  }
  const direction = sort.direction === 'ascending' ? 1 : -1

  matchingRows.sort(
    (left, right) =>
      compareValues(
        getEventSortValue(left, sort.field),
        getEventSortValue(right, sort.field),
      ) * direction || left.event.id.localeCompare(right.event.id),
  )

  const offset = Math.max(0, Math.trunc(query.offset ?? 0))
  const limit =
    query.limit === undefined
      ? matchingRows.length
      : Math.max(0, Math.trunc(query.limit))

  return {
    rows: matchingRows.slice(offset, offset + limit),
    matchingEventCount: matchingRows.length,
    matchingBatteryCount: new Set(
      matchingRows.map((row) => row.event.batteryId),
    ).size,
  }
}

export function queryBatteryRows(
  rows: readonly BatteryTableRow[],
  query: BatteryQuery = {},
): BatteryQueryResult {
  const normalizedSearch = query.search?.trim().toLocaleLowerCase() ?? ''
  const matchingRows = rows.filter((row) => {
    if (
      normalizedSearch.length > 0 &&
      !row.event.batteryId.toLocaleLowerCase().includes(normalizedSearch)
    ) {
      return false
    }

    if (query.statuses && !query.statuses.includes(row.event.status)) {
      return false
    }

    if (
      query.priorities &&
      !query.priorities.includes(row.primaryPriority)
    ) {
      return false
    }

    return (
      matchesReasonCodes(row, query.reasonCodes) &&
      matchesMetricRanges(row, query.metricRanges)
    )
  })
  const sort = query.sort ?? {
    field: 'priority',
    direction: 'ascending',
  }
  const direction = sort.direction === 'ascending' ? 1 : -1

  matchingRows.sort(
    (left, right) =>
      compareValues(
        getBatterySortValue(left, sort.field),
        getBatterySortValue(right, sort.field),
      ) * direction ||
      left.event.batteryId.localeCompare(right.event.batteryId),
  )

  return {
    rows: matchingRows,
    matchingBatteryCount: matchingRows.length,
  }
}
