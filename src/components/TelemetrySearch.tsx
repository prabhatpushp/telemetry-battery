import {
  ActivityIcon,
  BatteryIcon,
  ChevronDownIcon,
  SearchIcon,
} from 'lucide-react'
import { useId, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { findTelemetrySearchMatches } from '@/lib/telemetry-search'

import type { TelemetryEventRow } from '@/lib/telemetry-queries'

export type TelemetrySearchProps = {
  readonly batteryIds: readonly string[]
  readonly eventRows: readonly TelemetryEventRow[]
  readonly onBatterySelect: (batteryId: string) => void
  readonly onEventSelect: (row: TelemetryEventRow) => void
}

export default function TelemetrySearch({
  batteryIds,
  eventRows,
  onBatterySelect,
  onEventSelect,
}: TelemetrySearchProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const matches = useMemo(
    () => findTelemetrySearchMatches(batteryIds, eventRows, query),
    [batteryIds, eventRows, query],
  )
  const hasResults =
    matches.batteryIds.length > 0 || matches.eventRows.length > 0

  function close(): void {
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setQuery('')
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          aria-label="Open event or battery by ID"
          className="w-full min-w-0 justify-between border-input bg-background px-3 font-normal outline-none outline-offset-0 hover:bg-background focus-visible:outline-[3px]"
          disabled={eventRows.length === 0}
          id={id}
          role="combobox"
          variant="outline"
        >
          <SearchIcon aria-hidden="true" className="text-muted-foreground" />
          <span className="mr-auto truncate text-muted-foreground">
            Open event or battery
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className="shrink-0 text-muted-foreground/80"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-[min(24rem,calc(100vw-2rem))] border-input p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            aria-label="Search event or battery ID"
            onValueChange={setQuery}
            placeholder="Search event or battery ID..."
            value={query}
          />
          <CommandList>
            {query.trim().length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                Enter an event or battery ID.
              </p>
            ) : !hasResults ? (
              <CommandEmpty>No matching ID found.</CommandEmpty>
            ) : (
              <>
                {matches.batteryIds.length > 0 && (
                  <CommandGroup heading="Batteries">
                    {matches.batteryIds.map((batteryId) => (
                      <CommandItem
                        key={batteryId}
                        onSelect={() => {
                          close()
                          onBatterySelect(batteryId)
                        }}
                        value={`battery-${batteryId}`}
                      >
                        <BatteryIcon aria-hidden="true" />
                        <span className="font-mono">{batteryId}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {matches.eventRows.length > 0 && (
                  <CommandGroup heading="Events">
                    {matches.eventRows.map((row) => (
                      <CommandItem
                        key={row.event.id}
                        onSelect={() => {
                          close()
                          onEventSelect(row)
                        }}
                        value={`event-${row.event.id}`}
                      >
                        <ActivityIcon aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate font-mono">
                            {row.event.id}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {row.event.batteryId}
                          </span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
