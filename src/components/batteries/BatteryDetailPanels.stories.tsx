import { BatteryDetailPanels } from '@/components/batteries/BatteryDetailPanels'
import { createFleetTelemetryRows } from '@/fixtures/telemetry'
import {
  buildAsOfPeerComparison,
  buildSynchronizedBatteryHistory,
} from '@/lib/telemetry-p1-data'
import { buildAsOfBatteryRows } from '@/lib/telemetry-queries'

import type { Meta, StoryObj } from '@storybook/react-vite'

const fleetRows = createFleetTelemetryRows()
const batteryId = 'BAT-031'
const rows = fleetRows.filter((row) => row.event.batteryId === batteryId)
const history = buildSynchronizedBatteryHistory(rows, { batteryId })
const asOfData = buildAsOfBatteryRows(fleetRows, { lookbackMs: null })
const peerComparisons = [
  'stateOfCharge',
  'stateOfHealth',
  'temperature',
  'absoluteRecordedPower',
] as const
const comparisons = peerComparisons.map((metric) =>
  buildAsOfPeerComparison(asOfData, { batteryId, metric }),
)

const meta = {
  title: 'Batteries/BatteryDetailPanels',
  component: BatteryDetailPanels,
  args: {
    history,
    peerComparisons: comparisons,
    rows,
  },
  argTypes: {
    history: { control: false },
    peerComparisons: { control: false },
    rows: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Detail evidence panels for observation coverage, policy-rule occurrences, and latest fleet percentile context.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta<typeof BatteryDetailPanels>

export default meta

type Story = StoryObj<typeof meta>

export const FleetContext: Story = {}
