import { describe, expect, it } from '@jest/globals'

import {
  buildTelemetryModel,
  TelemetryDataError,
} from '@/lib/build-telemetry-model'

const validRecord = {
  id: 'evt-000001',
  battery_id: 'BAT-001',
  timestamp: '2023-10-01T00:00:00.000Z',
  metrics: {
    voltage: 3.7,
    current: 5,
    temperature: 30,
    state_of_charge: 70,
    state_of_health: 95,
  },
  status: 'charging',
} as const

describe('buildTelemetryModel', () => {
  it('validates, sorts, and normalizes telemetry records', () => {
    const laterRecord = {
      ...validRecord,
      id: 'evt-000002',
      battery_id: 'BAT-002',
      timestamp: '2023-10-01T01:00:00.000Z',
    }
    const snapshot = buildTelemetryModel([laterRecord, validRecord])

    expect(snapshot.eventCount).toBe(2)
    expect(snapshot.batteryCount).toBe(2)
    expect(snapshot.events[0]?.id).toBe('evt-000001')
    expect(snapshot.events[0]?.batteryId).toBe('BAT-001')
    expect(snapshot.events[0]?.metrics.stateOfCharge).toBe(70)
  })

  it('rejects duplicate event identifiers', () => {
    expect(() => buildTelemetryModel([validRecord, validRecord])).toThrow(
      TelemetryDataError,
    )
  })

  it('rejects impossible calendar timestamps', () => {
    expect(() =>
      buildTelemetryModel([
        { ...validRecord, timestamp: '2024-02-31T00:00:00.000Z' },
      ]),
    ).toThrow(TelemetryDataError)
  })
})
