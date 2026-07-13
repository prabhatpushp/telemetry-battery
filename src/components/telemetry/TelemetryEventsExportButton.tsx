import { DownloadIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { buildTelemetryEventsCsv } from '@/lib/telemetry-event-export'

import type { ExploreDataFilters } from '@/lib/explore-data-filters'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'

export type TelemetryEventsExportButtonProps = {
  readonly filters: ExploreDataFilters
  readonly rows: readonly TelemetryEventRow[]
}

export function TelemetryEventsExportButton({
  filters,
  rows,
}: TelemetryEventsExportButtonProps) {
  function handleExport(): void {
    const blob = new Blob([buildTelemetryEventsCsv(rows, filters)], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `battery-telemetry-events-${new Date().toISOString().slice(0, 10)}.csv`
    link.href = url
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <Button
      disabled={rows.length === 0}
      onClick={handleExport}
      size="sm"
      type="button"
      variant="outline"
    >
      <DownloadIcon aria-hidden="true" />
      Export {rows.length.toLocaleString()} rows
    </Button>
  )
}
