import { telemetryDatasetSchema } from '@/schemas/telemetry-record'

import type {
  TelemetryEvent,
  TelemetrySnapshot,
} from '@/types/telemetry'

export type TelemetryDataErrorCode =
  | 'invalid-dataset'
  | 'duplicate-event-id'

export class TelemetryDataError extends Error {
  readonly code: TelemetryDataErrorCode

  constructor(code: TelemetryDataErrorCode) {
    super(
      code === 'duplicate-event-id'
        ? 'Telemetry event IDs must be unique.'
        : 'Telemetry dataset is invalid.',
    )
    this.name = 'TelemetryDataError'
    this.code = code
  }
}

export function buildTelemetryModel(payload: unknown): TelemetrySnapshot {
  const result = telemetryDatasetSchema.safeParse(payload)

  if (!result.success) {
    throw new TelemetryDataError('invalid-dataset')
  }

  const eventIds = new Set<string>()
  const batteryIds = new Set<string>()
  const events: TelemetryEvent[] = []

  for (const record of result.data) {
    if (eventIds.has(record.id)) {
      throw new TelemetryDataError('duplicate-event-id')
    }

    eventIds.add(record.id)
    batteryIds.add(record.battery_id)
    events.push({
      id: record.id,
      batteryId: record.battery_id,
      timestamp: record.timestamp,
      timestampMs: Date.parse(record.timestamp),
      metrics: {
        voltage: record.metrics.voltage,
        current: record.metrics.current,
        temperature: record.metrics.temperature,
        stateOfCharge: record.metrics.state_of_charge,
        stateOfHealth: record.metrics.state_of_health,
      },
      status: record.status,
    })
  }

  events.sort(
    (left, right) =>
      left.timestampMs - right.timestampMs || left.id.localeCompare(right.id),
  )

  const sortedBatteryIds = [...batteryIds].sort()

  return {
    events,
    batteryIds: sortedBatteryIds,
    eventCount: events.length,
    batteryCount: sortedBatteryIds.length,
    firstTimestampMs: events.at(0)?.timestampMs ?? null,
    lastTimestampMs: events.at(-1)?.timestampMs ?? null,
  }
}
