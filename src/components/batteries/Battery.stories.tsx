import { Battery } from '@/components/batteries/Battery'

import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Batteries/Battery',
  component: Battery,
  args: {
    className: 'h-80 w-32',
    label: 'BAT-073',
    level: 72,
    tone: 'standard',
    variant: 'fleet',
  },
  argTypes: {
    level: { control: { min: 0, max: 100, step: 1, type: 'range' } },
    tone: {
      control: 'select',
      options: ['critical', 'low', 'metric', 'standard'],
    },
    variant: { control: 'inline-radio', options: ['fleet', 'compact'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Accessible battery visual used across fleet summaries and battery cards. The level is clamped to 0–100 and the tone communicates review severity.',
      },
    },
    layout: 'centered',
  },
} satisfies Meta<typeof Battery>

export default meta

type Story = StoryObj<typeof meta>

export const Healthy: Story = {}

export const MetricReview: Story = {
  args: {
    label: 'BAT-058',
    level: 54,
    tone: 'metric',
  },
}

export const LowCharge: Story = {
  args: {
    label: 'BAT-031',
    level: 15,
    tone: 'low',
  },
}

export const CriticalCharge: Story = {
  args: {
    label: 'BAT-073',
    level: 4,
    tone: 'critical',
  },
}

export const DarkTheme: Story = {
  globals: { theme: 'dark' },
}
