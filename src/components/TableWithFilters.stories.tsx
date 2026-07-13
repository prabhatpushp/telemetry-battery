import { fn } from 'storybook/test'

import {
  TableWithFilters,
  type TableColumn,
} from '@/components/TableWithFilters'
import { Badge } from '@/components/ui/badge'

import type { Meta, StoryObj } from '@storybook/react-vite'

type FleetRow = {
  readonly batteryId: string
  readonly charge: number
  readonly status: 'Charging' | 'Discharging' | 'Idle'
}

const columns: readonly TableColumn<FleetRow>[] = [
  {
    id: 'batteryId',
    header: 'Battery',
    isSortable: true,
    renderCell: (row) => <span className="font-mono">{row.batteryId}</span>,
    width: '180px',
  },
  {
    id: 'charge',
    header: 'Charge',
    isSortable: true,
    renderCell: (row) => `${row.charge.toFixed(1)}%`,
    width: '180px',
  },
  {
    id: 'status',
    header: 'Status',
    renderCell: (row) => <Badge variant="outline">{row.status}</Badge>,
    width: '220px',
  },
]

const rows: readonly FleetRow[] = [
  { batteryId: 'BAT-011', charge: 5.6, status: 'Discharging' },
  { batteryId: 'BAT-031', charge: 14.2, status: 'Charging' },
  { batteryId: 'BAT-058', charge: 58.4, status: 'Discharging' },
  { batteryId: 'BAT-084', charge: 87.6, status: 'Idle' },
]

const meta = {
  title: 'Tables/TableWithFilters',
  parameters: {
    docs: {
      description: {
        component:
          'Generic virtualized table surface with optional filters, result count, sortable headers, and an explicit empty state.',
      },
    },
    layout: 'padded',
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const FleetRows: Story = {
  render: () => (
    <TableWithFilters
      ariaLabel="Battery fleet example"
      columns={columns}
      emptyMessage="No batteries match the current filters."
      getRowId={(row) => row.batteryId}
      onSortChange={fn()}
      resultDescription="4 batteries"
      rows={rows}
      sort={{ id: 'charge', descending: false }}
    />
  ),
}

export const Empty: Story = {
  render: () => (
    <TableWithFilters
      ariaLabel="Empty battery fleet example"
      columns={columns}
      emptyMessage="No batteries match the current filters."
      getRowId={(row) => row.batteryId}
      resultDescription="0 batteries"
      rows={[]}
    />
  ),
}
