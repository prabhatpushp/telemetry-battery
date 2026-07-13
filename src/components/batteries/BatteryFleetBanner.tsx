import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type BatteryFleetBannerProps = {
  readonly batteryCount: number
  readonly chargingCount: number
  readonly dischargingCount: number
  readonly idleCount: number
  readonly latestReadingMs: number | null
}

const UTC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
})

function formatLatestReading(timestampMs: number | null): string {
  if (timestampMs === null) return 'No recorded reading'
  return `${UTC_DATE_TIME_FORMATTER.format(timestampMs)} UTC`
}

export function BatteryFleetBanner({
  batteryCount,
  chargingCount,
  dischargingCount,
  idleCount,
  latestReadingMs,
}: BatteryFleetBannerProps) {
  return (
    <Card aria-labelledby="battery-fleet-title" size="sm">
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold" id="battery-fleet-title">
              Battery fleet
            </h1>
            <Badge variant="secondary">Latest recorded</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {latestReadingMs === null ? (
              'No recorded reading'
            ) : (
              <time dateTime={new Date(latestReadingMs).toISOString()}>
                {formatLatestReading(latestReadingMs)}
              </time>
            )}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">Batteries</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {batteryCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Charging</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--battery-status-charging)]">
              {chargingCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Discharging</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--battery-status-discharging)]">
              {dischargingCount}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Idle</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {idleCount}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
