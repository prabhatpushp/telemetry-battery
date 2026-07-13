import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Toggle } from '@/components/ui/toggle'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDarkTheme = resolvedTheme === 'dark'

  return (
    <Toggle
      aria-label={`Switch to ${isDarkTheme ? 'light' : 'dark'} mode`}
      className="size-8 rounded-full border-none text-muted-foreground shadow-none"
      onPressedChange={() => setTheme(isDarkTheme ? 'light' : 'dark')}
      pressed={isDarkTheme}
      type="button"
      variant="outline"
    >
      {isDarkTheme ? (
        <MoonIcon aria-hidden="true" size={16} />
      ) : (
        <SunIcon aria-hidden="true" size={16} />
      )}
    </Toggle>
  )
}
