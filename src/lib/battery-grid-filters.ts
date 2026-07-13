import type { ReviewPriority, ReviewReasonCode } from '@/lib/telemetry-policy'
import type { BatteryQuery, BatterySort } from '@/lib/telemetry-queries'
import type { TelemetryStatus } from '@/types/telemetry'

export const BATTERY_PRIORITY_FILTER_VALUES = [
  'all',
  'critical',
  'low',
  'metric',
  'none',
] as const

export const BATTERY_STATUS_FILTER_VALUES = [
  'all',
  'charging',
  'discharging',
  'idle',
] as const

export const BATTERY_REASON_FILTER_VALUES = [
  'all',
  'critical-charge',
  'low-charge',
  'high-temperature',
  'low-health',
] as const

export const BATTERY_SORT_VALUES = [
  'priority',
  'charge-ascending',
  'charge-descending',
  'health-ascending',
  'temperature-descending',
  'most-recent',
  'oldest-reading',
  'battery-id',
] as const

export const BATTERY_FILTER_KEYS = [
  'q',
  'priority',
  'status',
  'reason',
  'sort',
] as const

export type BatteryPriorityFilter =
  (typeof BATTERY_PRIORITY_FILTER_VALUES)[number]
export type BatteryStatusFilter =
  (typeof BATTERY_STATUS_FILTER_VALUES)[number]
export type BatteryReasonFilter =
  (typeof BATTERY_REASON_FILTER_VALUES)[number]
export type BatterySortValue = (typeof BATTERY_SORT_VALUES)[number]

export type BatteryGridFilters = {
  readonly search: string
  readonly priority: BatteryPriorityFilter
  readonly status: BatteryStatusFilter
  readonly reason: BatteryReasonFilter
  readonly sort: BatterySortValue
}

const BATTERY_SORTS: Readonly<Record<BatterySortValue, BatterySort>> = {
  priority: { field: 'priority', direction: 'ascending' },
  'charge-ascending': {
    field: 'stateOfCharge',
    direction: 'ascending',
  },
  'charge-descending': {
    field: 'stateOfCharge',
    direction: 'descending',
  },
  'health-ascending': {
    field: 'stateOfHealth',
    direction: 'ascending',
  },
  'temperature-descending': {
    field: 'temperature',
    direction: 'descending',
  },
  'most-recent': { field: 'timestamp', direction: 'descending' },
  'oldest-reading': { field: 'timestamp', direction: 'ascending' },
  'battery-id': { field: 'batteryId', direction: 'ascending' },
}

function readAllowedValue<const Values extends readonly string[]>(
  value: string | null,
  allowedValues: Values,
  fallback: Values[number],
): Values[number] {
  return allowedValues.find((allowedValue) => allowedValue === value) ?? fallback
}

export function readBatteryGridFilters(
  searchParams: URLSearchParams,
): BatteryGridFilters {
  return {
    search: searchParams.get('q') ?? '',
    priority: readAllowedValue(
      searchParams.get('priority'),
      BATTERY_PRIORITY_FILTER_VALUES,
      'all',
    ),
    status: readAllowedValue(
      searchParams.get('status'),
      BATTERY_STATUS_FILTER_VALUES,
      'all',
    ),
    reason: readAllowedValue(
      searchParams.get('reason'),
      BATTERY_REASON_FILTER_VALUES,
      'all',
    ),
    sort: readAllowedValue(
      searchParams.get('sort'),
      BATTERY_SORT_VALUES,
      'priority',
    ),
  }
}

export function buildBatteryGridQuery(
  filters: BatteryGridFilters,
): BatteryQuery {
  const search = filters.search.trim()

  return {
    ...(search.length > 0 ? { search } : {}),
    ...(filters.priority === 'all'
      ? {}
      : { priorities: [filters.priority satisfies ReviewPriority] }),
    ...(filters.status === 'all'
      ? {}
      : { statuses: [filters.status satisfies TelemetryStatus] }),
    ...(filters.reason === 'all'
      ? {}
      : { reasonCodes: [filters.reason satisfies ReviewReasonCode] }),
    sort: BATTERY_SORTS[filters.sort],
  }
}

export function hasActiveBatteryGridFilters(
  filters: BatteryGridFilters,
): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.priority !== 'all' ||
    filters.status !== 'all' ||
    filters.reason !== 'all' ||
    filters.sort !== 'priority'
  )
}
