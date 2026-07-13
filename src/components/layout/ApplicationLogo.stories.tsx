import { ApplicationLogo } from '@/components/layout/ApplicationLogo'

import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Layout/ApplicationLogo',
  component: ApplicationLogo,
  decorators: [
    (Story) => (
      <div aria-label="Battery telemetry" className="text-primary">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Decorative application mark. Its accessible product name is supplied by the containing navigation link.',
      },
    },
    layout: 'centered',
  },
} satisfies Meta<typeof ApplicationLogo>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
