import { MenuIcon } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import TelemetrySearch from "@/components/TelemetrySearch";
import { TelemetryEventDetailDialog } from "@/components/telemetry/TelemetryEventDetailDialog";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTelemetryStore } from "@/store/use-telemetry-store";

import type { TelemetryEventRow } from "@/lib/telemetry-queries";

import { ApplicationLogo } from "./ApplicationLogo";
import { NotificationMenu } from "./NotificationMenu";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

const navigationLinks = [
    { label: "Overview", to: "/" },
    { label: "Explore Data", to: "/explore-data" },
    { label: "Telemetry Events", to: "/telemetry-events" },
    { label: "Batteries", to: "/batteries" },
] as const;

function isActiveRoute(pathname: string, route: string): boolean {
    return route === "/" ? pathname === route : pathname.startsWith(route);
}

export function ApplicationHeader() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const loadState = useTelemetryStore((state) => state.loadState);
    const [selectedEvent, setSelectedEvent] = useState<TelemetryEventRow | null>(null);
    const telemetry = loadState.status === "ready" ? loadState.telemetry : null;
    const batteryIds = telemetry?.snapshot.batteryIds ?? [];
    const eventRows = loadState.status === "ready" ? loadState.batteryFleetData.eventRows : [];
    const attentionCount = telemetry?.overviewSummary.attentionCount ?? 0;

    let telemetryStatus = "Loading telemetry";
    let telemetryStatusClassName = "bg-muted-foreground";

    if (loadState.status === "error") {
        telemetryStatus = "Telemetry unavailable";
        telemetryStatusClassName = "bg-destructive";
    } else if (loadState.status === "empty") {
        telemetryStatus = "No telemetry records";
    } else if (telemetry) {
        const batteryCount = telemetry.snapshot.batteryCount;
        const eventCount = telemetry.snapshot.eventCount.toLocaleString();
        telemetryStatus = attentionCount > 0 ? `${batteryCount} batteries · ${attentionCount} need review · ${eventCount} events` : `${batteryCount} batteries monitored · ${eventCount} events`;
        telemetryStatusClassName = attentionCount > 0 ? "bg-[var(--battery-status-low)]" : "bg-[var(--battery-status-normal)]";
    }

    return (
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
                <div className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 py-2 md:h-16 md:gap-3 md:py-0">
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button aria-label="Toggle navigation" className="size-8 md:hidden" size="icon" variant="ghost">
                                    <MenuIcon aria-hidden="true" size={16} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-48 p-1 md:hidden">
                                <NavigationMenu className="max-w-none *:w-full">
                                    <NavigationMenuList className="flex-col items-start gap-0">
                                        {navigationLinks.map((link) => (
                                            <NavigationMenuItem className="w-full" key={link.to}>
                                                <NavigationMenuLink active={isActiveRoute(pathname, link.to)} asChild className="py-1.5">
                                                    <Link to={link.to}>{link.label}</Link>
                                                </NavigationMenuLink>
                                            </NavigationMenuItem>
                                        ))}
                                    </NavigationMenuList>
                                </NavigationMenu>
                            </PopoverContent>
                        </Popover>

                        <Link aria-label="Battery telemetry overview" className="flex items-center gap-2 text-primary hover:text-primary/90" to="/">
                            <ApplicationLogo />
                            <span className="hidden min-w-0 sm:block">
                                <span className="block truncate text-sm font-semibold leading-tight">Battery telemetry</span>
                                <span className="block truncate text-xs text-muted-foreground">Fleet operations</span>
                            </span>
                        </Link>
                    </div>

                    <div className="order-3 col-span-3 mx-auto w-full max-w-none md:order-none md:col-span-1 md:max-w-sm" role="search">
                        <TelemetrySearch
                            batteryIds={batteryIds}
                            eventRows={eventRows}
                            onBatterySelect={(batteryId) => void navigate(`/batteries/${encodeURIComponent(batteryId)}`)}
                            onEventSelect={setSelectedEvent}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <ThemeToggle />
                        <NotificationMenu />
                        <UserMenu />
                    </div>
                </div>

                <div className="min-h-10 hidden items-center justify-end gap-4 border-t py-1.5 md:flex md:justify-between">
                    <NavigationMenu className="max-md:hidden">
                        <NavigationMenuList className="gap-2">
                            {navigationLinks.map((link) => (
                                <NavigationMenuItem key={link.to}>
                                    <NavigationMenuLink active={isActiveRoute(pathname, link.to)} asChild className="py-1.5 font-medium text-muted-foreground hover:text-primary">
                                        <Link to={link.to}>{link.label}</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>
            </div>

            {selectedEvent && (
                <TelemetryEventDetailDialog
                    onOpenChange={(open) => {
                        if (!open) setSelectedEvent(null);
                    }}
                    open
                    row={selectedEvent}
                    showTrigger={false}
                />
            )}
        </header>
    );
}
