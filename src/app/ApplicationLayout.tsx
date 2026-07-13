import { Outlet } from 'react-router'

import { ApplicationHeader } from '@/components/layout/ApplicationHeader'

export function ApplicationLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ApplicationHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-6">
        <Outlet />
      </main>
    </div>
  )
}
