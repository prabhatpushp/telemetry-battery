import { buildOverviewSummary } from '@/lib/build-overview-summary'
import { buildTelemetryModel } from '@/lib/build-telemetry-model'

import type { OverviewSummary } from '@/lib/build-overview-summary'
import type { TelemetrySnapshot } from '@/types/telemetry'

export type LoadedTelemetry = {
  readonly snapshot: TelemetrySnapshot
  readonly overviewSummary: OverviewSummary
}

export function buildTelemetryData(payload: unknown): LoadedTelemetry {
  const snapshot = buildTelemetryModel(payload)

  return {
    snapshot,
    overviewSummary: buildOverviewSummary(snapshot),
  }
}
