import { CheckIcon, ChevronDownIcon } from 'lucide-react'
import { useId, useState } from 'react'

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
import { cn } from '@/lib/cn'

export type SearchSelectOption = {
  readonly label: string
  readonly value: string
}

export type SearchSelectProps = {
  readonly ariaLabel: string
  readonly emptyMessage: string
  readonly options: readonly SearchSelectOption[]
  readonly placeholder: string
  readonly searchPlaceholder: string
  readonly value: string
  readonly onValueChange: (value: string) => void
}

export function SearchSelect({
  ariaLabel,
  emptyMessage,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  value,
}: SearchSelectProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          aria-label={ariaLabel}
          className="h-8 w-full justify-between border-input bg-background px-3 font-normal outline-none outline-offset-0 hover:bg-background focus-visible:outline-[3px]"
          id={id}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className="shrink-0 text-muted-foreground/80"
            size={16}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-full min-w-[var(--radix-popper-anchor-width)] border-input p-0"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                  value={`${option.label} ${option.value}`}
                >
                  {option.label}
                  {value === option.value && (
                    <CheckIcon className="ml-auto" size={16} />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
