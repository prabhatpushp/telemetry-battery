import { PowerFlow } from '@/components/dashboard/PowerFlow'

import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Dashboard/PowerFlow',
  component: PowerFlow,
  args: {
    chargingKilowatts: 1.46,
    dischargingKilowatts: 0.92,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Latest-record charging and discharging power estimate. Values are aggregate recorded power, not live grid flow.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof PowerFlow>

export default meta

type Story = StoryObj<typeof meta>

export const MixedFlow: Story = {}

export const ChargingOnly: Story = {
  args: { chargingKilowatts: 1.82, dischargingKilowatts: 0 },
}

export const DischargingOnly: Story = {
  args: { chargingKilowatts: 0, dischargingKilowatts: 1.27 },
}

export const NoRecordedFlow: Story = {
  args: { chargingKilowatts: 0, dischargingKilowatts: 0 },
}
