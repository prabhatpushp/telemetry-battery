import { ThemeProvider } from 'next-themes'

import { ThemeToggle } from '@/components/layout/ThemeToggle'

import type { Meta, StoryObj } from '@storybook/react-vite'

const meta = {
  title: 'Layout/ThemeToggle',
  component: ThemeToggle,
  decorators: [
    (Story, context) => (
      <ThemeProvider
        attribute="class"
        forcedTheme={context.globals.theme === 'dark' ? 'dark' : 'light'}
      >
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Compact accessible theme control reflecting the resolved light or dark preference.',
      },
    },
    layout: 'centered',
  },
} satisfies Meta<typeof ThemeToggle>

export default meta

type Story = StoryObj<typeof meta>

export const Light: Story = {}

export const Dark: Story = {
  globals: { theme: 'dark' },
}
