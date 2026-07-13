import type { TelemetryEvent, TelemetrySnapshot } from '@/types/telemetry'
import type { OverviewSummary } from '@/lib/build-overview-summary'

export const TELEMETRY_SNAPSHOT_CHUNK_SIZE = 500

export type TelemetryWorkerRequest = {
  type: 'load'
  requestId: number
  url: string
}

export type TelemetryWorkerErrorCode =
  | 'request-failed'
  | 'timeout'
  | 'invalid-json'
  | 'invalid-dataset'
  | 'duplicate-event-id'

export type SerializedTelemetryError = {
  code: TelemetryWorkerErrorCode
  message: string
  retryable: boolean
  statusCode: number | null
}

export type TelemetrySnapshotMetadata = Omit<TelemetrySnapshot, 'events'>

export type TelemetryWorkerResponse =
  | {
      type: 'snapshot-chunk'
      requestId: number
      chunkIndex: number
      events: readonly TelemetryEvent[]
    }
  | {
      type: 'ready'
      requestId: number
      chunkCount: number
      metadata: TelemetrySnapshotMetadata
      overviewSummary: OverviewSummary
    }
  | {
      type: 'failed'
      requestId: number
      error: SerializedTelemetryError
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isTelemetryWorkerErrorCode(
  value: unknown,
): value is TelemetryWorkerErrorCode {
  return (
    value === 'request-failed' ||
    value === 'timeout' ||
    value === 'invalid-json' ||
    value === 'invalid-dataset' ||
    value === 'duplicate-event-id'
  )
}

function isTelemetryMetrics(value: unknown): boolean {
  if (!isRecord(value)) return false

  return (
    isFiniteNumber(value.voltage) &&
    isFiniteNumber(value.current) &&
    isFiniteNumber(value.temperature) &&
    isFiniteNumber(value.stateOfCharge) &&
    isFiniteNumber(value.stateOfHealth)
  )
}

function isTelemetryEvent(value: unknown): value is TelemetryEvent {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.batteryId === 'string' &&
    value.batteryId.length > 0 &&
    typeof value.timestamp === 'string' &&
    value.timestamp.length > 0 &&
    isFiniteNumber(value.timestampMs) &&
    isTelemetryMetrics(value.metrics) &&
    (value.status === 'charging' ||
      value.status === 'discharging' ||
      value.status === 'idle')
  )
}

function isTelemetrySnapshotMetadata(
  value: unknown,
): value is TelemetrySnapshotMetadata {
  if (!isRecord(value) || !Array.isArray(value.batteryIds)) return false

  const batteryIds = value.batteryIds
  if (
    !batteryIds.every(
      (batteryId) => typeof batteryId === 'string' && batteryId.length > 0,
    ) ||
    new Set(batteryIds).size !== batteryIds.length ||
    !isNonNegativeSafeInteger(value.eventCount) ||
    !isNonNegativeSafeInteger(value.batteryCount) ||
    value.batteryCount !== batteryIds.length
  ) {
    return false
  }

  if (value.eventCount === 0) {
    return (
      value.batteryCount === 0 &&
      value.firstTimestampMs === null &&
      value.lastTimestampMs === null
    )
  }

  return (
    value.batteryCount > 0 &&
    isFiniteNumber(value.firstTimestampMs) &&
    isFiniteNumber(value.lastTimestampMs) &&
    value.firstTimestampMs <= value.lastTimestampMs
  )
}

function isOverviewSummary(value: unknown): value is OverviewSummary {
  if (!isRecord(value)) return false

  return (
    Array.isArray(value.batteryGroups) &&
    Array.isArray(value.attentionBatteries) &&
    isNonNegativeSafeInteger(value.attentionCount) &&
    value.attentionCount === value.attentionBatteries.length &&
    isFiniteNumber(value.chargingKilowatts) &&
    isFiniteNumber(value.dischargingKilowatts) &&
    isFiniteNumber(value.netKilowatts) &&
    (value.earliestReadingMs === null ||
      isFiniteNumber(value.earliestReadingMs)) &&
    (value.latestReadingMs === null || isFiniteNumber(value.latestReadingMs)) &&
    isNonNegativeSafeInteger(value.readingCount) &&
    isNonNegativeSafeInteger(value.excludedBatteryCount)
  )
}

function isSerializedTelemetryError(
  value: unknown,
): value is SerializedTelemetryError {
  if (!isRecord(value)) return false

  return (
    isTelemetryWorkerErrorCode(value.code) &&
    typeof value.message === 'string' &&
    typeof value.retryable === 'boolean' &&
    (value.statusCode === null ||
      (isNonNegativeSafeInteger(value.statusCode) && value.statusCode <= 599))
  )
}

export function isTelemetryWorkerRequest(
  value: unknown,
): value is TelemetryWorkerRequest {
  if (!isRecord(value)) return false

  return (
    value.type === 'load' &&
    isNonNegativeSafeInteger(value.requestId) &&
    typeof value.url === 'string' &&
    value.url.length > 0
  )
}

export function isTelemetryWorkerResponse(
  value: unknown,
): value is TelemetryWorkerResponse {
  if (!isRecord(value) || !isNonNegativeSafeInteger(value.requestId)) {
    return false
  }

  if (value.type === 'snapshot-chunk') {
    return (
      isNonNegativeSafeInteger(value.chunkIndex) &&
      Array.isArray(value.events) &&
      value.events.length > 0 &&
      value.events.length <= TELEMETRY_SNAPSHOT_CHUNK_SIZE &&
      value.events.every(isTelemetryEvent)
    )
  }

  if (value.type === 'ready') {
    return (
      isNonNegativeSafeInteger(value.chunkCount) &&
      isTelemetrySnapshotMetadata(value.metadata) &&
      isOverviewSummary(value.overviewSummary)
    )
  }

  return value.type === 'failed' && isSerializedTelemetryError(value.error)
}
