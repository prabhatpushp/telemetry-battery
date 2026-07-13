import { getTelemetryMetricValue } from '@/lib/telemetry-policy'

import type {
  ReviewPriority,
  ReviewReasonCode,
  TelemetryMetricKey,
} from '@/lib/telemetry-policy'
import type {
  AsOfBatteryData,
  BatteryTableRow,
  TelemetryEventRow,
} from '@/lib/telemetry-queries'
import type { TelemetryStatus } from '@/types/telemetry'

const HOURS_24_MS = 24 * 60 * 60 * 1000

export const REVIEW_ACTIVITY_KEYS = [
  'critical-charge',
  'low-charge',
  'high-temperature',
  'low-health',
  'multi-condition',
] as const

export type ReviewActivityKey = (typeof REVIEW_ACTIVITY_KEYS)[number]

export type SynchronizedMetricValues = Readonly<
  Record<TelemetryMetricKey, number>
>

export type SynchronizedBatteryHistoryPoint = {
  readonly eventId: string
  readonly timestampMs: number
  readonly values: SynchronizedMetricValues
  readonly status: TelemetryStatus
  readonly primaryPriority: ReviewPriority
  readonly reasonCodes: readonly ReviewReasonCode[]
  readonly gapBeforeMs: number | null
}

export type StatusRibbonObservation = {
  readonly eventId: string
  readonly timestampMs: number
  readonly status: TelemetryStatus
}

export type BatteryObservationGap = {
  readonly batteryId: string
  readonly fromEventId: string
  readonly toEventId: string
  readonly fromMs: number
  readonly toMs: number
  readonly durationMs: number
  readonly thresholdMs: number
}

export type ObservationRun = {
  readonly eventCount: number
  readonly fromEventId: string
  readonly toEventId: string
  readonly fromMs: number
  readonly toMs: number
}

export type ConditionOccurrence = {
  readonly key: ReviewActivityKey
  readonly count: number
  readonly percentage: number
  readonly latestEventId: string | null
  readonly latestTimestampMs: number | null
  readonly longestObservationRun: ObservationRun | null
}

export type SynchronizedBatteryHistoryOptions = {
  readonly batteryId: string
  readonly fromMs?: number
  readonly toMs?: number
  readonly gapThresholdMs?: number
}

export type SynchronizedBatteryHistory = {
  readonly batteryId: string
  readonly points: readonly SynchronizedBatteryHistoryPoint[]
  readonly statusRibbon: readonly StatusRibbonObservation[]
  readonly gaps: readonly BatteryObservationGap[]
  readonly conditions: readonly ConditionOccurrence[]
  readonly eventCount: number
  readonly firstTimestampMs: number | null
  readonly latestTimestampMs: number | null
}

type MutableConditionOccurrence = {
  count: number
  latestEventId: string | null
  latestTimestampMs: number | null
  currentRunCount: number
  currentRunStartEventId: string | null
  currentRunStartMs: number | null
  longestObservationRun: ObservationRun | null
}

function createConditionOccurrenceState(): MutableConditionOccurrence {
  return {
    count: 0,
    latestEventId: null,
    latestTimestampMs: null,
    currentRunCount: 0,
    currentRunStartEventId: null,
    currentRunStartMs: null,
    longestObservationRun: null,
  }
}

function metricValuesForRow(
  row: TelemetryEventRow,
): SynchronizedMetricValues {
  return {
    stateOfCharge: row.event.metrics.stateOfCharge,
    stateOfHealth: row.event.metrics.stateOfHealth,
    voltage: row.event.metrics.voltage,
    current: row.event.metrics.current,
    temperature: row.event.metrics.temperature,
    recordedPower: row.recordedPowerWatts,
  }
}

function rowMatchesCondition(
  row: TelemetryEventRow,
  key: ReviewActivityKey,
): boolean {
  const distinctReasons = new Set(row.reasonCodes)
  return key === 'multi-condition'
    ? distinctReasons.size >= 2
    : distinctReasons.has(key)
}

