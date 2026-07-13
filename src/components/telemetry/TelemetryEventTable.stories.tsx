import { MemoryRouter } from 'react-router'
import { fn } from 'storybook/test'

import { TelemetryEventTable } from '@/components/telemetry/TelemetryEventTable'
import { createFleetTelemetryRows } from '@/fixtures/telemetry'

import type { Meta, StoryObj } from '@storybook/react-vite'

const rows = createFleetTelemetryRows().slice(-20)

const meta = {
  title: 'Telemetry/TelemetryEventTable',
  component: TelemetryEventTable,
  args: {
    matchingBatteryCount: 4,
    onSortChange: fn(),
    rows,
    sort: { id: 'timestamp', descending: true },
    totalEventCount: 68,
  },
  argTypes: {
    filters: { control: false },
    onSortChange: { control: false },
    rows: { control: false },
    sort: { control: false },
  },
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    docs: {
      description: {
        component:
          'Virtualized event evidence table with sortable telemetry columns, battery deep links, review reasons, and observed gaps.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof TelemetryEventTable>

export default meta

type Story = StoryObj<typeof meta>

export const RecentEvents: Story = {}

export const NoMatches: Story = {
  args: {
    matchingBatteryCount: 0,
    rows: [],
  },
}
