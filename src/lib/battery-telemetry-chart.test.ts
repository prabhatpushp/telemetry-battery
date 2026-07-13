import { describe, expect, it } from '@jest/globals'

import {
  buildBatteryTelemetryProfile,
  buildBatteryChartPoints,
  getBatteryChartRenderPoints,
  selectBatteryChartRows,
} from '@/lib/battery-telemetry-chart'

import type { TelemetryEventRow } from '@/lib/telemetry-queries'

function row(
  id: string,
  timestampMs: number,
  stateOfCharge = 50,
): TelemetryEventRow {
  return {
    event: {
      id,
      batteryId: 'BAT-001',
      timestamp: new Date(timestampMs).toISOString(),
      timestampMs,
      metrics: {
        voltage: 4,
        current: 1,
        temperature: 30,
        stateOfCharge,
        stateOfHealth: 95,
      },
      status: 'charging',
    },
    gapBeforeMs: null,
    primaryPriority: 'none',
    reasonCodes: [],
    recordedPowerWatts: 4,
  }
}

describe('buildBatteryChartPoints', () => {
  it('sorts events and inserts a null point across gaps longer than 24 hours', () => {
    const day = 24 * 60 * 60 * 1000
    const points = buildBatteryChartPoints(
      [row('evt-2', day + 1), row('evt-1', 0)],
      'BAT-001',
    )

    expect(points.map((point) => point.eventId)).toEqual([
      'evt-1',
      null,
      'evt-2',
    ])
  })

  it('keeps neighboring points outside the overscanned view for continuous lines', () => {
    const points = buildBatteryChartPoints(
      [0, 10, 20, 30, 40].map((timestamp) =>
        row(`evt-${timestamp}`, timestamp),
      ),
      'BAT-001',
    )

    expect(
      getBatteryChartRenderPoints(points, 20, 30).map(
        (point) => point.timestampMs,
      ),
    ).toEqual([10, 20, 30, 40])
  })

  it('selects evenly spaced heatmap samples including the first and latest event', () => {
    const rows = Array.from({ length: 21 }, (_, index) =>
      row(`evt-${index}`, index),
    )

    expect(
      selectBatteryChartRows(rows, 5).map((item) => item.event.id),
    ).toEqual(['evt-0', 'evt-5', 'evt-10', 'evt-15', 'evt-20'])
  })

  it('builds period buckets with averaged values and empty gaps', () => {
    const hour = 60 * 60 * 1000
    const rows = [
      row('evt-1', 22 * hour),
      row('evt-2', 22.5 * hour, 70),
    ]

    const profile = buildBatteryTelemetryProfile(rows, 'daily')

    expect(profile).toHaveLength(24)
    expect(profile.filter((bucket) => bucket.eventCount > 0)).toHaveLength(1)
    expect(profile.at(-1)?.eventCount).toBe(2)
    expect(profile.at(-1)?.values.stateOfCharge).toBe(60)
  })
})