export function buildSynchronizedBatteryHistory(
  rows: readonly TelemetryEventRow[],
  options: SynchronizedBatteryHistoryOptions,
): SynchronizedBatteryHistory {
  const hasValidRange =
    options.fromMs === undefined ||
    options.toMs === undefined ||
    options.fromMs <= options.toMs
  const selectedRows = hasValidRange
    ? rows
        .filter(
          (row) =>
            row.event.batteryId === options.batteryId &&
            (options.fromMs === undefined ||
              row.event.timestampMs >= options.fromMs) &&
            (options.toMs === undefined ||
              row.event.timestampMs <= options.toMs),
        )
        .sort(
          (left, right) =>
            left.event.timestampMs - right.event.timestampMs ||
            left.event.id.localeCompare(right.event.id),
        )
    : []
  const requestedGapThresholdMs = options.gapThresholdMs ?? HOURS_24_MS
  const gapThresholdMs = Number.isFinite(requestedGapThresholdMs)
    ? Math.max(0, requestedGapThresholdMs)
    : HOURS_24_MS
  const conditionState = Object.fromEntries(
    REVIEW_ACTIVITY_KEYS.map((key) => [key, createConditionOccurrenceState()]),
  ) as Record<ReviewActivityKey, MutableConditionOccurrence>
  const points: SynchronizedBatteryHistoryPoint[] = []
  const statusRibbon: StatusRibbonObservation[] = []
  const gaps: BatteryObservationGap[] = []

  for (const [index, row] of selectedRows.entries()) {
    const previousRow = selectedRows[index - 1]
    const gapBeforeMs = previousRow
      ? row.event.timestampMs - previousRow.event.timestampMs
      : null

    points.push({
      eventId: row.event.id,
      timestampMs: row.event.timestampMs,
      values: metricValuesForRow(row),
      status: row.event.status,
      primaryPriority: row.primaryPriority,
      reasonCodes: row.reasonCodes,
      gapBeforeMs,
    })
    statusRibbon.push({
      eventId: row.event.id,
      timestampMs: row.event.timestampMs,
      status: row.event.status,
    })

    if (previousRow && gapBeforeMs !== null && gapBeforeMs > gapThresholdMs) {
      gaps.push({
        batteryId: options.batteryId,
        fromEventId: previousRow.event.id,
        toEventId: row.event.id,
        fromMs: previousRow.event.timestampMs,
        toMs: row.event.timestampMs,
        durationMs: gapBeforeMs,
        thresholdMs: gapThresholdMs,
      })
    }

    for (const key of REVIEW_ACTIVITY_KEYS) {
      const state = conditionState[key]
      if (!rowMatchesCondition(row, key)) {
        state.currentRunCount = 0
        state.currentRunStartEventId = null
        state.currentRunStartMs = null
        continue
      }

      state.count += 1
      state.latestEventId = row.event.id
      state.latestTimestampMs = row.event.timestampMs

      if (state.currentRunCount === 0) {
        state.currentRunStartEventId = row.event.id
        state.currentRunStartMs = row.event.timestampMs
      }
      state.currentRunCount += 1

      if (
        state.currentRunCount >
          (state.longestObservationRun?.eventCount ?? 0) &&
        state.currentRunStartEventId !== null &&
        state.currentRunStartMs !== null
      ) {
        state.longestObservationRun = {
          eventCount: state.currentRunCount,
          fromEventId: state.currentRunStartEventId,
          toEventId: row.event.id,
          fromMs: state.currentRunStartMs,
          toMs: row.event.timestampMs,
        }
      }
    }
  }

  return {
    batteryId: options.batteryId,
    points,
    statusRibbon,
    gaps,
    conditions: REVIEW_ACTIVITY_KEYS.map((key) => {
      const state = conditionState[key]
      return {
        key,
        count: state.count,
        percentage:
          selectedRows.length === 0
            ? 0
            : (state.count / selectedRows.length) * 100,
        latestEventId: state.latestEventId,
        latestTimestampMs: state.latestTimestampMs,
        longestObservationRun: state.longestObservationRun,
      }
    }),
    eventCount: selectedRows.length,
    firstTimestampMs: selectedRows[0]?.event.timestampMs ?? null,
    latestTimestampMs: selectedRows.at(-1)?.event.timestampMs ?? null,
  }
}

