import { describe, expect, it } from '@jest/globals'

import {
  buildAsOfBatteryRows,
  buildEventRows,
  buildReviewQueue,
  queryBatteryRows,
  queryEventRows,
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
  status: TelemetryStatus,
  temperature = 30,
  stateOfHealth = 95,
): TelemetryEvent {
  const current = status === 'charging' ? 2 : status === 'discharging' ? -2 : 0

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

function createSnapshot(events: readonly TelemetryEvent[]): TelemetrySnapshot {
  const batteryIds = [...new Set(events.map((event) => event.batteryId))].sort()

  return {
    events,
    batteryIds,
    eventCount: events.length,
    batteryCount: batteryIds.length,
    firstTimestampMs: events.at(0)?.timestampMs ?? null,
    lastTimestampMs: events.at(-1)?.timestampMs ?? null,
  }
}

describe('telemetry queries', () => {
  const events = [
    createEvent('evt-1', 'BAT-001', 0, 50, 'charging'),
    createEvent('evt-2', 'BAT-002', HOUR_MS, 15, 'charging', 41, 84),
    createEvent(
      'evt-3',
      'BAT-001',
      26 * HOUR_MS,
      5,
      'discharging',
      42,
      84,
    ),
  ]
  const eventRows = buildEventRows(createSnapshot(events))

  it('adds prior-battery gaps and applies the default 24-hour as-of window', () => {
    expect(eventRows[2]?.gapBeforeMs).toBe(26 * HOUR_MS)
    expect(eventRows[2]?.reasonCodes).toEqual([
      'critical-charge',
      'high-temperature',
      'low-health',
    ])

    const asOf = buildAsOfBatteryRows(eventRows)

    expect(asOf.rows.map((row) => row.event.batteryId)).toEqual(['BAT-001'])
    expect(asOf.excludedBatteryIds).toEqual(['BAT-002'])
    expect(asOf.representedBatteryCount).toBe(1)
  })

  it('supports all-latest rows, deterministic review order, and battery filters', () => {
    const asOf = buildAsOfBatteryRows(eventRows, { lookbackMs: null })
    const queue = buildReviewQueue(asOf.rows)

    expect(queue.map((row) => row.event.batteryId)).toEqual([
      'BAT-001',
      'BAT-002',
    ])
    expect(
      queryBatteryRows(asOf.rows, {
        reasonCodes: ['low-health'],
        sort: { field: 'stateOfCharge', direction: 'descending' },
      }).rows.map((row) => row.event.batteryId),
    ).toEqual(['BAT-002', 'BAT-001'])
  })

  it('includes exact as-of boundaries and excludes older or future evidence', () => {
    const referenceTimeMs = 48 * HOUR_MS
    const boundaryEvents = [
      createEvent(
        'evt-old',
        'BAT-003',
        24 * HOUR_MS - 1,
        50,
        'idle',
      ),
      createEvent('evt-boundary', 'BAT-002', 24 * HOUR_MS, 50, 'idle'),
      createEvent('evt-reference', 'BAT-001', referenceTimeMs, 50, 'idle'),
      createEvent('evt-future', 'BAT-004', 49 * HOUR_MS, 50, 'idle'),
    ]
    const unorderedRows = [
      ...buildEventRows(createSnapshot(boundaryEvents)),
    ].reverse()
    const asOf = buildAsOfBatteryRows(unorderedRows, {
      referenceTimeMs,
      lookbackMs: 24 * HOUR_MS,
    })

    expect(asOf.rows.map((row) => row.event.batteryId)).toEqual([
      'BAT-001',
      'BAT-002',
    ])
    expect(asOf.rows.map((row) => row.observationAgeMs)).toEqual([
      0,
      24 * HOUR_MS,
    ])
    expect(asOf.excludedBatteryIds).toEqual(['BAT-003', 'BAT-004'])
    expect(asOf.earliestReadingMs).toBe(24 * HOUR_MS)
    expect(asOf.latestReadingMs).toBe(referenceTimeMs)
  })

  it('filters once, reports totals before paging, and keeps inclusive bounds', () => {
    const result = queryEventRows(eventRows, {
      fromMs: HOUR_MS,
      toMs: 26 * HOUR_MS,
      reasonCodes: ['high-temperature'],
      metricRanges: { stateOfHealth: { maximum: 84 } },
      sort: { field: 'timestamp', direction: 'ascending' },
      limit: 1,
    })

    expect(result.matchingEventCount).toBe(2)
    expect(result.matchingBatteryCount).toBe(2)
    expect(result.rows.map((row) => row.event.id)).toEqual(['evt-2'])
  })

  it('filters events with multiple simultaneous review reasons', () => {
    const result = queryEventRows(eventRows, { minimumReasonCount: 2 })

    expect(result.rows.map((row) => row.event.id)).toEqual([
      'evt-3',
      'evt-2',
    ])
  })
})
