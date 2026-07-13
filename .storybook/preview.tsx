import type { Decorator, Preview } from '@storybook/react-vite'
import '@/styles/globals.css'

const withTheme: Decorator = (Story, context) => {
  const isDark = context.globals.theme === 'dark'

  return (
    <div className={isDark ? 'dark' : undefined}>
      <div className="min-h-screen bg-background p-8 text-foreground">
        <Story />
      </div>
    </div>
  )
}

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: 'Component color theme',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { title: 'Light', value: 'light' },
          { title: 'Dark', value: 'dark' },
        ],
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  parameters: {
    a11y: {
      test: 'error',
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default preview
