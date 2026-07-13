import { create, type StoreApi, type UseBoundStore } from 'zustand'

import { buildBatteryFleetData } from '@/lib/telemetry-queries'

import type { LoadedTelemetry } from '@/lib/build-telemetry-data'
import type { BatteryFleetData } from '@/lib/telemetry-queries'

export type TelemetryLoadError = {
  readonly message: string
  readonly retryable: boolean
}

export type TelemetryLoadState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'empty' }
  | {
      readonly status: 'ready'
      readonly telemetry: LoadedTelemetry
      readonly batteryFleetData: BatteryFleetData
    }
  | { readonly status: 'error'; readonly error: TelemetryLoadError }

export type LoadTelemetry = (
  signal: AbortSignal,
) => Promise<LoadedTelemetry>

export type TelemetryStore = {
  readonly loadState: TelemetryLoadState
  readonly load: () => Promise<void>
  readonly retry: () => Promise<void>
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

function toLoadError(error: unknown): TelemetryLoadError {
  const message =
    error instanceof Error && error.message.length > 0
      ? error.message
      : 'Telemetry data could not be loaded.'
  const retryable =
    typeof error === 'object' &&
    error !== null &&
    'retryable' in error &&
    typeof error.retryable === 'boolean'
      ? error.retryable
      : true

  return {
    message,
    retryable,
  }
}

export function createTelemetryStore(
  loadTelemetry: LoadTelemetry,
): UseBoundStore<StoreApi<TelemetryStore>> {
  let activeController: AbortController | null = null
  let activeLoad: Promise<void> | null = null
  let requestSequence = 0

  return create<TelemetryStore>((set, get) => {
    function startLoad(isForced: boolean): Promise<void> {
      if (!isForced) {
        if (activeLoad) return activeLoad
        if (get().loadState.status !== 'idle') return Promise.resolve()
      }

      requestSequence += 1
      const requestId = requestSequence

      activeController?.abort()
      const controller = new AbortController()
      activeController = controller
      set({ loadState: { status: 'loading' } })

      let telemetryPromise: Promise<LoadedTelemetry>

      try {
        telemetryPromise = loadTelemetry(controller.signal)
      } catch (error) {
        telemetryPromise = Promise.reject(
          error instanceof Error
            ? error
            : new Error('Telemetry loader failed.', { cause: error }),
        )
      }

      const loadPromise = telemetryPromise
        .then((telemetry) => {
          if (requestId !== requestSequence) return

          set({
            loadState:
              telemetry.snapshot.eventCount === 0
                ? { status: 'empty' }
                : {
                    status: 'ready',
                    telemetry,
                    batteryFleetData: buildBatteryFleetData(
                      telemetry.snapshot,
                    ),
                  },
          })
        })
        .catch((error: unknown) => {
          if (requestId !== requestSequence || isAbortError(error)) return
          console.error('[telemetry] Load failed.', error)
          set({ loadState: { status: 'error', error: toLoadError(error) } })
        })
        .finally(() => {
          if (requestId !== requestSequence) return
          activeController = null
          activeLoad = null
        })

      activeLoad = loadPromise
      return loadPromise
    }

    return {
      loadState: { status: 'idle' },
      load: () => startLoad(false),
      retry: () => startLoad(true),
    }
  })
}
