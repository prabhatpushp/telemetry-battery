import { ThemeProvider } from 'next-themes'
import { RouterProvider } from 'react-router'

import { router } from '@/app/routes/router'

export function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      storageKey="battery-ops-theme"
    >
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
