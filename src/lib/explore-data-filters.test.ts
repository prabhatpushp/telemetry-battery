import { describe, expect, it } from '@jest/globals'

import {
  DEFAULT_EXPLORE_FILTERS,
  buildExploreEventQuery,
  normalizeExploreFilterPatch,
} from '@/lib/explore-data-filters'

describe('buildExploreEventQuery', () => {
  it('maps the complete filter bar into the event query', () => {
    const query = buildExploreEventQuery({
      ...DEFAULT_EXPLORE_FILTERS,
      batteryId: 'BAT-042',
      fromDate: '2023-11-01',
      metric: 'voltage',
      metricMaximum: '4.1',
      metricMinimum: '3.2',
      minimumGapHours: '24',
      reason: 'high-temperature',
      status: 'charging',
      toDate: '2023-11-30',
    })

    expect(query).toMatchObject({
      batteryIds: ['BAT-042'],
      fromMs: Date.parse('2023-11-01T00:00:00.000Z'),
      metricRanges: { voltage: { maximum: 4.1, minimum: 3.2 } },
      minimumGapMs: 24 * 60 * 60 * 1000,
      reasonCodes: ['high-temperature'],
      statuses: ['charging'],
      toMs: Date.parse('2023-11-30T23:59:59.999Z'),
    })
  })

  it('maps aggregate review scopes without inventing new classifications', () => {
    expect(
      buildExploreEventQuery({
        ...DEFAULT_EXPLORE_FILTERS,
        reason: 'multiple',
      }),
    ).toMatchObject({ minimumReasonCount: 2 })

    expect(
      buildExploreEventQuery({
        ...DEFAULT_EXPLORE_FILTERS,
        reason: 'none',
      }),
    ).toMatchObject({ priorities: ['none'] })
  })
})

describe('normalizeExploreFilterPatch', () => {
  it('clears metric bounds when the selected metric changes', () => {
    expect(
      normalizeExploreFilterPatch('stateOfCharge', { metric: 'voltage' }),
    ).toEqual({
      metric: 'voltage',
      metricMaximum: '',
      metricMinimum: '',
    })
  })

  it('preserves bounds when the metric does not change', () => {
    const patch = { metric: 'voltage', metricMinimum: '3.5' } as const

    expect(normalizeExploreFilterPatch('voltage', patch)).toBe(patch)
  })
})
