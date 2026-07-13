import { describe, expect, it } from '@jest/globals'

import {
  assessTelemetryEvent,
  getTelemetryMetricValue,
  recordedPowerWatts,
} from '@/lib/telemetry-policy'

import type { TelemetryEvent } from '@/types/telemetry'

function createEvent(
  stateOfCharge: number,
  temperature: number,
  stateOfHealth: number,
): TelemetryEvent {
  return {
    id: 'evt-test',
    batteryId: 'BAT-001',
    timestamp: '2024-01-01T00:00:00.000Z',
    timestampMs: 0,
    metrics: {
      voltage: 4,
      current: -5,
      temperature,
      stateOfCharge,
      stateOfHealth,
    },
    status: 'discharging',
  }
}

describe('telemetry policy', () => {
  it('keeps every overlapping reason and one exclusive priority', () => {
    const event = createEvent(9.9, 40, 84.9)

    expect(assessTelemetryEvent(event)).toEqual({
      priority: 'critical',
      reasonCodes: [
        'critical-charge',
        'high-temperature',
        'low-health',
      ],
    })
    expect(recordedPowerWatts(event)).toBe(-20)
    expect(getTelemetryMetricValue(event, 'recordedPower')).toBe(-20)
  })

  it('applies charge, temperature, and health boundaries exactly', () => {
    expect(assessTelemetryEvent(createEvent(10, 39.9, 85))).toEqual({
      priority: 'low',
      reasonCodes: ['low-charge'],
    })
    expect(assessTelemetryEvent(createEvent(20, 39.9, 85))).toEqual({
      priority: 'none',
      reasonCodes: [],
    })
  })
})
