import { MemoryRouter } from 'react-router'

import { UserMenu } from '@/components/layout/UserMenu'
import { createReadyTelemetryLoadState } from '@/fixtures/telemetry'
import { useTelemetryStore } from '@/store/use-telemetry-store'

import type { Meta, StoryObj } from '@storybook/react-vite'

useTelemetryStore.setState({ loadState: createReadyTelemetryLoadState() })

const meta = {
  title: 'Layout/UserMenu',
  component: UserMenu,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    docs: {
      description: {
        component:
          'Operator workspace menu with current fleet counts, review status, and primary navigation. Open the control to inspect the menu.',
      },
    },
    layout: 'centered',
  },
} satisfies Meta<typeof UserMenu>

export default meta

type Story = StoryObj<typeof meta>

export const ReadyFleet: Story = {}
