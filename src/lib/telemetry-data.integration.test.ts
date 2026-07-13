/// <reference types="node" />

import { readFileSync } from 'node:fs'

import { describe, expect, it } from '@jest/globals'

import { buildTelemetryData } from '@/lib/build-telemetry-data'
import { buildSnapshotChartData } from '@/lib/telemetry-chart-data'
import {
  buildAsOfBatteryRows,
  buildEventRows,
} from '@/lib/telemetry-queries'

describe('telemetry data layer with the supplied dataset', () => {
  it('reproduces the verified fleet totals and 24-hour coverage', () => {
    const payload: unknown = JSON.parse(
      readFileSync('public/data/battery-telemetry.json', 'utf8'),
    )
    const { snapshot, overviewSummary: overview } =
      buildTelemetryData(payload)
    const eventRows = buildEventRows(snapshot)
    const defaultAsOf = buildAsOfBatteryRows(eventRows)
    const allLatest = buildAsOfBatteryRows(eventRows, { lookbackMs: null })
    const chartData = buildSnapshotChartData(allLatest.rows)
    expect(snapshot.eventCount).toBe(25_000)
    expect(snapshot.batteryCount).toBe(100)
    expect(defaultAsOf.representedBatteryCount).toBe(94)
    expect(defaultAsOf.excludedBatteryIds).toHaveLength(6)
    expect(allLatest.representedBatteryCount).toBe(100)
    expect(chartData.priorities.map(({ count }) => count)).toEqual([
      7, 11, 35, 47,
    ])
    expect(chartData.stateOfChargeBands.map(({ count }) => count)).toEqual([
      7, 11, 34, 32, 16,
    ])
    expect(chartData.stateOfHealthBands.map(({ count }) => count)).toEqual([
      28, 21, 24, 27,
    ])
    expect(chartData.temperatureBands.map(({ count }) => count)).toEqual([
      35, 44, 21,
    ])
    expect(chartData.recordedPower.chargingWatts).toBeCloseTo(1_501.39, 2)
    expect(chartData.recordedPower.dischargingWatts).toBeCloseTo(1_315.01, 2)
    expect(overview.batteryGroups.map(({ count }) => count)).toEqual([
      7, 11, 82,
    ])
    expect(overview.attentionCount).toBe(53)
    expect(
      overview.attentionBatteries.reduce(
        (counts, { tone }) => ({
          ...counts,
          [tone]: counts[tone] + 1,
        }),
        { critical: 0, low: 0, standard: 0 },
      ),
    ).toEqual({ critical: 7, low: 11, standard: 35 })
    expect(overview.readingCount).toBe(100)
    expect(overview.earliestReadingMs).toBe(allLatest.earliestReadingMs)
    expect(overview.latestReadingMs).toBe(allLatest.latestReadingMs)
    expect(
      overview.attentionBatteries.find(
        ({ event }) => event.batteryId === 'BAT-015',
      )?.reasonCodes,
    ).toEqual(['critical-charge', 'high-temperature'])
  })
})
