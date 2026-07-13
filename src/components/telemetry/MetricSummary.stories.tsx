import { MetricSummary } from '@/components/telemetry/MetricSummary'

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { DistributionSummary } from '@/lib/telemetry-chart-data'

const summary = {
  eventCount: 68,
  batteryCount: 4,
  minimum: 5.6,
  p10: 19.4,
  p25: 43.1,
  median: 58.8,
  mean: 57.2,
  p75: 72.6,
  p90: 84.3,
  maximum: 87.6,
  iqr: 29.5,
  first: 51.2,
  latest: 87.6,
  observedDelta: 36.4,
  firstTimestampMs: Date.UTC(2026, 6, 11),
  latestTimestampMs: Date.UTC(2026, 6, 13),
} satisfies DistributionSummary

const emptySummary = Object.fromEntries(
  Object.keys(summary).map((key) => [
    key,
    key === 'eventCount' || key === 'batteryCount' ? 0 : null,
  ]),
) as DistributionSummary

const meta = {
  title: 'Telemetry/MetricSummary',
  component: MetricSummary,
  args: {
    metric: 'stateOfCharge',
    summary,
  },
  argTypes: {
    metric: {
      control: 'select',
      options: [
        'stateOfCharge',
        'stateOfHealth',
        'voltage',
        'current',
        'temperature',
        'recordedPower',
      ],
    },
    summary: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Six-number telemetry summary with metric-aware units and an explicit unavailable-value state.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof MetricSummary>

export default meta

type Story = StoryObj<typeof meta>

export const StateOfCharge: Story = {}

export const NoObservations: Story = {
  args: { summary: emptySummary },
}
