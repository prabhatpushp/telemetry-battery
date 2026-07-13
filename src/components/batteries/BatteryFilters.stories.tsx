import { fn } from 'storybook/test'

import { BatteryFilters } from '@/components/batteries/BatteryFilters'

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { BatteryGridFilters } from '@/lib/battery-grid-filters'

const defaultFilters = {
  search: '',
  priority: 'all',
  status: 'all',
  reason: 'all',
  sort: 'priority',
} satisfies BatteryGridFilters

const meta = {
  title: 'Batteries/BatteryFilters',
  component: BatteryFilters,
  args: {
    filters: defaultFilters,
    hasActiveFilters: false,
    onClear: fn(),
    onPriorityChange: fn(),
    onReasonChange: fn(),
    onSearchChange: fn(),
    onSortChange: fn(),
    onStatusChange: fn(),
  },
  argTypes: {
    filters: { control: false },
    onClear: { control: false },
    onPriorityChange: { control: false },
    onReasonChange: { control: false },
    onSearchChange: { control: false },
    onSortChange: { control: false },
    onStatusChange: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'URL-ready battery search, severity, operating-state, reason, and sort controls with a debounced text input.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof BatteryFilters>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ActiveFilters: Story = {
  args: {
    filters: {
      search: 'BAT-03',
      priority: 'low',
      status: 'charging',
      reason: 'low-health',
      sort: 'charge-ascending',
    },
    hasActiveFilters: true,
  },
}
