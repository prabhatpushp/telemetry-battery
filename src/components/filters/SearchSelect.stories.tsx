import { fn } from 'storybook/test'

import { SearchSelect } from '@/components/filters/SearchSelect'

import type { Meta, StoryObj } from '@storybook/react-vite'

const options = ['BAT-011', 'BAT-031', 'BAT-058', 'BAT-084'].map(
  (batteryId) => ({ label: batteryId, value: batteryId }),
)

const meta = {
  title: 'Filters/SearchSelect',
  component: SearchSelect,
  args: {
    ariaLabel: 'Filter by battery',
    emptyMessage: 'No battery found.',
    onValueChange: fn(),
    options,
    placeholder: 'All batteries',
    searchPlaceholder: 'Search batteries...',
    value: '',
  },
  argTypes: {
    onValueChange: { control: false },
    options: { control: false },
  },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component:
          'Searchable single-select control used for battery filtering. It preserves native button semantics and exposes the selected option by label.',
      },
    },
    layout: 'centered',
  },
} satisfies Meta<typeof SearchSelect>

export default meta

type Story = StoryObj<typeof meta>

export const Unselected: Story = {}

export const Selected: Story = {
  args: { value: 'BAT-058' },
}

export const NoOptions: Story = {
  args: { options: [] },
}
