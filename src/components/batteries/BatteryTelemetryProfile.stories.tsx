import { BatteryTelemetryProfile } from '@/components/batteries/BatteryTelemetryProfile'
import { createTelemetryHistory } from '@/fixtures/telemetry'

import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Batteries/BatteryTelemetryProfile',
  component: BatteryTelemetryProfile,
  args: {
    rows: createTelemetryHistory('BAT-031', 80),
  },
  argTypes: {
    rows: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Time-bucket heatmap for all six telemetry metrics with daily, weekly, monthly, and yearly views.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof BatteryTelemetryProfile>

export default meta

type Story = StoryObj<typeof meta>

export const MonthlyProfile: Story = {}
