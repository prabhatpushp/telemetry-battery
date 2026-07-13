import { BatteryFleet } from '@/components/dashboard/BatteryFleet'
import { createLoadedTelemetry } from '@/fixtures/telemetry'

import type { Meta, StoryObj } from '@storybook/react-vite'

const telemetry = createLoadedTelemetry()

const meta = {
  title: 'Dashboard/BatteryFleet',
  component: BatteryFleet,
  args: {
    batteryCount: telemetry.snapshot.batteryCount,
    groups: telemetry.overviewSummary.batteryGroups,
  },
  argTypes: {
    groups: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Fleet charge distribution visual grouped by critical, low, and standard latest-record charge bands.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof BatteryFleet>

export default meta

type Story = StoryObj<typeof meta>

export const LatestFleet: Story = {}

export const EmptyFleet: Story = {
  args: {
    batteryCount: 0,
    groups: telemetry.overviewSummary.batteryGroups.map((group) => ({
      ...group,
      count: 0,
      medianStateOfCharge: 0,
    })),
  },
}
