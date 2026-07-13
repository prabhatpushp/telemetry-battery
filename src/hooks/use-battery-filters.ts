import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import {
  BATTERY_FILTER_KEYS,
  buildBatteryGridQuery,
  hasActiveBatteryGridFilters,
  readBatteryGridFilters,
} from '@/lib/battery-grid-filters'
import { queryBatteryRows } from '@/lib/telemetry-queries'

import type {
  BatteryGridFilters,
  BatteryPriorityFilter,
  BatteryReasonFilter,
  BatterySortValue,
  BatteryStatusFilter,
} from '@/lib/battery-grid-filters'
import type { BatteryTableRow } from '@/lib/telemetry-queries'

export type UseBatteryFiltersResult = {
  readonly filters: BatteryGridFilters
  readonly rows: readonly BatteryTableRow[]
  readonly hasActiveFilters: boolean
  readonly setSearch: (value: string) => void
  readonly setPriority: (value: BatteryPriorityFilter) => void
  readonly setStatus: (value: BatteryStatusFilter) => void
  readonly setReason: (value: BatteryReasonFilter) => void
  readonly setSort: (value: BatterySortValue) => void
  readonly clearFilters: () => void
}

export function useBatteryFilters(
  rows: readonly BatteryTableRow[],
): UseBatteryFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(
    () => readBatteryGridFilters(searchParams),
    [searchParams],
  )
  const result = useMemo(
    () => queryBatteryRows(rows, buildBatteryGridQuery(filters)),
    [filters, rows],
  )

  const updateParameter = useCallback(
    (
      key: (typeof BATTERY_FILTER_KEYS)[number],
      value: string,
      defaultValue: string,
    ): void => {
      setSearchParams(
        (currentSearchParams) => {
          const nextSearchParams = new URLSearchParams(currentSearchParams)
          if (value === defaultValue) nextSearchParams.delete(key)
          else nextSearchParams.set(key, value)
          return nextSearchParams
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clearFilters = useCallback((): void => {
    setSearchParams(
      (currentSearchParams) => {
        const nextSearchParams = new URLSearchParams(currentSearchParams)
        for (const key of BATTERY_FILTER_KEYS) nextSearchParams.delete(key)
        return nextSearchParams
      },
      { replace: true },
    )
  }, [setSearchParams])

  const setSearch = useCallback(
    (value: string) => updateParameter('q', value, ''),
    [updateParameter],
  )
  const setPriority = useCallback(
    (value: BatteryPriorityFilter) =>
      updateParameter('priority', value, 'all'),
    [updateParameter],
  )
  const setStatus = useCallback(
    (value: BatteryStatusFilter) => updateParameter('status', value, 'all'),
    [updateParameter],
  )
  const setReason = useCallback(
    (value: BatteryReasonFilter) => updateParameter('reason', value, 'all'),
    [updateParameter],
  )
  const setSort = useCallback(
    (value: BatterySortValue) => updateParameter('sort', value, 'priority'),
    [updateParameter],
  )

  return {
    filters,
    rows: result.rows,
    hasActiveFilters: hasActiveBatteryGridFilters(filters),
    setSearch,
    setPriority,
    setStatus,
    setReason,
    setSort,
    clearFilters,
  }
}
