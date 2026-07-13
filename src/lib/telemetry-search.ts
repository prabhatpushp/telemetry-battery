import type { TelemetryEventRow } from '@/lib/telemetry-queries'

const RESULT_LIMIT = 6

export type TelemetrySearchMatches = {
  readonly batteryIds: readonly string[]
  readonly eventRows: readonly TelemetryEventRow[]
}

export function findTelemetrySearchMatches(
  batteryIds: readonly string[],
  eventRows: readonly TelemetryEventRow[],
  query: string,
): TelemetrySearchMatches {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (normalizedQuery.length === 0) return { batteryIds: [], eventRows: [] }

  const matchingBatteryIds: string[] = []
  for (const batteryId of batteryIds) {
    if (!batteryId.toLocaleLowerCase().includes(normalizedQuery)) continue
    matchingBatteryIds.push(batteryId)
    if (matchingBatteryIds.length === RESULT_LIMIT) break
  }

  const matchingEventRows: TelemetryEventRow[] = []
  for (const row of eventRows) {
    if (!row.event.id.toLocaleLowerCase().includes(normalizedQuery)) continue
    matchingEventRows.push(row)
    if (matchingEventRows.length === RESULT_LIMIT) break
  }

  return { batteryIds: matchingBatteryIds, eventRows: matchingEventRows }
}
