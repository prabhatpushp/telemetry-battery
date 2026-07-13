import { describe, expect, it } from '@jest/globals'

import { createTelemetryEventRow } from '@/fixtures/telemetry'
import {
  buildAsOfPeerComparison,
  buildSynchronizedBatteryHistory,
} from '@/lib/telemetry-p1-data'
import { buildAsOfBatteryRows } from '@/lib/telemetry-queries'

describe('buildSynchronizedBatteryHistory', () => {
  it('orders and filters rows, detects strict-threshold gaps, and summarizes condition runs', () => {
    const rows = [
      createTelemetryEventRow({
        batteryId: 'BAT-001',
        id: 'event-4',
        metrics: { stateOfCharge: 80 },
        timestampMs: 31,
      }),
      createTelemetryEventRow({
        batteryId: 'BAT-001',
        id: 'event-2',
        metrics: { stateOfCharge: 5 },
        timestampMs: 10,
      }),
      createTelemetryEventRow({
        batteryId: 'BAT-OTHER',
        id: 'other-event',
        timestampMs: 15,
      }),
      createTelemetryEventRow({
        batteryId: 'BAT-001',
        id: 'event-1',
        metrics: { stateOfCharge: 5 },
        timestampMs: 0,
      }),
      createTelemetryEventRow({
        batteryId: 'BAT-001',
        id: 'event-3',
        metrics: { stateOfCharge: 5 },
        timestampMs: 20,
      }),
    ]

    const history = buildSynchronizedBatteryHistory(rows, {
      batteryId: 'BAT-001',
      gapThresholdMs: 10,
    })

    expect(history.points.map((point) => point.eventId)).toEqual([
      'event-1',
      'event-2',
      'event-3',
      'event-4',
    ])
    expect(history.gaps).toMatchObject([
      { durationMs: 11, fromEventId: 'event-3', toEventId: 'event-4' },
    ])
    expect(
      history.conditions.find(({ key }) => key === 'critical-charge'),
    ).toMatchObject({
      count: 3,
      latestEventId: 'event-3',
      longestObservationRun: {
        eventCount: 3,
        fromEventId: 'event-1',
        toEventId: 'event-3',
      },
    })
  })

  it('returns an empty history for an inverted date range', () => {
    const history = buildSynchronizedBatteryHistory(
      [createTelemetryEventRow({ batteryId: 'BAT-001' })],
      { batteryId: 'BAT-001', fromMs: 2, toMs: 1 },
    )

    expect(history.eventCount).toBe(0)
    expect(history.firstTimestampMs).toBeNull()
    expect(history.latestTimestampMs).toBeNull()
  })
})

describe('buildAsOfPeerComparison', () => {
  it('uses a midrank for tied peer values and handles an absent battery', () => {
    const rows = [
      createTelemetryEventRow({
        batteryId: 'BAT-001',
        metrics: { stateOfCharge: 10 },
      }),
      createTelemetryEventRow({
        batteryId: 'BAT-002',
        metrics: { stateOfCharge: 20 },
      }),
      createTelemetryEventRow({
        batteryId: 'BAT-003',
        metrics: { stateOfCharge: 20 },
      }),
    ]
    const data = buildAsOfBatteryRows(rows, { lookbackMs: null })

    expect(
      buildAsOfPeerComparison(data, {
        batteryId: 'BAT-002',
        metric: 'stateOfCharge',
      }),
    ).toMatchObject({
      isRepresented: true,
      median: 20,
      percentile: 75,
      representedBatteryCount: 3,
      selectedValue: 20,
    })
    expect(
      buildAsOfPeerComparison(data, {
        batteryId: 'BAT-999',
        metric: 'stateOfCharge',
      }),
    ).toMatchObject({
      isRepresented: false,
      percentile: null,
      selectedValue: null,
    })
  })
})
