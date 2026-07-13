import { BatteryDetailOverview } from '@/components/batteries/BatteryDetailOverview'
import { createTelemetryEventRow } from '@/fixtures/telemetry'

import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Batteries/BatteryDetailOverview',
  component: BatteryDetailOverview,
  args: {
    latestRow: createTelemetryEventRow({
      batteryId: 'BAT-084',
      metrics: { current: 6.4, stateOfCharge: 87.6 },
      status: 'charging',
    }),
  },
  argTypes: {
    latestRow: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Battery-detail hero combining the latest charge visual, operating status, derived review priority, and six recorded metrics.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof BatteryDetailOverview>

export default meta

type Story = StoryObj<typeof meta>

export const Healthy: Story = {}

export const CriticalCharge: Story = {
  args: {
    latestRow: createTelemetryEventRow({
      batteryId: 'BAT-011',
      metrics: { current: -6.4, stateOfCharge: 5.6, temperature: 40.8 },
      status: 'discharging',
    }),
  },
}
