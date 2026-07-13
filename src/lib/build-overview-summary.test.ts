import { describe, expect, it } from '@jest/globals'

import { buildOverviewSummary } from '@/lib/build-overview-summary'
import type { TelemetryEvent, TelemetrySnapshot } from '@/types/telemetry'

function createEvent(
  batteryId: string,
  timestampMs: number,
  stateOfCharge: number,
  voltage: number,
  current: number,
  temperature = 30,
  stateOfHealth = 95,
): TelemetryEvent {
  return {
    id: `${batteryId}-${timestampMs}`,
    batteryId,
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs,
    metrics: {
      voltage,
      current,
      temperature,
      stateOfCharge,
      stateOfHealth,
    },
    status: current > 0 ? 'charging' : current < 0 ? 'discharging' : 'idle',
  }
}

describe('buildOverviewSummary', () => {
  it('uses only the latest event for each battery', () => {
    const events = [
      createEvent('BAT-001', 1, 2, 10, -10),
      createEvent('BAT-001', 5, 30, 10, 2),
      createEvent('BAT-002', 2, 5, 30, -2),
      createEvent('BAT-003', 3, 15, 20, 2),
      createEvent('BAT-004', 4, 50, 20, 0, 41),
      createEvent('BAT-005', 6, 8, 10, 0),
      createEvent('BAT-006', 7, 15, 10, 0),
    ]
    const snapshot: TelemetrySnapshot = {
      events,
      batteryIds: [
        'BAT-001',
        'BAT-002',
        'BAT-003',
        'BAT-004',
        'BAT-005',
        'BAT-006',
      ],
      eventCount: events.length,
      batteryCount: 6,
      firstTimestampMs: 1,
      lastTimestampMs: 7,
    }

    const summary = buildOverviewSummary(snapshot)

    expect(summary.batteryGroups.map((group) => group.count)).toEqual([
      2, 2, 2,
    ])
    expect(summary.batteryGroups[2]?.medianStateOfCharge).toBe(40)
    expect(summary.chargingKilowatts).toBeCloseTo(0.06)
    expect(summary.dischargingKilowatts).toBeCloseTo(0.06)
    expect(summary.netKilowatts).toBeCloseTo(0)
    expect(summary.attentionCount).toBe(5)
    expect(summary.attentionBatteries).toHaveLength(5)
    expect(
      summary.attentionBatteries.map(({ event }) => event.batteryId),
    ).toEqual(['BAT-002', 'BAT-005', 'BAT-006', 'BAT-003', 'BAT-004'])
    expect(summary.attentionBatteries.map(({ tone }) => tone)).toEqual([
      'critical',
      'critical',
      'low',
      'low',
      'standard',
    ])
    expect(summary.attentionBatteries[0]?.reasonCodes).toEqual([
      'critical-charge',
    ])
  })
})
