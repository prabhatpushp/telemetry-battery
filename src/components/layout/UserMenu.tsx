import {
  BoltIcon,
  BookOpenIcon,
  ChevronDownIcon,
  Layers2Icon,
  Rows3Icon,
} from 'lucide-react'
import { Link } from 'react-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTelemetryStore } from '@/store/use-telemetry-store'

const workspaceLinks = [
  { icon: BoltIcon, label: 'Overview', to: '/' },
  { icon: Layers2Icon, label: 'Battery fleet', to: '/batteries' },
  { icon: BookOpenIcon, label: 'Explore data', to: '/explore-data' },
  { icon: Rows3Icon, label: 'Telemetry events', to: '/telemetry-events' },
] as const

export function UserMenu() {
  const loadState = useTelemetryStore((state) => state.loadState)
  const telemetry =
    loadState.status === 'ready' ? loadState.telemetry : null
  const attentionCount = telemetry?.overviewSummary.attentionCount ?? 0

  let statusLabel = 'Indexing telemetry'
  let statusClassName = 'bg-muted-foreground'

  if (loadState.status === 'error') {
    statusLabel = 'Telemetry unavailable'
    statusClassName = 'bg-destructive'
  } else if (loadState.status === 'empty') {
    statusLabel = 'No telemetry records'
  } else if (telemetry) {
    statusLabel =
      attentionCount > 0
        ? `${attentionCount} batteries need review`
        : 'Fleet readings are within policy'
    statusClassName =
      attentionCount > 0
        ? 'bg-[var(--battery-status-low)]'
        : 'bg-[var(--battery-status-normal)]'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open operator menu"
          className="h-9 gap-1.5 rounded-full p-1 pr-2 shadow-none"
          variant="ghost"
        >
          <Avatar>
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              OP
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-xs font-medium lg:inline">Operator</span>
          <ChevronDownIcon
            aria-hidden="true"
            className="hidden text-muted-foreground lg:block"
            size={14}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex min-w-0 flex-col px-2 py-2">
          <span className="truncate text-sm font-semibold text-foreground">
            Fleet operator
          </span>
          <span className="truncate font-normal text-xs text-muted-foreground">
            Battery telemetry workspace
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="space-y-2 px-2 py-2">
          {telemetry ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-muted px-3 py-2">
                <div className="text-base font-semibold">
                  {telemetry.snapshot.batteryCount}
                </div>
                <div className="text-xs text-muted-foreground">Batteries</div>
              </div>
              <div className="rounded-md bg-muted px-3 py-2">
                <div className="text-base font-semibold">
                  {telemetry.snapshot.eventCount.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Events</div>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-full ${statusClassName}`}
            />
            <span>{statusLabel}</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {workspaceLinks.map(({ icon: Icon, label, to }) => (
            <DropdownMenuItem asChild key={to}>
              <Link className="gap-2" to={to}>
                <Icon aria-hidden="true" className="opacity-60" size={16} />
                <span>{label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
