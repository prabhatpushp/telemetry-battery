import { MemoryRouter } from 'react-router'

import { BatteryCollectionSidebar } from '@/components/dashboard/BatteryCollectionSidebar'
import { createLoadedTelemetry } from '@/fixtures/telemetry'

import type { Meta, StoryObj } from '@storybook/react-vite'

const telemetry = createLoadedTelemetry()

const meta = {
  title: 'Dashboard/BatteryCollectionSidebar',
  component: BatteryCollectionSidebar,
  args: {
    batteries: telemetry.overviewSummary.attentionBatteries,
  },
  argTypes: {
    batteries: { control: false },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="mx-auto max-w-md"><Story /></div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Priority queue of latest battery observations that match one or more review rules.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof BatteryCollectionSidebar>

export default meta

type Story = StoryObj<typeof meta>

export const NeedsReview: Story = {}

export const NoReviewItems: Story = {
  args: { batteries: [] },
}
