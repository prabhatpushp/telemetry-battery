import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  BATTERY_PRIORITY_FILTER_VALUES,
  BATTERY_REASON_FILTER_VALUES,
  BATTERY_SORT_VALUES,
  BATTERY_STATUS_FILTER_VALUES,
} from '@/lib/battery-grid-filters'
import { cn } from '@/lib/cn'
import {
  REVIEW_PRIORITY_LABELS,
  REVIEW_REASON_DEFINITIONS,
  TELEMETRY_STATUS_LABELS,
} from '@/lib/telemetry-policy'

import type {
  BatteryGridFilters,
  BatteryPriorityFilter,
  BatteryReasonFilter,
  BatterySortValue,
  BatteryStatusFilter,
} from '@/lib/battery-grid-filters'

type BatteryFiltersProps = {
  readonly filters: BatteryGridFilters
  readonly hasActiveFilters: boolean
  readonly onSearchChange: (value: string) => void
  readonly onPriorityChange: (value: BatteryPriorityFilter) => void
  readonly onStatusChange: (value: BatteryStatusFilter) => void
  readonly onReasonChange: (value: BatteryReasonFilter) => void
  readonly onSortChange: (value: BatterySortValue) => void
  readonly onClear: () => void
}

type FilterOption<T extends string> = {
  readonly value: T
  readonly label: string
}

type FilterMenuProps<T extends string> = {
  readonly ariaLabel: string
  readonly className: string
  readonly id: string
  readonly onValueChange: (value: T) => void
  readonly options: readonly FilterOption<T>[]
  readonly value: T
}

const SORT_LABELS: Readonly<Record<BatterySortValue, string>> = {
  priority: 'Review priority',
  'charge-ascending': 'Lowest charge',
  'charge-descending': 'Highest charge',
  'health-ascending': 'Lowest health',
  'temperature-descending': 'Highest temperature',
  'most-recent': 'Most recent',
  'oldest-reading': 'Oldest reading',
  'battery-id': 'Battery ID',
}

const PRIORITY_OPTIONS = BATTERY_PRIORITY_FILTER_VALUES.map((value) => ({
  value,
  label: value === 'all' ? 'All priorities' : REVIEW_PRIORITY_LABELS[value],
}))

const STATUS_OPTIONS = BATTERY_STATUS_FILTER_VALUES.map((value) => ({
  value,
  label: value === 'all' ? 'All statuses' : TELEMETRY_STATUS_LABELS[value],
}))

const REASON_OPTIONS = BATTERY_REASON_FILTER_VALUES.map((value) => ({
  value,
  label:
    value === 'all' ? 'All reasons' : REVIEW_REASON_DEFINITIONS[value].label,
}))

const SORT_OPTIONS = BATTERY_SORT_VALUES.map((value) => ({
  value,
  label: SORT_LABELS[value],
}))

const SEARCH_DEBOUNCE_MS = 250

function FilterMenu<T extends string>({
  ariaLabel,
  className,
  id,
  onValueChange,
  options,
  value,
}: FilterMenuProps<T>) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={ariaLabel}
          className={cn('shrink-0 justify-between font-normal', className)}
          id={id}
          type="button"
          variant="outline"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDownIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        <DropdownMenuRadioGroup
          onValueChange={(nextValue) => onValueChange(nextValue as T)}
          value={value}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function BatteryFilters({
  filters,
  hasActiveFilters,
  onClear,
  onPriorityChange,
  onReasonChange,
  onSearchChange,
  onSortChange,
  onStatusChange,
}: BatteryFiltersProps) {
  const [searchState, setSearchState] = useState({
    inputValue: filters.search,
    urlValue: filters.search,
  })
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  if (searchState.urlValue !== filters.search) {
    setSearchState({
      inputValue: filters.search,
      urlValue: filters.search,
    })
  }

  useEffect(() => clearTimeout(searchTimer.current), [filters.search])
  useEffect(() => () => clearTimeout(searchTimer.current), [])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchState((current) => ({ ...current, inputValue: value }))
      clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(
        () => onSearchChange(value),
        SEARCH_DEBOUNCE_MS,
      )
    },
    [onSearchChange],
  )

  const handleClear = useCallback(() => {
    clearTimeout(searchTimer.current)
    setSearchState((current) => ({ ...current, inputValue: '' }))
    onClear()
  }, [onClear])

  return (
    <form
      className="grid w-full grid-cols-2 items-center gap-2 p-1 md:flex md:overflow-x-auto"
      onSubmit={(event) => event.preventDefault()}
      role="search"
    >
      <div className="relative col-span-2 min-w-0 flex-1 md:min-w-52">
        <Label className="sr-only" htmlFor="battery-search">
          Search by battery ID
        </Label>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          autoComplete="off"
          className="pl-8"
          id="battery-search"
          onChange={(event) => handleSearchChange(event.target.value)}
          placeholder="Search battery ID"
          type="search"
          value={searchState.inputValue}
        />
      </div>

      <FilterMenu
        ariaLabel="Filter by priority"
        className="w-full md:w-40"
        id="battery-priority"
        onValueChange={onPriorityChange}
        options={PRIORITY_OPTIONS}
        value={filters.priority}
      />
      <FilterMenu
        ariaLabel="Filter by status"
        className="w-full md:w-36"
        id="battery-status"
        onValueChange={onStatusChange}
        options={STATUS_OPTIONS}
        value={filters.status}
      />
      <FilterMenu
        ariaLabel="Filter by review reason"
        className="w-full md:w-44"
        id="battery-reason"
        onValueChange={onReasonChange}
        options={REASON_OPTIONS}
        value={filters.reason}
      />
      <FilterMenu
        ariaLabel="Sort batteries"
        className="w-full md:w-44"
        id="battery-sort"
        onValueChange={onSortChange}
        options={SORT_OPTIONS}
        value={filters.sort}
      />

      {hasActiveFilters && (
        <Button
          aria-label="Clear filters"
          onClick={handleClear}
          size="icon"
          title="Clear filters"
          type="button"
          variant="ghost"
        >
          <XIcon aria-hidden="true" />
        </Button>
      )}
    </form>
  )
}
