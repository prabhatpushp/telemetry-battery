import { REVIEW_REASON_DEFINITIONS } from '@/lib/telemetry-policy'
import {
  buildAsOfBatteryRows,
  buildEventRows,
  buildReviewQueue,
} from '@/lib/telemetry-queries'

import type {
  ReviewPriority,
  ReviewReasonCode,
} from '@/lib/telemetry-policy'
import type {
  TelemetryEvent,
  TelemetrySnapshot,
} from '@/types/telemetry'

export type BatteryTone = 'critical' | 'low' | 'standard'

export type BatteryLevelGroup = {
  readonly label: string
  readonly range: string
  readonly tone: BatteryTone
  readonly count: number
  readonly medianStateOfCharge: number
}

export type AttentionBattery = {
  readonly event: TelemetryEvent
  readonly reason: string
  readonly reasons: readonly string[]
  readonly reasonCodes: readonly ReviewReasonCode[]
  readonly priority: Exclude<ReviewPriority, 'none'>
  readonly recordedPowerWatts: number
  readonly tone: BatteryTone
}

export type OverviewSummary = {
  readonly batteryGroups: readonly BatteryLevelGroup[]
  readonly attentionBatteries: readonly AttentionBattery[]
  readonly attentionCount: number
  readonly chargingKilowatts: number
  readonly dischargingKilowatts: number
  readonly netKilowatts: number
  readonly earliestReadingMs: number | null
  readonly latestReadingMs: number | null
  readonly readingCount: number
  readonly excludedBatteryCount: number
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0

  const sortedValues = [...values].sort((left, right) => left - right)
  const middleIndex = Math.floor(sortedValues.length / 2)
  const middleValue = sortedValues[middleIndex] ?? 0

  if (sortedValues.length % 2 === 1) return middleValue

  return ((sortedValues[middleIndex - 1] ?? 0) + middleValue) / 2
}

function getBatteryTone(stateOfCharge: number): BatteryTone {
  if (stateOfCharge < 10) return 'critical'
  if (stateOfCharge < 20) return 'low'
  return 'standard'
}

export function buildOverviewSummary(
  snapshot: TelemetrySnapshot,
): OverviewSummary {
  const asOfData = buildAsOfBatteryRows(buildEventRows(snapshot), {
    lookbackMs: null,
  })
  const latestRows = asOfData.rows
  const criticalRows = latestRows.filter(
    (row) => row.event.metrics.stateOfCharge < 10,
  )
  const lowRows = latestRows.filter(
    (row) =>
      row.event.metrics.stateOfCharge >= 10 &&
      row.event.metrics.stateOfCharge < 20,
  )
  const standardRows = latestRows.filter(
    (row) => row.event.metrics.stateOfCharge >= 20,
  )
  let chargingKilowatts = 0
  let dischargingKilowatts = 0

  for (const row of latestRows) {
    const powerKilowatts = row.recordedPowerWatts / 1000

    if (powerKilowatts > 0) chargingKilowatts += powerKilowatts
    else dischargingKilowatts += Math.abs(powerKilowatts)
  }

  const attentionBatteries = buildReviewQueue(latestRows).map((row) => {
    const reasonCodes = row.reasonCodes
    const reasons = reasonCodes.map(
      (reasonCode) => REVIEW_REASON_DEFINITIONS[reasonCode].label,
    )

    return {
      event: row.event,
      reason: reasons[0] ?? 'Metric review',
      reasons,
      reasonCodes,
      priority: row.primaryPriority,
      recordedPowerWatts: row.recordedPowerWatts,
      tone: getBatteryTone(row.event.metrics.stateOfCharge),
    } satisfies AttentionBattery
  })

  return {
    batteryGroups: [
      {
        label: 'Critical',
        range: 'Below 10%',
        tone: 'critical',
        count: criticalRows.length,
        medianStateOfCharge: median(
          criticalRows.map((row) => row.event.metrics.stateOfCharge),
        ),
      },
      {
        label: 'Low',
        range: '10–<20%',
        tone: 'low',
        count: lowRows.length,
        medianStateOfCharge: median(
          lowRows.map((row) => row.event.metrics.stateOfCharge),
        ),
      },
      {
        label: 'Nominal',
        range: 'Latest recorded charge',
        tone: 'standard',
        count: standardRows.length,
        medianStateOfCharge: median(
          standardRows.map((row) => row.event.metrics.stateOfCharge),
        ),
      },
    ],
    attentionBatteries,
    attentionCount: attentionBatteries.length,
    chargingKilowatts,
    dischargingKilowatts,
    netKilowatts: chargingKilowatts - dischargingKilowatts,
    earliestReadingMs: asOfData.earliestReadingMs,
    latestReadingMs: asOfData.latestReadingMs,
    readingCount: asOfData.representedBatteryCount,
    excludedBatteryCount: asOfData.excludedBatteryIds.length,
  }
}
