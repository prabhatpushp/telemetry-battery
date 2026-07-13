import type {
  ReviewReasonCode,
  TelemetryMetricKey,
} from '@/lib/telemetry-policy'
import type { EventQuery, EventSort } from '@/lib/telemetry-queries'
import type { TelemetryStatus } from '@/types/telemetry'

export const EXPLORE_METRIC_VALUES = [
  'stateOfCharge',
  'stateOfHealth',
  'voltage',
  'current',
  'temperature',
  'recordedPower',
] as const

export const EXPLORE_STATUS_VALUES = [
  'all',
  'charging',
  'discharging',
  'idle',
] as const

export const EXPLORE_REASON_VALUES = [
  'all',
  'any',
  'multiple',
  'none',
  'critical-charge',
  'low-charge',
  'high-temperature',
  'low-health',
] as const

export const EXPLORE_GAP_VALUES = ['all', '24', '48', '72'] as const

export const EXPLORE_SORT_FIELDS = [
  'timestamp',
  'batteryId',
  ...EXPLORE_METRIC_VALUES,
] as const

export const EXPLORE_FILTER_KEYS = [
  'q',
  'battery',
  'from',
  'to',
  'metric',
  'status',
  'min',
  'max',
  'reason',
  'gap',
  'sort',
  'direction',
] as const

export type ExploreStatusFilter = (typeof EXPLORE_STATUS_VALUES)[number]
export type ExploreReasonFilter = (typeof EXPLORE_REASON_VALUES)[number]
export type ExploreGapFilter = (typeof EXPLORE_GAP_VALUES)[number]
export type ExploreSortField = (typeof EXPLORE_SORT_FIELDS)[number]

export type ExploreDataFilters = {
  readonly search: string
  readonly batteryId: string
  readonly fromDate: string
  readonly toDate: string
  readonly metric: TelemetryMetricKey
  readonly status: ExploreStatusFilter
  readonly metricMinimum: string
  readonly metricMaximum: string
  readonly reason: ExploreReasonFilter
  readonly minimumGapHours: ExploreGapFilter
  readonly sortField: ExploreSortField
  readonly sortDirection: EventSort['direction']
}

export const DEFAULT_EXPLORE_FILTERS: ExploreDataFilters = {
  search: '',
  batteryId: '',
  fromDate: '',
  toDate: '',
  metric: 'stateOfCharge',
  status: 'all',
  metricMinimum: '',
  metricMaximum: '',
  reason: 'all',
  minimumGapHours: 'all',
  sortField: 'timestamp',
  sortDirection: 'descending',
}

export function normalizeExploreFilterPatch(
  currentMetric: TelemetryMetricKey,
  patch: Partial<ExploreDataFilters>,
): Partial<ExploreDataFilters> {
  if (patch.metric === undefined || patch.metric === currentMetric) return patch

  return {
    ...patch,
    metricMaximum: '',
    metricMinimum: '',
  }
}

function readAllowedValue<const Values extends readonly string[]>(
  value: string | null,
  allowedValues: Values,
  fallback: Values[number],
): Values[number] {
  return allowedValues.find((allowedValue) => allowedValue === value) ?? fallback
}

function readDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const timestamp = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().startsWith(value)
    ? value
    : ''
}

function readNumber(value: string | null): string {
  if (value === null || value.trim() === '') return ''
  const number = Number(value)
  return Number.isFinite(number) ? String(number) : ''
}

export function readExploreDataFilters(
  searchParams: URLSearchParams,
): ExploreDataFilters {
  return {
    search: searchParams.get('q') ?? '',
    batteryId: searchParams.get('battery')?.trim() ?? '',
    fromDate: readDate(searchParams.get('from')),
    toDate: readDate(searchParams.get('to')),
    metric: readAllowedValue(
      searchParams.get('metric'),
      EXPLORE_METRIC_VALUES,
      DEFAULT_EXPLORE_FILTERS.metric,
    ),
    status: readAllowedValue(
      searchParams.get('status'),
      EXPLORE_STATUS_VALUES,
      DEFAULT_EXPLORE_FILTERS.status,
    ),
    metricMinimum: readNumber(searchParams.get('min')),
    metricMaximum: readNumber(searchParams.get('max')),
    reason: readAllowedValue(
      searchParams.get('reason'),
      EXPLORE_REASON_VALUES,
      DEFAULT_EXPLORE_FILTERS.reason,
    ),
    minimumGapHours: readAllowedValue(
      searchParams.get('gap'),
      EXPLORE_GAP_VALUES,
      DEFAULT_EXPLORE_FILTERS.minimumGapHours,
    ),
    sortField: readAllowedValue(
      searchParams.get('sort'),
      EXPLORE_SORT_FIELDS,
      DEFAULT_EXPLORE_FILTERS.sortField,
    ),
    sortDirection: readAllowedValue(
      searchParams.get('direction'),
      ['ascending', 'descending'] as const,
      DEFAULT_EXPLORE_FILTERS.sortDirection,
    ),
  }
}

export function buildExploreEventQuery(
  filters: ExploreDataFilters,
): EventQuery {
  const minimum = filters.metricMinimum === ''
    ? undefined
    : Number(filters.metricMinimum)
  const maximum = filters.metricMaximum === ''
    ? undefined
    : Number(filters.metricMaximum)
  const hasMetricRange = minimum !== undefined || maximum !== undefined

  return {
    ...(filters.search.trim() === '' ? {} : { search: filters.search.trim() }),
    ...(filters.batteryId === '' ? {} : { batteryIds: [filters.batteryId] }),
    ...(filters.fromDate === ''
      ? {}
      : { fromMs: Date.parse(`${filters.fromDate}T00:00:00.000Z`) }),
    ...(filters.toDate === ''
      ? {}
      : { toMs: Date.parse(`${filters.toDate}T23:59:59.999Z`) }),
    ...(filters.status === 'all'
      ? {}
      : { statuses: [filters.status satisfies TelemetryStatus] }),
    ...(filters.reason === 'any'
      ? { priorities: ['critical', 'low', 'metric'] as const }
      : filters.reason === 'multiple'
        ? { minimumReasonCount: 2 }
        : filters.reason === 'none'
          ? { priorities: ['none'] as const }
          : filters.reason === 'all'
            ? {}
            : { reasonCodes: [filters.reason satisfies ReviewReasonCode] }),
    ...(filters.minimumGapHours === 'all'
      ? {}
      : { minimumGapMs: Number(filters.minimumGapHours) * 60 * 60 * 1000 }),
    ...(hasMetricRange
      ? {
          metricRanges: {
            [filters.metric]: {
              ...(minimum === undefined ? {} : { minimum }),
              ...(maximum === undefined ? {} : { maximum }),
            },
          },
        }
      : {}),
    sort: {
      field: filters.sortField,
      direction: filters.sortDirection,
    },
  }
}

export function hasActiveExploreDataFilters(
  filters: ExploreDataFilters,
): boolean {
  return Object.keys(filters).some((key) => {
    const filterKey = key as keyof ExploreDataFilters
    return filters[filterKey] !== DEFAULT_EXPLORE_FILTERS[filterKey]
  })
}
