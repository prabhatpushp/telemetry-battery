import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  DEFAULT_EXPLORE_FILTERS,
  EXPLORE_FILTER_KEYS,
  hasActiveExploreDataFilters,
  normalizeExploreFilterPatch,
  readExploreDataFilters,
} from '@/lib/explore-data-filters'

import type { ExploreDataFilters } from '@/lib/explore-data-filters'

export type UseExploreDataFiltersResult = {
  readonly filters: ExploreDataFilters
  readonly hasActiveFilters: boolean
  readonly clearFilters: () => void
  readonly updateFilters: (patch: Partial<ExploreDataFilters>) => void
}

const FILTER_PARAMETERS: Readonly<
  Record<keyof ExploreDataFilters, (typeof EXPLORE_FILTER_KEYS)[number]>
> = {
  search: 'q',
  batteryId: 'battery',
  fromDate: 'from',
  toDate: 'to',
  metric: 'metric',
  status: 'status',
  metricMinimum: 'min',
  metricMaximum: 'max',
  reason: 'reason',
  minimumGapHours: 'gap',
  sortField: 'sort',
  sortDirection: 'direction',
}

export function useExploreDataFilters(): UseExploreDataFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(
    () => readExploreDataFilters(searchParams),
    [searchParams],
  )

  const updateFilters = useCallback(
    (patch: Partial<ExploreDataFilters>): void => {
      const nextSearchParams = new URLSearchParams(searchParams)
      const normalizedPatch = normalizeExploreFilterPatch(filters.metric, patch)

      for (const key of Object.keys(normalizedPatch) as (keyof ExploreDataFilters)[]) {
        const value = normalizedPatch[key]
        if (value === undefined) continue
        const parameter = FILTER_PARAMETERS[key]
        if (value === DEFAULT_EXPLORE_FILTERS[key]) nextSearchParams.delete(parameter)
        else nextSearchParams.set(parameter, value)
      }

      setSearchParams(nextSearchParams, { replace: true })
    },
    [filters.metric, searchParams, setSearchParams],
  )

  const clearFilters = useCallback((): void => {
    const nextSearchParams = new URLSearchParams(searchParams)
    for (const key of EXPLORE_FILTER_KEYS) nextSearchParams.delete(key)
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, setSearchParams])

  return {
    filters,
    hasActiveFilters: hasActiveExploreDataFilters(filters),
    clearFilters,
    updateFilters,
  }
}
