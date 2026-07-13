import { describe, expect, it } from '@jest/globals'

import {
  buildEventActivity,
  buildTelemetryEventSummary,
} from '@/lib/telemetry-event-insights'
import { buildEventRows } from '@/lib/telemetry-queries'

import type {
  TelemetryEvent,
  TelemetrySnapshot,
  TelemetryStatus,
} from '@/types/telemetry'

const HOUR_MS = 60 * 60 * 1000

function createEvent(
  id: string,
  batteryId: string,
  timestampMs: number,
  status: TelemetryStatus,
  stateOfCharge = 50,
  temperature = 30,
  stateOfHealth = 95,
): TelemetryEvent {
  return {
    id,
    batteryId,
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs,
    status,
    metrics: {
      voltage: 4,
      current: status === 'charging' ? 2 : status === 'discharging' ? -2 : 0,
      temperature,
      stateOfCharge,
      stateOfHealth,
    },
  }
}

function createRows(events: readonly TelemetryEvent[]) {
  const batteryIds = [...new Set(events.map((event) => event.batteryId))]
  const snapshot: TelemetrySnapshot = {
    events,
    batteryIds,
    eventCount: events.length,
    batteryCount: batteryIds.length,
    firstTimestampMs: events[0]?.timestampMs ?? null,
    lastTimestampMs: events.at(-1)?.timestampMs ?? null,
  }
  return buildEventRows(snapshot)
}

describe('telemetry event insights', () => {
  it('summarizes overlapping review rules and observation gaps in one pass', () => {
    const rows = createRows([
      createEvent('evt-1', 'BAT-001', 0, 'charging'),
      createEvent(
        'evt-2',
        'BAT-001',
        24 * HOUR_MS,
        'discharging',
        5,
        41,
        84,
      ),
      createEvent('evt-3', 'BAT-002', 48 * HOUR_MS, 'idle', 15),
    ])

    expect(buildTelemetryEventSummary(rows)).toMatchObject({
      eventCount: 3,
      batteryCount: 2,
      statusCounts: { charging: 1, discharging: 1, idle: 1 },
      reasonCounts: {
        'critical-charge': 1,
        'low-charge': 1,
        'high-temperature': 1,
        'low-health': 1,
      },
      reviewEventCount: 2,
      multipleConditionCount: 1,
      gapCounts: {
        over24Hours: 1,
        over48Hours: 0,
        over72Hours: 0,
      },
      longestGapMs: 24 * HOUR_MS,
    })
  })

  it('keeps activity buckets bounded and includes the selected end time', () => {
    const rows = createRows([
      createEvent('evt-1', 'BAT-001', 0, 'charging'),
      createEvent('evt-2', 'BAT-001', 1, 'discharging', 5),
      createEvent('evt-3', 'BAT-002', 3, 'idle'),
    ])
    const activity = buildEventActivity(rows, {
      fromMs: 0,
      toMs: 3,
      bucketCount: 2,
    })

    expect(activity).toHaveLength(2)
    expect(activity[0]).toMatchObject({
      charging: 1,
      discharging: 1,
      eventCount: 2,
      reviewEventCount: 1,
    })
    expect(activity[1]).toMatchObject({ idle: 1, eventCount: 1 })
  })
})
