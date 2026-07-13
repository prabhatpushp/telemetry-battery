import { describe, expect, it } from '@jest/globals'

import {
  buildBatteryGridQuery,
  hasActiveBatteryGridFilters,
  readBatteryGridFilters,
} from '@/lib/battery-grid-filters'

describe('battery grid filters', () => {
  it('rejects unsupported URL values and keeps safe defaults', () => {
    const filters = readBatteryGridFilters(
      new URLSearchParams('priority=alarm&status=offline&sort=random'),
    )

    expect(filters).toEqual({
      search: '',
      priority: 'all',
      status: 'all',
      reason: 'all',
      sort: 'priority',
    })
    expect(hasActiveBatteryGridFilters(filters)).toBe(false)
  })

  it('translates shareable controls into the existing battery query', () => {
    const filters = readBatteryGridFilters(
      new URLSearchParams(
        'q=%20BAT-07%20&priority=critical&status=discharging&reason=low-health&sort=charge-ascending',
      ),
    )

    expect(buildBatteryGridQuery(filters)).toEqual({
      search: 'BAT-07',
      priorities: ['critical'],
      statuses: ['discharging'],
      reasonCodes: ['low-health'],
      sort: { field: 'stateOfCharge', direction: 'ascending' },
    })
    expect(hasActiveBatteryGridFilters(filters)).toBe(true)
  })
})
