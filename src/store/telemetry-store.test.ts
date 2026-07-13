import { describe, expect, it, jest } from '@jest/globals'

import { buildOverviewSummary } from '@/lib/build-overview-summary'
import { buildBatteryFleetData } from '@/lib/telemetry-queries'
import { createTelemetryStore } from '@/store/telemetry-store'

import type { LoadedTelemetry } from '@/lib/build-telemetry-data'
import type { TelemetrySnapshot } from '@/types/telemetry'

const snapshot: TelemetrySnapshot = {
  events: [
    {
      id: 'evt-000001',
      batteryId: 'BAT-001',
      timestamp: '2023-10-01T00:00:00.000Z',
      timestampMs: 1,
      metrics: {
        voltage: 3.7,
        current: 5,
        temperature: 30,
        stateOfCharge: 70,
        stateOfHealth: 95,
      },
      status: 'charging',
    },
  ],
  batteryIds: ['BAT-001'],
  eventCount: 1,
  batteryCount: 1,
  firstTimestampMs: 1,
  lastTimestampMs: 1,
}

const telemetry: LoadedTelemetry = {
  snapshot,
  overviewSummary: buildOverviewSummary(snapshot),
}
const batteryFleetData = buildBatteryFleetData(snapshot)

const emptySnapshot: TelemetrySnapshot = {
  events: [],
  batteryIds: [],
  eventCount: 0,
  batteryCount: 0,
  firstTimestampMs: null,
  lastTimestampMs: null,
}

const emptyTelemetry: LoadedTelemetry = {
  snapshot: emptySnapshot,
  overviewSummary: buildOverviewSummary(emptySnapshot),
}

describe('createTelemetryStore', () => {
  it('deduplicates concurrent and completed load calls', async () => {
    let resolveLoad: (value: LoadedTelemetry) => void = () => undefined
    const loader = jest.fn(
      () =>
        new Promise<LoadedTelemetry>((resolve) => {
          resolveLoad = resolve
        }),
    )
    const store = createTelemetryStore(loader)

    const firstLoad = store.getState().load()
    const secondLoad = store.getState().load()

    expect(loader).toHaveBeenCalledTimes(1)
    expect(secondLoad).toBe(firstLoad)

    resolveLoad(telemetry)
    await firstLoad
    await store.getState().load()

    expect(loader).toHaveBeenCalledTimes(1)
    expect(store.getState().loadState).toEqual({
      status: 'ready',
      telemetry,
      batteryFleetData,
    })
  })

  it('aborts an active request before retrying', async () => {
    const signals: AbortSignal[] = []
    const resolvers: Array<(value: LoadedTelemetry) => void> = []
    const loader = jest.fn(
      (signal: AbortSignal) =>
        new Promise<LoadedTelemetry>((resolve, reject) => {
          signals.push(signal)
          resolvers.push(resolve)
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          )
        }),
    )
    const store = createTelemetryStore(loader)

    const firstLoad = store.getState().load()
    const retry = store.getState().retry()

    expect(signals[0]?.aborted).toBe(true)
    resolvers[1]?.(telemetry)

    await Promise.all([firstLoad, retry])

    expect(loader).toHaveBeenCalledTimes(2)
    expect(store.getState().loadState).toEqual({
      status: 'ready',
      telemetry,
      batteryFleetData,
    })
  })

  it('publishes an empty result without exposing a partial snapshot', async () => {
    const store = createTelemetryStore(() => Promise.resolve(emptyTelemetry))

    await store.getState().load()

    expect(store.getState().loadState).toEqual({ status: 'empty' })
  })

  it('turns a synchronous loader failure into an error state', async () => {
    const store = createTelemetryStore(() => {
      throw new Error('Worker construction failed')
    })

    await store.getState().load()

    expect(store.getState().loadState).toEqual({
      status: 'error',
      error: {
        message: 'Worker construction failed',
        retryable: true,
      },
    })
  })

  it('preserves retryability and ignores a stale completion', async () => {
    let resolveStale: (value: LoadedTelemetry) => void = () => undefined
    const loader = jest
      .fn<(signal: AbortSignal) => Promise<LoadedTelemetry>>()
      .mockImplementationOnce(
        () =>
          new Promise<LoadedTelemetry>((resolve) => {
            resolveStale = resolve
          }),
      )
      .mockRejectedValueOnce({ retryable: false })
    const store = createTelemetryStore(loader)

    const firstLoad = store.getState().load()
    const retry = store.getState().retry()
    resolveStale(telemetry)

    await Promise.all([firstLoad, retry])

    expect(store.getState().loadState).toEqual({
      status: 'error',
      error: {
        message: 'Telemetry data could not be loaded.',
        retryable: false,
      },
    })
  })
})
