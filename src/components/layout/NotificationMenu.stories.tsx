import { MemoryRouter } from 'react-router'

import { NotificationMenu } from '@/components/layout/NotificationMenu'
import { createReadyTelemetryLoadState } from '@/fixtures/telemetry'
import { useTelemetryStore } from '@/store/use-telemetry-store'

import type { Meta, StoryObj } from '@storybook/react-vite'

useTelemetryStore.setState({ loadState: createReadyTelemetryLoadState() })

const meta = {
  title: 'Layout/NotificationMenu',
  component: NotificationMenu,
  decorators: [(Story) => <MemoryRouter><Story /></MemoryRouter>],
  parameters: {
    docs: {
      description: {
        component:
          'Latest-record review notifications with unread state, priority context, and battery deep links. Open the bell to inspect the menu.',
      },
    },
    layout: 'centered',
  },
} satisfies Meta<typeof NotificationMenu>

export default meta

type Story = StoryObj<typeof meta>

export const AlertsAvailable: Story = {}
