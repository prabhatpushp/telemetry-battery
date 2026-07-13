import { describe, expect, it } from '@jest/globals'

import { createTelemetryEventRow } from '@/fixtures/telemetry'
import { findTelemetrySearchMatches } from '@/lib/telemetry-search'

describe('findTelemetrySearchMatches', () => {
  it('finds batteries and events by ID without rendering the full event set', () => {
    const eventRows = [
      createTelemetryEventRow({ batteryId: 'BAT-011', id: 'evt-alpha' }),
      createTelemetryEventRow({ batteryId: 'BAT-031', id: 'evt-bravo' }),
    ]

    expect(
      findTelemetrySearchMatches(['BAT-011', 'BAT-031'], eventRows, '031'),
    ).toEqual({ batteryIds: ['BAT-031'], eventRows: [] })
    expect(
      findTelemetrySearchMatches(['BAT-011', 'BAT-031'], eventRows, 'BRAVO'),
    ).toEqual({ batteryIds: [], eventRows: [eventRows[1]] })
  })
})
