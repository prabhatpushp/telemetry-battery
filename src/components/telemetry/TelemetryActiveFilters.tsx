import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DEFAULT_EXPLORE_FILTERS } from '@/lib/explore-data-filters'
import {
  REVIEW_REASON_DEFINITIONS,
  TELEMETRY_METRICS,
  TELEMETRY_STATUS_LABELS,
} from '@/lib/telemetry-policy'

import type { ExploreDataFilters } from '@/lib/explore-data-filters'

export type TelemetryActiveFiltersProps = {
  readonly filters: ExploreDataFilters
  readonly onFiltersChange: (patch: Partial<ExploreDataFilters>) => void
}

type ActiveFilter = {
  readonly key: string
  readonly label: string
  readonly clear: Partial<ExploreDataFilters>
}

function reasonLabel(reason: ExploreDataFilters['reason']): string {
  if (reason === 'all') return 'All review reasons'
  if (reason === 'any') return 'Any review condition'
  if (reason === 'multiple') return 'Multiple simultaneous conditions'
  if (reason === 'none') return 'No rule match'
  return REVIEW_REASON_DEFINITIONS[reason].label
}

function buildActiveFilters(filters: ExploreDataFilters): ActiveFilter[] {
  const active: ActiveFilter[] = []

  if (filters.search !== '') {
    active.push({
      key: 'search',
      label: `Search: ${filters.search}`,
      clear: { search: '' },
    })
  }
  if (filters.batteryId !== '') {
    active.push({
      key: 'battery',
      label: filters.batteryId,
      clear: { batteryId: '' },
    })
  }
  if (filters.fromDate !== '' || filters.toDate !== '') {
    active.push({
      key: 'date',
      label: `${filters.fromDate || 'Start'} → ${filters.toDate || 'End'} UTC`,
      clear: { fromDate: '', toDate: '' },
    })
  }
  if (filters.status !== 'all') {
    active.push({
      key: 'status',
      label: TELEMETRY_STATUS_LABELS[filters.status],
      clear: { status: 'all' },
    })
  }
  if (filters.metric !== DEFAULT_EXPLORE_FILTERS.metric) {
    active.push({
      key: 'metric',
      label: `Metric: ${TELEMETRY_METRICS[filters.metric].label}`,
      clear: { metric: DEFAULT_EXPLORE_FILTERS.metric },
    })
  }
  if (filters.metricMinimum !== '' || filters.metricMaximum !== '') {
    active.push({
      key: 'range',
      label: `${TELEMETRY_METRICS[filters.metric].label}: ${filters.metricMinimum || '−∞'} to ${filters.metricMaximum || '+∞'} ${TELEMETRY_METRICS[filters.metric].unit}`,
      clear: { metricMinimum: '', metricMaximum: '' },
    })
  }
  if (filters.reason !== 'all') {
    active.push({
      key: 'reason',
      label: reasonLabel(filters.reason),
      clear: { reason: 'all' },
    })
  }
  if (filters.minimumGapHours !== 'all') {
    active.push({
      key: 'gap',
      label: `Prior gap ≥ ${filters.minimumGapHours} h`,
      clear: { minimumGapHours: 'all' },
    })
  }

  return active
}

export function TelemetryActiveFilters({
  filters,
  onFiltersChange,
}: TelemetryActiveFiltersProps) {
  const activeFilters = buildActiveFilters(filters)
  if (activeFilters.length === 0) return null

  return (
    <div
      aria-label="Active telemetry filters"
      className="mt-2 flex min-w-max items-center gap-1.5 border-t pt-2"
    >
      <span className="mr-1 text-[11px] font-medium text-muted-foreground">
        Active
      </span>
      {activeFilters.map((filter) => (
        <Button
          className="h-7 rounded-full px-2.5 text-xs"
          key={filter.key}
          onClick={() => onFiltersChange(filter.clear)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {filter.label}
          <XIcon aria-hidden="true" className="size-3" />
          <span className="sr-only">Remove {filter.label} filter</span>
        </Button>
      ))}
    </div>
  )
}
