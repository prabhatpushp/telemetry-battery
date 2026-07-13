import { createBrowserRouter } from 'react-router'

import { ApplicationLayout } from '@/app/ApplicationLayout'
import { TelemetryLayout } from '@/app/TelemetryLayout'
import { ErrorPage } from '@/app/errors/ErrorPage'
import { NotFoundPage } from '@/app/errors/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: ApplicationLayout,
    ErrorBoundary: ErrorPage,
    children: [
      {
        Component: TelemetryLayout,
        children: [
          {
            index: true,
            lazy: () =>
              import('@/app/pages/OverviewPage').then(({ OverviewPage }) => ({
                Component: OverviewPage,
              })),
          },
          {
            path: 'explore-data',
            lazy: () =>
              import('@/app/pages/ExploreDataPage').then(
                ({ ExploreDataPage }) => ({ Component: ExploreDataPage }),
              ),
          },
          {
            path: 'telemetry-events',
            lazy: () =>
              import('@/app/pages/TelemetryEventsPage').then(
                ({ TelemetryEventsPage }) => ({
                  Component: TelemetryEventsPage,
                }),
              ),
          },
          {
            path: 'batteries',
            lazy: () =>
              import('@/app/pages/BatteriesPage').then(
                ({ BatteriesPage }) => ({ Component: BatteriesPage }),
              ),
          },
          {
            path: 'batteries/:batteryId',
            lazy: () =>
              import('@/app/pages/BatteryPage').then(({ BatteryPage }) => ({
                Component: BatteryPage,
              })),
          },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
