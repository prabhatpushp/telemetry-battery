import { CircleAlertIcon, DatabaseIcon } from 'lucide-react'
import { fn } from 'storybook/test'

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

import type { Meta, StoryObj } from '@storybook/react-vite'

const retry = fn()

const meta = {
  title: 'UI/Feedback',
  parameters: {
    docs: {
      description: {
        component:
          'Production feedback compositions for empty datasets and recoverable loading failures.',
      },
    },
    layout: 'centered',
  },
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

export const EmptyDataset: Story = {
  render: () => (
    <Empty className="min-h-72 w-[40rem] max-w-full border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <DatabaseIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No telemetry found</EmptyTitle>
        <EmptyDescription>
          The data source did not contain any battery events.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={retry} type="button" variant="outline">
          Reload telemetry
        </Button>
      </EmptyContent>
    </Empty>
  ),
}

export const RecoverableError: Story = {
  render: () => (
    <Alert className="w-[40rem] max-w-full" variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>Battery data could not be loaded</AlertTitle>
      <AlertDescription>
        The telemetry source is temporarily unavailable. Existing application
        controls remain safe to use.
      </AlertDescription>
      <AlertAction>
        <Button onClick={retry} size="sm" type="button" variant="outline">
          Try again
        </Button>
      </AlertAction>
    </Alert>
  ),
}
