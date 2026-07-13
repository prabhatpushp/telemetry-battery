import { BatteryCollectionSidebar } from '@/components/dashboard/BatteryCollectionSidebar'
import { BatteryFleet } from '@/components/dashboard/BatteryFleet'
import { PowerFlow } from '@/components/dashboard/PowerFlow'
import { useTelemetryStore } from '@/store/use-telemetry-store'

export function OverviewPage() {
  const loadState = useTelemetryStore((state) => state.loadState)
  const retry = useTelemetryStore((state) => state.retry)
  const summary =
    loadState.status === 'ready'
      ? loadState.telemetry.overviewSummary
      : null

  if (loadState.status === 'error') {
    return (
      <section
        aria-labelledby="telemetry-error-heading"
        className="mx-auto my-8 max-w-xl rounded-2xl border border-destructive/30 bg-card p-6 text-card-foreground"
      >
        <h1 className="text-lg font-semibold" id="telemetry-error-heading">
          Telemetry could not be loaded
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {loadState.error.message}
        </p>
        {loadState.error.retryable && (
          <button
            className="mt-5 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-ring"
            onClick={() => void retry()}
            type="button"
          >
            Try again
          </button>
        )}
      </section>
    )
  }

  if (loadState.status === 'empty') {
    return (
      <section className="mx-auto my-8 max-w-xl rounded-2xl border border-border bg-card p-6 text-card-foreground">
        <h1 className="text-lg font-semibold">No telemetry found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The data source did not contain any battery events.
        </p>
      </section>
    )
  }

  if (!summary) {
    return (
      <div
        aria-label="Loading battery telemetry"
        className="mx-auto grid w-full max-w-[1232px] animate-pulse items-stretch gap-6 py-6 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]"
        role="status"
      >
        <div className="h-[880px] rounded-[var(--dashboard-panel-radius)] border-2 border-border bg-muted" />
        <div className="grid min-h-0 gap-6 xl:h-full xl:grid-rows-[auto_minmax(0,1fr)]">
          <div className="aspect-[2.015/1] rounded-[var(--dashboard-panel-radius)] border-2 border-border bg-muted" />
          <div className="h-[536px] rounded-[var(--dashboard-panel-radius)] border-2 border-border bg-muted max-[500px]:h-[502px]" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-[1232px] items-stretch gap-6 py-6 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
      <BatteryFleet
        batteryCount={summary.readingCount}
        groups={summary.batteryGroups}
      />
      <div className="grid min-h-0 min-w-0 gap-6 xl:h-full xl:grid-rows-[auto_minmax(0,1fr)]">
        <PowerFlow
          chargingKilowatts={summary.chargingKilowatts}
          dischargingKilowatts={summary.dischargingKilowatts}
        />
        <BatteryCollectionSidebar batteries={summary.attentionBatteries} />
      </div>
    </div>
  )
}
