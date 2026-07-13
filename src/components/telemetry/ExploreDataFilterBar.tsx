import {
  RotateCcwIcon,
  SearchIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'
import { useMemo } from 'react'

import { DateRangeFilter } from '@/components/filters/DateRangeFilter'
import { SearchSelect } from '@/components/filters/SearchSelect'
import { TelemetryActiveFilters } from '@/components/telemetry/TelemetryActiveFilters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EXPLORE_GAP_VALUES,
  EXPLORE_METRIC_VALUES,
  EXPLORE_REASON_VALUES,
  EXPLORE_STATUS_VALUES,
} from '@/lib/explore-data-filters'
import {
  REVIEW_REASON_DEFINITIONS,
  TELEMETRY_METRICS,
  TELEMETRY_STATUS_LABELS,
} from '@/lib/telemetry-policy'

import type { ExploreDataFilters } from '@/lib/explore-data-filters'
import type { ExploreReasonFilter } from '@/lib/explore-data-filters'

export type ExploreDataFilterBarProps = {
  readonly ariaLabel?: string
  readonly batteryIds: readonly string[]
  readonly filters: ExploreDataFilters
  readonly firstDate: string
  readonly hasActiveFilters: boolean
  readonly lastDate: string
  readonly variant?: 'analysis' | 'events'
  readonly onFiltersChange: (patch: Partial<ExploreDataFilters>) => void
  readonly onReset: () => void
}

type FilterControlProps = Pick<
  ExploreDataFilterBarProps,
  'filters' | 'onFiltersChange'
>

const REVIEW_FILTER_LABELS: Readonly<Record<ExploreReasonFilter, string>> = {
  all: 'All review reasons',
  any: 'Any review condition',
  multiple: 'Multiple simultaneous conditions',
  none: 'No rule match',
  'critical-charge': REVIEW_REASON_DEFINITIONS['critical-charge'].label,
  'low-charge': REVIEW_REASON_DEFINITIONS['low-charge'].label,
  'high-temperature': REVIEW_REASON_DEFINITIONS['high-temperature'].label,
  'low-health': REVIEW_REASON_DEFINITIONS['low-health'].label,
}

