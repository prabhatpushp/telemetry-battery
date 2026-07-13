import { BatteryTelemetryChart } from '@/components/charts/BatteryTelemetryChart'
import { createTelemetryHistory } from '@/fixtures/telemetry'

import type { Meta, StoryObj } from '@storybook/react-vite'

const history = createTelemetryHistory()

const meta = {
  title: 'Charts/BatteryTelemetryChart',
  component: BatteryTelemetryChart,
  args: {
    rows: history,
    title: 'Telemetry history',
  },
  argTypes: {
    rows: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Interactive historical telemetry chart with metric visibility, combined and separate layouts, pan, zoom, and keyboard controls.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof BatteryTelemetryChart>

export default meta

type Story = StoryObj<typeof meta>

export const CompleteHistory: Story = {}

export const HistoryWithGap: Story = {
  args: {
    rows: history.filter((_, index) => index < 14 || index > 38),
  },
  parameters: {
    docs: {
      description: {
        story:
          'A gap longer than 24 hours remains disconnected so the chart does not imply fabricated telemetry.',
      },
    },
  },
}

export const Empty: Story = {
  args: {
    rows: [],
  },
}