export const PEER_METRIC_KEYS = [
  'stateOfCharge',
  'stateOfHealth',
  'voltage',
  'current',
  'temperature',
  'recordedPower',
  'absoluteCurrent',
  'absoluteRecordedPower',
  'observationAge',
] as const

export type PeerMetricKey = (typeof PEER_METRIC_KEYS)[number]

export type AsOfPeerComparisonOptions = {
  readonly batteryId: string
  readonly metric: PeerMetricKey
}

export type AsOfPeerComparison = {
  readonly batteryId: string
  readonly metric: PeerMetricKey
  readonly isRepresented: boolean
  readonly selectedValue: number | null
  readonly selectedEventId: string | null
  readonly selectedTimestampMs: number | null
  readonly p10: number | null
  readonly median: number | null
  readonly p90: number | null
  readonly percentile: number | null
  readonly representedBatteryCount: number
  readonly totalBatteryCount: number
  readonly referenceTimeMs: number | null
  readonly lookbackMs: number | null
}

function getPeerMetricValue(
  row: BatteryTableRow,
  metric: PeerMetricKey,
): number {
  if (metric === 'absoluteCurrent') {
    return Math.abs(row.event.metrics.current)
  }
  if (metric === 'absoluteRecordedPower') {
    return Math.abs(row.recordedPowerWatts)
  }
  if (metric === 'observationAge') return row.observationAgeMs
  return getTelemetryMetricValue(row.event, metric)
}

function quantile(
  sortedValues: readonly number[],
  percentile: number,
): number | null {
  if (sortedValues.length === 0) return null

  const position = (sortedValues.length - 1) * percentile
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  const lower = sortedValues[lowerIndex]
  const upper = sortedValues[upperIndex]

  if (lower === undefined) return null
  if (upper === undefined) return lower
  return lower + (upper - lower) * (position - lowerIndex)
}

function percentileRank(
  values: readonly number[],
  selectedValue: number,
): number {
  if (values.length <= 1) return 50

  let lowerCount = 0
  let equalCount = 0
  for (const value of values) {
    if (value < selectedValue) lowerCount += 1
    else if (value === selectedValue) equalCount += 1
  }

  return (
    ((lowerCount + (Math.max(1, equalCount) - 1) / 2) /
      (values.length - 1)) *
    100
  )
}

export function buildAsOfPeerComparison(
  data: AsOfBatteryData,
  options: AsOfPeerComparisonOptions,
): AsOfPeerComparison {
  const values = data.rows
    .map((row) => getPeerMetricValue(row, options.metric))
    .sort((left, right) => left - right)
  const selectedRow = data.rows.find(
    (row) => row.event.batteryId === options.batteryId,
  )
  const selectedValue = selectedRow
    ? getPeerMetricValue(selectedRow, options.metric)
    : null

  return {
    batteryId: options.batteryId,
    metric: options.metric,
    isRepresented: selectedRow !== undefined,
    selectedValue,
    selectedEventId: selectedRow?.event.id ?? null,
    selectedTimestampMs: selectedRow?.event.timestampMs ?? null,
    p10: quantile(values, 0.1),
    median: quantile(values, 0.5),
    p90: quantile(values, 0.9),
    percentile:
      selectedValue === null ? null : percentileRank(values, selectedValue),
    representedBatteryCount: data.representedBatteryCount,
    totalBatteryCount: data.totalBatteryCount,
    referenceTimeMs: data.referenceTimeMs,
    lookbackMs: data.lookbackMs,
  }
}
