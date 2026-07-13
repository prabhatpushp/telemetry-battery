import { parseDate } from '@internationalized/date'
import { CalendarIcon } from 'lucide-react'
import {
  Button,
  DateRangePicker,
  Dialog,
  Group,
  Label,
  Popover,
} from 'react-aria-components'

import { RangeCalendar } from '@/components/ui/calendar-rac'
import { DateInput, dateInputStyle } from '@/components/ui/datefield-rac'
import { cn } from '@/lib/cn'

export type DateRangeFilterProps = {
  readonly end: string
  readonly maximum: string
  readonly minimum: string
  readonly start: string
  readonly onChange: (start: string, end: string) => void
}

export function DateRangeFilter({
  end,
  maximum,
  minimum,
  onChange,
  start,
}: DateRangeFilterProps) {
  const minimumDate = parseDate(minimum)
  const maximumDate = parseDate(maximum)
  const value = {
    start: parseDate(start || minimum),
    end: parseDate(end || maximum),
  }

  return (
    <DateRangePicker
      aria-label="Event date range"
      className="col-span-2 min-w-0 md:col-auto"
      maxValue={maximumDate}
      minValue={minimumDate}
      onChange={(range) => {
        if (range) onChange(range.start.toString(), range.end.toString())
      }}
      value={value}
    >
      <Label className="sr-only">Event date range</Label>
      <div className="flex w-full md:w-[17rem]">
        <Group className={cn(dateInputStyle, 'h-8 pe-9 text-xs')}>
          <DateInput slot="start" unstyled />
          <span aria-hidden="true" className="px-1.5 text-muted-foreground/70">
            –
          </span>
          <DateInput slot="end" unstyled />
        </Group>
        <Button className="-ms-9 -me-px z-10 flex w-9 items-center justify-center rounded-e-md text-muted-foreground/80 outline-none transition-[color,box-shadow] hover:text-foreground data-focus-visible:border-ring data-focus-visible:ring-[3px] data-focus-visible:ring-ring/50">
          <CalendarIcon aria-hidden="true" size={16} />
        </Button>
      </div>
      <Popover
        className="z-50 rounded-md border bg-background text-popover-foreground shadow-lg outline-hidden data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95"
        offset={4}
      >
        <Dialog className="max-h-[inherit] overflow-auto p-2">
          <RangeCalendar />
        </Dialog>
      </Popover>
    </DateRangePicker>
  )
}
