import { fn } from 'storybook/test'

import { ExploreDataFilterBar } from '@/components/telemetry/ExploreDataFilterBar'
import { DEFAULT_EXPLORE_FILTERS } from '@/lib/explore-data-filters'

import type { Meta, StoryObj } from '@storybook/react-vite'

const batteryIds = ['BAT-011', 'BAT-031', 'BAT-058', 'BAT-084']

const meta = {
  title: 'Telemetry/ExploreDataFilterBar',
  component: ExploreDataFilterBar,
  args: {
    batteryIds,
    filters: DEFAULT_EXPLORE_FILTERS,
    firstDate: '2026-06-13',
    hasActiveFilters: false,
    lastDate: '2026-07-13',
    onFiltersChange: fn(),
    onReset: fn(),
    variant: 'analysis',
  },
  argTypes: {
    batteryIds: { control: false },
    filters: { control: false },
    onFiltersChange: { control: false },
    onReset: { control: false },
    variant: { control: 'inline-radio', options: ['analysis', 'events'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Compact analysis and event filter variants composed from the production date, battery, metric, status, and advanced controls.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof ExploreDataFilterBar>

export default meta

type Story = StoryObj<typeof meta>

export const Analysis: Story = {}

export const EventExplorer: Story = {
  args: {
    filters: {
      ...DEFAULT_EXPLORE_FILTERS,
      search: 'evt-BAT-031',
      status: 'charging',
    },
    hasActiveFilters: true,
    variant: 'events',
  },
}
