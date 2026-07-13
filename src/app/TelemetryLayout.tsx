import { useEffect } from 'react'
import { Outlet } from 'react-router'

import { useTelemetryStore } from '@/store/use-telemetry-store'

export function TelemetryLayout() {
  const load = useTelemetryStore((store) => store.load)

  useEffect(() => {
    // The store owns request lifetime so route rerenders cannot restart loading.
    void load()
  }, [load])

  return <Outlet />
}
