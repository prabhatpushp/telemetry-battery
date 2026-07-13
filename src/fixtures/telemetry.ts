import {
  assessTelemetryEvent,
  recordedPowerWatts,
} from '@/lib/telemetry-policy'
import { buildOverviewSummary } from '@/lib/build-overview-summary'

import type { LoadedTelemetry } from '@/lib/build-telemetry-data'
import type {
  BatteryTableRow,
  TelemetryEventRow,
} from '@/lib/telemetry-queries'
import { buildBatteryFleetData } from '@/lib/telemetry-queries'
import type { TelemetryLoadState } from '@/store/telemetry-store'
import type {
  TelemetryEvent,
  TelemetryMetrics,
  TelemetrySnapshot,
  TelemetryStatus,
} from '@/types/telemetry'

export const STORY_REFERENCE_TIME_MS = Date.UTC(2026, 6, 13, 12)
const HOUR_MS = 60 * 60 * 1000

type TelemetryEventRowOptions = {
  readonly batteryId?: string
  readonly gapBeforeMs?: number | null
  readonly id?: string
  readonly metrics?: Partial<TelemetryMetrics>
  readonly status?: TelemetryStatus
  readonly timestampMs?: number
}

type BatteryTableRowOptions = TelemetryEventRowOptions & {
  readonly observationAgeMs?: number
}

const DEFAULT_METRICS: TelemetryMetrics = {
  voltage: 3.78,
  current: 0,
  temperature: 31.6,
  stateOfCharge: 72.4,
  stateOfHealth: 94.2,
}

export function createTelemetryEventRow(
  options: TelemetryEventRowOptions = {},
): TelemetryEventRow {
  const batteryId = options.batteryId ?? 'BAT-073'
  const timestampMs = options.timestampMs ?? STORY_REFERENCE_TIME_MS
  const event = {
    id: options.id ?? `evt-${batteryId}-${timestampMs}`,
    batteryId,
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs,
    metrics: { ...DEFAULT_METRICS, ...options.metrics },
    status: options.status ?? 'idle',
  } satisfies TelemetryEvent
  const assessment = assessTelemetryEvent(event)

  return {
    event,
    recordedPowerWatts: recordedPowerWatts(event),
    primaryPriority: assessment.priority,
    reasonCodes: assessment.reasonCodes,
    gapBeforeMs: options.gapBeforeMs ?? null,
  }
}

export function createBatteryTableRow(
  options: BatteryTableRowOptions = {},
): BatteryTableRow {
  const row = createTelemetryEventRow(options)

  return {
    ...row,
    observationAgeMs:
      options.observationAgeMs ??
      Math.max(0, STORY_REFERENCE_TIME_MS - row.event.timestampMs),
  }
}

export function createTelemetryHistory(
  batteryId = 'BAT-073',
  count = 48,
): readonly TelemetryEventRow[] {
  const batteryPhase = Number(batteryId.slice(-3)) % 9

  return Array.from({ length: count }, (_, index) => {
    const cycle = (index + batteryPhase) % 12
    const status: TelemetryStatus =
      cycle < 5 ? 'charging' : cycle < 10 ? 'discharging' : 'idle'
    const current =
      status === 'charging'
        ? 5.8 + Math.sin(index / 3) * 1.2
        : status === 'discharging'
          ? -4.9 + Math.cos(index / 4)
          : 0
    const stateOfCharge =
      56 + Math.sin((index + batteryPhase) / 5) * 13 +
      (status === 'charging' ? 5 : -3)

    return createTelemetryEventRow({
      batteryId,
      gapBeforeMs: index === 0 ? null : 3 * HOUR_MS,
      id: `evt-${batteryId}-${String(index + 1).padStart(3, '0')}`,
      metrics: {
        current,
        stateOfCharge,
        stateOfHealth: 94.8 - index * 0.02,
        temperature: 29.5 + Math.abs(current) * 0.7,
        voltage: 3.45 + stateOfCharge * 0.007,
      },
      status,
      timestampMs: STORY_REFERENCE_TIME_MS - (count - 1 - index) * 3 * HOUR_MS,
    })
  })
}

export function createFleetTelemetryRows(): readonly TelemetryEventRow[] {
  const histories = ['BAT-011', 'BAT-031', 'BAT-058', 'BAT-084'].flatMap(
    (batteryId) => createTelemetryHistory(batteryId, 16),
  )
  const latestTimestampMs = STORY_REFERENCE_TIME_MS + HOUR_MS

  return [
    ...histories,
    createTelemetryEventRow({
      batteryId: 'BAT-011',
      gapBeforeMs: HOUR_MS,
      id: 'evt-BAT-011-latest',
      metrics: { current: -6.4, stateOfCharge: 5.6 },
      status: 'discharging',
      timestampMs: latestTimestampMs,
    }),
    createTelemetryEventRow({
      batteryId: 'BAT-031',
      gapBeforeMs: HOUR_MS,
      id: 'evt-BAT-031-latest',
      metrics: { current: 7.2, stateOfCharge: 14.2, stateOfHealth: 83.8 },
      status: 'charging',
      timestampMs: latestTimestampMs,
    }),
    createTelemetryEventRow({
      batteryId: 'BAT-058',
      gapBeforeMs: HOUR_MS,
      id: 'evt-BAT-058-latest',
      metrics: { current: -3.6, stateOfCharge: 58.4, temperature: 42.1 },
      status: 'discharging',
      timestampMs: latestTimestampMs,
    }),
    createTelemetryEventRow({
      batteryId: 'BAT-084',
      gapBeforeMs: HOUR_MS,
      id: 'evt-BAT-084-latest',
      metrics: { current: 0, stateOfCharge: 87.6 },
      status: 'idle',
      timestampMs: latestTimestampMs,
    }),
  ]
}

export function createTelemetrySnapshot(
  rows: readonly TelemetryEventRow[] = createFleetTelemetryRows(),
): TelemetrySnapshot {
  const events = rows
    .map((row) => row.event)
    .sort(
      (left, right) =>
        left.timestampMs - right.timestampMs || left.id.localeCompare(right.id),
    )
  const batteryIds = [...new Set(events.map((event) => event.batteryId))].sort()

  return {
    events,
    batteryIds,
    eventCount: events.length,
    batteryCount: batteryIds.length,
    firstTimestampMs: events[0]?.timestampMs ?? null,
    lastTimestampMs: events.at(-1)?.timestampMs ?? null,
  }
}

export function createLoadedTelemetry(): LoadedTelemetry {
  const snapshot = createTelemetrySnapshot()

  return {
    snapshot,
    overviewSummary: buildOverviewSummary(snapshot),
  }
}

export function createReadyTelemetryLoadState(): Extract<
  TelemetryLoadState,
  { readonly status: 'ready' }
> {
  const telemetry = createLoadedTelemetry()

  return {
    status: 'ready',
    telemetry,
    batteryFleetData: buildBatteryFleetData(telemetry.snapshot),
  }
}
