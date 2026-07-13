import { ThemeProvider } from 'next-themes'
import { MemoryRouter } from 'react-router'

import { ApplicationHeader } from '@/components/layout/ApplicationHeader'
import { createReadyTelemetryLoadState } from '@/fixtures/telemetry'
import { useTelemetryStore } from '@/store/use-telemetry-store'

import type { Meta, StoryObj } from '@storybook/react-vite'

useTelemetryStore.setState({ loadState: createReadyTelemetryLoadState() })

const meta = {
  title: 'Layout/ApplicationHeader',
  component: ApplicationHeader,
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light">
        <MemoryRouter initialEntries={['/explore-data']}>
          <Story />
        </MemoryRouter>
      </ThemeProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Responsive application navigation, global battery search, theme control, review notifications, operator menu, and telemetry status.',
      },
    },
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ApplicationHeader>

export default meta

type Story = StoryObj<typeof meta>

export const ReadyFleet: Story = {}
