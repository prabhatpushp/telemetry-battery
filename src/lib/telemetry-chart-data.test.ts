import { describe, expect, it } from '@jest/globals'

import {
  buildBatteryTrend,
  buildFleetTrend,
  buildHistogram,
  buildSnapshotChartData,
  buildStatusComparison,
} from '@/lib/telemetry-chart-data'
import {
  buildAsOfBatteryRows,
  buildEventRows,
} from '@/lib/telemetry-queries'

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
  stateOfCharge: number,
  status: TelemetryStatus = 'charging',
  temperature = 30,
  stateOfHealth = 95,
): TelemetryEvent {
  const current = status === 'charging' ? 1 : status === 'discharging' ? -1 : 0

  return {
    id,
    batteryId,
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs,
    metrics: {
      voltage: 4,
      current,
      temperature,
      stateOfCharge,
      stateOfHealth,
    },
    status,
  }
}

function rowsFor(events: readonly TelemetryEvent[]) {
  const batteryIds = [...new Set(events.map((event) => event.batteryId))].sort()
  const snapshot: TelemetrySnapshot = {
    events,
    batteryIds,
    eventCount: events.length,
    batteryCount: batteryIds.length,
    firstTimestampMs: events.at(0)?.timestampMs ?? null,
    lastTimestampMs: events.at(-1)?.timestampMs ?? null,
  }

  return buildEventRows(snapshot)
}

describe('telemetry chart data', () => {
  it('uses fixed metric bands and keeps overlapping reasons independent', () => {
    const eventRows = rowsFor([
      createEvent('evt-1', 'BAT-001', 0, 0, 'charging', 40, 84),
      createEvent('evt-2', 'BAT-002', 1, 10),
      createEvent('evt-3', 'BAT-003', 2, 20),
      createEvent('evt-4', 'BAT-004', 3, 50),
      createEvent('evt-5', 'BAT-005', 4, 80),
      createEvent('evt-6', 'BAT-006', 5, 100),
    ])
    const asOf = buildAsOfBatteryRows(eventRows, { lookbackMs: null })
    const data = buildSnapshotChartData(asOf.rows)

    expect(data.stateOfChargeBands.map((band) => band.count)).toEqual([
      1, 1, 1, 1, 2,
    ])
    expect(data.priorities.map((category) => category.count)).toEqual([
      1, 1, 0, 4,
    ])
    expect(data.reasons.map((category) => category.count)).toEqual([
      1, 1, 1, 1,
    ])
  })

  it('builds deterministic histogram and box-summary values', () => {
    const eventRows = rowsFor([
      createEvent('evt-1', 'BAT-001', 0, 0),
      createEvent('evt-2', 'BAT-002', 1, 10),
      createEvent('evt-3', 'BAT-003', 2, 20),
      createEvent('evt-4', 'BAT-004', 3, 30),
    ])
    const histogram = buildHistogram(eventRows, 'stateOfCharge', 2)

    expect(histogram.bins.map((bin) => bin.count)).toEqual([2, 2])
    expect(histogram.summary.median).toBe(15)
    expect(histogram.summary.p10).toBeCloseTo(3)
    expect(histogram.summary.p90).toBeCloseTo(27)
    expect(histogram.summary.observedDelta).toBeNull()
  })

  it('weights each battery once inside a fleet bucket', () => {
    const eventRows = rowsFor([
      createEvent('evt-1', 'BAT-001', 0, 0),
      createEvent('evt-2', 'BAT-001', 1, 100),
      createEvent('evt-3', 'BAT-002', 2, 100),
    ])
    const [bucket] = buildFleetTrend(eventRows, {
      metric: 'stateOfCharge',
      fromMs: 0,
      toMs: 2,
      bucketCount: 1,
    })

    expect(bucket).toMatchObject({
      median: 75,
      batteryCount: 2,
      eventCount: 3,
    })
    expect(bucket?.p10).toBeCloseTo(55)
    expect(bucket?.p90).toBeCloseTo(95)
  })

  it('returns honest battery gaps, thresholds, and status summaries', () => {
    const eventRows = rowsFor([
      createEvent('evt-1', 'BAT-001', 0, 25, 'charging'),
      createEvent(
        'evt-2',
        'BAT-001',
        25 * HOUR_MS,
        5,
        'discharging',
      ),
    ])
    const trend = buildBatteryTrend(eventRows, {
      batteryId: 'BAT-001',
      metric: 'stateOfCharge',
    })
    const comparison = buildStatusComparison(eventRows, 'stateOfCharge')

    expect(trend.gaps).toHaveLength(1)
    expect(trend.gaps[0]?.durationMs).toBe(25 * HOUR_MS)
    expect(trend.thresholds.map((threshold) => threshold.value)).toEqual([
      10, 20,
    ])
    expect(trend.summary.observedDelta).toBe(-20)
    expect(comparison.map((group) => group.summary.eventCount)).toEqual([
      1, 1, 0,
    ])
  })

  it('breaks a battery trend only when a gap is longer than 24 hours', () => {
    const eventRows = rowsFor([
      createEvent('evt-1', 'BAT-001', 0, 50),
      createEvent('evt-2', 'BAT-001', 24 * HOUR_MS, 50),
      createEvent('evt-3', 'BAT-001', 48 * HOUR_MS + 1, 50),
    ])
    const trend = buildBatteryTrend(eventRows, {
      batteryId: 'BAT-001',
      metric: 'stateOfCharge',
    })

    expect(trend.gaps.map((gap) => gap.toEventId)).toEqual(['evt-3'])
  })
})
