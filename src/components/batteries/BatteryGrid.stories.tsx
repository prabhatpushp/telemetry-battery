import { MemoryRouter } from 'react-router'
import { fn } from 'storybook/test'

import { BatteryGrid } from '@/components/batteries/BatteryGrid'
import { createBatteryTableRow } from '@/fixtures/telemetry'

import type { Meta, StoryObj } from '@storybook/react-vite'

const rows = [
  createBatteryTableRow({
    batteryId: 'BAT-073',
    metrics: { current: -6.2, stateOfCharge: 3.9 },
    observationAgeMs: 94 * 60 * 1000,
    status: 'discharging',
  }),
  createBatteryTableRow({
    batteryId: 'BAT-031',
    metrics: { current: 8.4, stateOfCharge: 14.8, stateOfHealth: 82.8 },
    observationAgeMs: 4.2 * 60 * 60 * 1000,
    status: 'charging',
  }),
  createBatteryTableRow({
    batteryId: 'BAT-058',
    metrics: { current: -6.2, stateOfCharge: 54.6, temperature: 42.4 },
    observationAgeMs: 8.7 * 60 * 60 * 1000,
    status: 'discharging',
  }),
  createBatteryTableRow({
    batteryId: 'BAT-084',
    metrics: { current: 8.4, stateOfCharge: 86.2 },
    observationAgeMs: 12.4 * 60 * 60 * 1000,
    status: 'charging',
  }),
]

const meta = {
  title: 'Batteries/BatteryGrid',
  component: BatteryGrid,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Responsive battery results with production cards and a recoverable no-match state.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof BatteryGrid>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    allRows: rows,
    rows,
    hasActiveFilters: false,
    onClearFilters: fn(),
  },
}

export const NoMatches: Story = {
  args: {
    allRows: rows,
    rows: [],
    hasActiveFilters: true,
    onClearFilters: fn(),
  },
}
