import { BellIcon, CircleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useTelemetryStore } from '@/store/use-telemetry-store'

import type { AttentionBattery } from '@/lib/build-overview-summary'

const NOTIFICATION_LIMIT = 5
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

const priorityClassNames: Readonly<
  Record<AttentionBattery['priority'], string>
> = {
  critical: 'text-[var(--battery-status-critical)]',
  low: 'text-[var(--battery-status-low)]',
  metric: 'text-[var(--battery-status-metric)]',
}

export function NotificationMenu() {
  const loadState = useTelemetryStore((state) => state.loadState)
  const [readEventIds, setReadEventIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const notifications =
    loadState.status === 'ready'
      ? loadState.telemetry.overviewSummary.attentionBatteries
      : []
  const visibleNotifications = notifications.slice(0, NOTIFICATION_LIMIT)
  const unreadCount = notifications.filter(
    (notification) => !readEventIds.has(notification.event.id),
  ).length

  function handleMarkAllAsRead(): void {
    setReadEventIds(
      new Set(notifications.map((notification) => notification.event.id)),
    )
  }

  function handleNotificationClick(eventId: string): void {
    setReadEventIds((currentIds) => new Set(currentIds).add(eventId))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={
            unreadCount > 0
              ? `Open notifications, ${unreadCount} unread alerts`
              : 'Open notifications'
          }
          className="relative size-8 rounded-full text-muted-foreground shadow-none"
          size="icon"
          variant="ghost"
        >
          <BellIcon aria-hidden="true" size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        aria-label="Telemetry notifications"
        className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        <div className="flex items-start justify-between gap-4 border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Telemetry alerts</h2>
            <p className="text-xs text-muted-foreground">
              {notifications.length > 0
                ? `${notifications.length} batteries need review`
                : 'Latest battery readings'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              className="shrink-0 text-xs font-medium text-primary hover:underline"
              onClick={handleMarkAllAsRead}
              type="button"
            >
              Mark all read
            </button>
          )}
        </div>

        {loadState.status === 'idle' || loadState.status === 'loading' ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground" role="status">
            Loading telemetry alerts…
          </p>
        ) : loadState.status === 'error' ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium">Alerts are unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Telemetry could not be loaded.
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium">No active alerts</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No latest readings match a review rule.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {visibleNotifications.map((notification) => {
              const { event } = notification
              const isUnread = !readEventIds.has(event.id)

              return (
                <Link
                  className="group flex gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:bg-accent"
                  key={event.id}
                  onClick={() => handleNotificationClick(event.id)}
                  to={`/batteries/${encodeURIComponent(event.batteryId)}`}
                >
                  <CircleAlertIcon
                    aria-hidden="true"
                    className={`mt-0.5 size-4 shrink-0 ${priorityClassNames[notification.priority]}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {event.batteryId}
                      </span>
                      {isUnread && (
                        <span
                          aria-label="Unread"
                          className="size-2 shrink-0 rounded-full bg-primary"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm text-foreground/80">
                      {notification.reason}
                      {notification.reasons.length > 1
                        ? ` +${notification.reasons.length - 1} more`
                        : ''}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {event.metrics.stateOfCharge.toFixed(1)}% charge ·{' '}
                      {event.metrics.temperature.toFixed(1)}°C
                    </span>
                    <time
                      className="mt-0.5 block text-xs text-muted-foreground"
                      dateTime={event.timestamp}
                    >
                      {TIMESTAMP_FORMATTER.format(event.timestampMs)} UTC
                    </time>
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button asChild className="w-full" size="sm" variant="ghost">
              <Link to="/batteries">
                View all {notifications.length} batteries
              </Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