function MetricSelect({
  filters,
  fullWidth = false,
  onFiltersChange,
}: FilterControlProps & { readonly fullWidth?: boolean }) {
  return (
    <Select
      onValueChange={(value) =>
        onFiltersChange({ metric: value as ExploreDataFilters['metric'] })
      }
      value={filters.metric}
    >
      <SelectTrigger
        aria-label="Primary metric"
        className={fullWidth ? 'h-8 w-full' : 'h-8 w-full md:w-44'}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {EXPLORE_METRIC_VALUES.map((value) => (
          <SelectItem key={value} value={value}>
            {TELEMETRY_METRICS[value].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function StatusSelect({ filters, onFiltersChange }: FilterControlProps) {
  return (
    <Select
      onValueChange={(value) =>
        onFiltersChange({ status: value as ExploreDataFilters['status'] })
      }
      value={filters.status}
    >
      <SelectTrigger aria-label="Filter by status" className="h-8 w-full md:w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {EXPLORE_STATUS_VALUES.map((value) => (
          <SelectItem key={value} value={value}>
            {value === 'all'
              ? 'All statuses'
              : TELEMETRY_STATUS_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AdvancedFilters({
  filters,
  onFiltersChange,
  showMetric,
}: FilterControlProps & { readonly showMetric: boolean }) {
  const hasAdvancedFilters =
    filters.metricMinimum !== '' ||
    filters.metricMaximum !== '' ||
    filters.reason !== 'all' ||
    filters.minimumGapHours !== 'all'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="h-8 w-full md:w-auto"
          size="sm"
          type="button"
          variant={hasAdvancedFilters ? 'secondary' : 'outline'}
        >
          <SlidersHorizontalIcon aria-hidden="true" />
          More
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        {showMetric && (
          <div className="space-y-1.5">
            <Label className="text-xs">Metric</Label>
            <MetricSelect
              filters={filters}
              fullWidth
              onFiltersChange={onFiltersChange}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">
            {TELEMETRY_METRICS[filters.metric].label} range
          </Label>
          <div className="flex">
            <Input
              aria-label={`Minimum ${TELEMETRY_METRICS[filters.metric].label}`}
              className="h-8 rounded-e-none [-moz-appearance:_textfield] focus:z-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              onChange={(event) =>
                onFiltersChange({ metricMinimum: event.target.value })
              }
              placeholder="Minimum"
              type="number"
              value={filters.metricMinimum}
            />
            <Input
              aria-label={`Maximum ${TELEMETRY_METRICS[filters.metric].label}`}
              className="-ms-px h-8 rounded-s-none [-moz-appearance:_textfield] focus:z-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              onChange={(event) =>
                onFiltersChange({ metricMaximum: event.target.value })
              }
              placeholder="Maximum"
              type="number"
              value={filters.metricMaximum}
            />
          </div>
          {(filters.metric === 'current' ||
            filters.metric === 'recordedPower') && (
            <p className="text-[11px] text-muted-foreground">
              Negative values indicate discharge; positive values indicate
              charge. Use the bounds to filter direction or magnitude.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Review reason</Label>
          <Select
            onValueChange={(value) =>
              onFiltersChange({
                reason: value as ExploreDataFilters['reason'],
              })
            }
            value={filters.reason}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPLORE_REASON_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {REVIEW_FILTER_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Observation gap</Label>
          <Select
            onValueChange={(value) =>
              onFiltersChange({
                minimumGapHours:
                  value as ExploreDataFilters['minimumGapHours'],
              })
            }
            value={filters.minimumGapHours}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPLORE_GAP_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value === 'all'
                    ? 'Any observation gap'
                    : `Gap ≥ ${value} hours`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function ExploreDataFilterBar({
  ariaLabel = 'Explore filters',
  batteryIds,
  filters,
  firstDate,
  hasActiveFilters,
  lastDate,
  onFiltersChange,
  onReset,
  variant = 'analysis',
}: ExploreDataFilterBarProps) {
  const batteryOptions = useMemo(
    () => [
      { label: 'All batteries', value: 'all' },
      ...batteryIds.map((batteryId) => ({ label: batteryId, value: batteryId })),
    ],
    [batteryIds],
  )

  return (
    <section
      aria-label={ariaLabel}
      className="rounded-lg border bg-card p-2 md:overflow-x-auto"
    >
      <div className="grid min-w-0 grid-cols-2 items-center gap-2 md:flex md:min-w-max">
        {variant === 'events' && (
          <div className="relative col-span-2 w-full md:col-auto md:w-56">
            <SearchIcon
              aria-hidden="true"
              className="absolute top-2 left-2.5 size-4 text-muted-foreground"
            />
            <Input
              aria-label="Search event or battery ID"
              className="h-8 pl-8"
              onChange={(event) =>
                onFiltersChange({ search: event.target.value })
              }
              placeholder="Event or battery ID"
              type="search"
              value={filters.search}
            />
          </div>
        )}

        <DateRangeFilter
          end={filters.toDate}
          maximum={lastDate}
          minimum={firstDate}
          onChange={(fromDate, toDate) =>
            onFiltersChange({ fromDate, toDate })
          }
          start={filters.fromDate}
        />

        <div className="w-full md:w-44">
          <SearchSelect
            ariaLabel="Filter by battery"
            emptyMessage="No battery found."
            onValueChange={(value) =>
              onFiltersChange({ batteryId: value === 'all' ? '' : value })
            }
            options={batteryOptions}
            placeholder="All batteries"
            searchPlaceholder="Search batteries..."
            value={filters.batteryId || 'all'}
          />
        </div>

        {variant === 'analysis' && (
          <MetricSelect
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        )}
        <StatusSelect
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
        <AdvancedFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          showMetric={variant === 'events'}
        />

        <Button
          aria-label="Reset filters"
          className="size-8"
          disabled={!hasActiveFilters}
          onClick={onReset}
          size="icon"
          title="Reset filters"
          type="button"
          variant="outline"
        >
          <RotateCcwIcon aria-hidden="true" />
        </Button>
      </div>
      <TelemetryActiveFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
    </section>
  )
}
