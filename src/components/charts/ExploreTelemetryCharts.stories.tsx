import { fn } from 'storybook/test'

import ExploreTelemetryCharts from '@/components/charts/ExploreTelemetryCharts'
import { createFleetTelemetryRows } from '@/fixtures/telemetry'
import {
  buildFleetTrend,
  buildHistogram,
  buildStatusComparison,
} from '@/lib/telemetry-chart-data'

import type { Meta, StoryObj } from '@storybook/react-vite'

const eventRows = createFleetTelemetryRows()
const metric = 'stateOfCharge'
const fromMs = Math.min(...eventRows.map((row) => row.event.timestampMs))
const toMs = Math.max(...eventRows.map((row) => row.event.timestampMs))

const meta = {
  title: 'Charts/ExploreTelemetryCharts',
  component: ExploreTelemetryCharts,
  args: {
    eventRows,
    histogram: buildHistogram(eventRows, metric, 10),
    metric,
    onMetricChange: fn(),
    statusComparison: buildStatusComparison(eventRows, metric),
    trend: buildFleetTrend(eventRows, {
      bucketCount: 16,
      fromMs,
      metric,
      toMs,
    }),
  },
  argTypes: {
    eventRows: { control: false },
    histogram: { control: false },
    onMetricChange: { control: false },
    statusComparison: { control: false },
    trend: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Complete exploratory analysis surface: distribution, fleet trend, status comparison, review-condition mix, and per-battery history.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof ExploreTelemetryCharts>

export default meta

type Story = StoryObj<typeof meta>

export const StateOfChargeAnalysis: Story = {}

export const NoMatchingEvents: Story = {
  args: {
    eventRows: [],
    histogram: buildHistogram([], metric),
    statusComparison: buildStatusComparison([], metric),
    trend: [],
  },
}
