import { MemoryRouter } from 'react-router'

import { BatteryCard } from '@/components/batteries/BatteryCard'
import { createBatteryTableRow } from '@/fixtures/telemetry'

import type { Meta, StoryObj } from '@storybook/react-vite'

const healthyRow = createBatteryTableRow({
  batteryId: 'BAT-084',
  metrics: { current: 6.4, stateOfCharge: 86.2 },
  status: 'charging',
})

const meta = {
  title: 'Batteries/BatteryCard',
  component: BatteryCard,
  args: {
    returnTo: '/batteries',
    row: healthyRow,
  },
  argTypes: {
    returnTo: { control: false },
    row: { control: false },
  },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/batteries']}>
        <div className="w-[22rem] max-w-full">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Navigable battery summary card with charge, operating state, latest metrics, and derived review priority.',
      },
    },
    layout: 'centered',
  },
} satisfies Meta<typeof BatteryCard>

export default meta

type Story = StoryObj<typeof meta>

export const Healthy: Story = {}

export const MetricReview: Story = {
  args: {
    row: createBatteryTableRow({
      batteryId: 'BAT-058',
      metrics: { current: -4.8, stateOfCharge: 54.6, temperature: 42.4 },
      status: 'discharging',
    }),
  },
}

export const LowCharge: Story = {
  args: {
    row: createBatteryTableRow({
      batteryId: 'BAT-031',
      metrics: { current: 8.4, stateOfCharge: 14.8, stateOfHealth: 82.8 },
      status: 'charging',
    }),
  },
}

export const CriticalCharge: Story = {
  args: {
    row: createBatteryTableRow({
      batteryId: 'BAT-073',
      metrics: { current: -6.2, stateOfCharge: 3.9 },
      status: 'discharging',
    }),
  },
}

export const DarkTheme: Story = {
  globals: { theme: 'dark' },
}
