import { describe, expect, it } from '@jest/globals'

import { DEFAULT_EXPLORE_FILTERS } from '@/lib/explore-data-filters'
import { buildTelemetryEventsCsv } from '@/lib/telemetry-event-export'
import { buildEventRows } from '@/lib/telemetry-queries'

import type { TelemetrySnapshot } from '@/types/telemetry'

describe('telemetry event CSV export', () => {
  it('includes UTC/filter metadata, rule definitions, and raw event evidence', () => {
    const snapshot: TelemetrySnapshot = {
      events: [
        {
          id: 'evt-1',
          batteryId: 'BAT-001',
          timestamp: '2024-01-01T05:30:00.000+05:30',
          timestampMs: Date.parse('2024-01-01T00:00:00.000Z'),
          status: 'discharging',
          metrics: {
            voltage: 4,
            current: -2,
            temperature: 41,
            stateOfCharge: 5,
            stateOfHealth: 84,
          },
        },
      ],
      batteryIds: ['BAT-001'],
      eventCount: 1,
      batteryCount: 1,
      firstTimestampMs: Date.parse('2024-01-01T00:00:00.000Z'),
      lastTimestampMs: Date.parse('2024-01-01T00:00:00.000Z'),
    }

    const csv = buildTelemetryEventsCsv(buildEventRows(snapshot), {
      ...DEFAULT_EXPLORE_FILTERS,
      search: 'evt-1',
      reason: 'multiple',
    })

    expect(csv).toContain('Timezone,UTC')
    expect(csv).toContain('search=evt-1; reason=multiple')
    expect(csv).toContain('Critical charge: SoC < 10%')
    expect(csv).toContain('evt-1,BAT-001,2024-01-01T00:00:00.000Z')
    expect(csv).toContain('Critical charge; High temperature; Health below 85%')
  })
})
