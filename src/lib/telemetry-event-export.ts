import { DEFAULT_EXPLORE_FILTERS } from '@/lib/explore-data-filters'
import {
  REVIEW_PRIORITY_LABELS,
  REVIEW_REASON_DEFINITIONS,
} from '@/lib/telemetry-policy'

import type { ExploreDataFilters } from '@/lib/explore-data-filters'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'

const CSV_HEADERS = [
  'Event ID',
  'Battery ID',
  'Timestamp UTC',
  'Status',
  'Voltage V',
  'Current A',
  'Temperature deg C',
  'State of charge %',
  'State of health %',
  'Recorded power W',
  'Primary review priority',
  'Review reasons',
  'Prior observation gap hours',
] as const

function escapeCsv(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function csvRow(values: readonly (string | number)[]): string {
  return values.map(escapeCsv).join(',')
}

function describeFilters(filters: ExploreDataFilters): string {
  const active = (Object.keys(filters) as (keyof ExploreDataFilters)[])
    .filter((key) => filters[key] !== DEFAULT_EXPLORE_FILTERS[key])
    .map((key) => `${key}=${filters[key]}`)
  return active.length === 0 ? 'None' : active.join('; ')
}

export function buildTelemetryEventsCsv(
  rows: readonly TelemetryEventRow[],
  filters: ExploreDataFilters,
): string {
  const metadata = [
    csvRow(['Export', 'Filtered battery telemetry events']),
    csvRow(['Timezone', 'UTC']),
    csvRow(['Active filters', describeFilters(filters)]),
    csvRow([
      'Derived review rules',
      'Critical charge: SoC < 10%; low charge: 10% <= SoC < 20%; temperature review: >= 40 deg C; health review: SoH < 85%',
    ]),
    '',
  ]
  const records = rows.map((row) =>
    csvRow([
      row.event.id,
      row.event.batteryId,
      new Date(row.event.timestampMs).toISOString(),
      row.event.status,
      row.event.metrics.voltage,
      row.event.metrics.current,
      row.event.metrics.temperature,
      row.event.metrics.stateOfCharge,
      row.event.metrics.stateOfHealth,
      row.recordedPowerWatts,
      REVIEW_PRIORITY_LABELS[row.primaryPriority],
      row.reasonCodes
        .map((reason) => REVIEW_REASON_DEFINITIONS[reason].label)
        .join('; '),
      row.gapBeforeMs === null
        ? ''
        : row.gapBeforeMs / (60 * 60 * 1000),
    ]),
  )

  return [...metadata, csvRow(CSV_HEADERS), ...records].join('\r\n')
}
