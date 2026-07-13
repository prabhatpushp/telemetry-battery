import { loadTelemetry } from '@/services/telemetry-worker-client'
import { createTelemetryStore } from '@/store/telemetry-store'

export const useTelemetryStore = createTelemetryStore(loadTelemetry)
