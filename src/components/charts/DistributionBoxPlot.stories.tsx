import { DistributionBoxPlot } from '@/components/charts/DistributionBoxPlot'

import type { Meta, StoryObj } from '@storybook/react-vite'

const data = [
  {
    color: 'var(--battery-status-charging)',
    count: 24,
    label: 'Charging',
    minimum: 44,
    p10: 49,
    p25: 55,
    median: 64,
    p75: 72,
    p90: 79,
    maximum: 86,
  },
  {
    color: 'var(--battery-status-discharging)',
    count: 31,
    label: 'Discharging',
    minimum: 6,
    p10: 18,
    p25: 33,
    median: 52,
    p75: 67,
    p90: 75,
    maximum: 82,
  },
  {
    color: 'var(--muted-foreground)',
    count: 13,
    label: 'Idle',
    minimum: 38,
    p10: 43,
    p25: 51,
    median: 59,
    p75: 68,
    p90: 73,
    maximum: 78,
  },
]

const meta = {
  title: 'Charts/DistributionBoxPlot',
  component: DistributionBoxPlot,
  args: {
    ariaLabel: 'State of charge distribution by operating status',
    data,
    formatValue: (value) => `${value.toFixed(0)}%`,
  },
  argTypes: {
    data: { control: false },
    formatValue: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Responsive SVG distribution comparison showing range, percentile band, quartiles, and median for each group.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof DistributionBoxPlot>

export default meta

type Story = StoryObj<typeof meta>

export const ByOperatingStatus: Story = {}

export const NoData: Story = {
  args: { data: [] },
}
