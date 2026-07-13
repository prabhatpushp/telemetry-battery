import { BatteryFleetBanner } from '@/components/batteries/BatteryFleetBanner'
import { STORY_REFERENCE_TIME_MS } from '@/fixtures/telemetry'

import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Batteries/BatteryFleetBanner',
  component: BatteryFleetBanner,
  args: {
    batteryCount: 100,
    chargingCount: 38,
    dischargingCount: 44,
    idleCount: 18,
    latestReadingMs: STORY_REFERENCE_TIME_MS,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Latest-record fleet context with operating-state counts and an explicit UTC timestamp.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof BatteryFleetBanner>

export default meta

type Story = StoryObj<typeof meta>

export const LatestSnapshot: Story = {}

export const NoRecordedReading: Story = {
  args: {
    batteryCount: 0,
    chargingCount: 0,
    dischargingCount: 0,
    idleCount: 0,
    latestReadingMs: null,
  },
}
