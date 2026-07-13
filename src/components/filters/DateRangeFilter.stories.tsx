import { fn } from 'storybook/test'

import { DateRangeFilter } from '@/components/filters/DateRangeFilter'

import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Filters/DateRangeFilter',
  component: DateRangeFilter,
  args: {
    end: '2026-07-13',
    maximum: '2026-07-13',
    minimum: '2026-06-13',
    onChange: fn(),
    start: '2026-07-01',
  },
  argTypes: {
    onChange: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Accessible UTC date-range picker constrained to the available telemetry window.',
      },
    },
    layout: 'centered',
  },
} satisfies Meta<typeof DateRangeFilter>

export default meta

type Story = StoryObj<typeof meta>

export const SelectedRange: Story = {}

export const FullAvailableRange: Story = {
  args: { start: '', end: '' },
}
