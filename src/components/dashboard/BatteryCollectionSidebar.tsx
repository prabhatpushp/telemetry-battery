import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Battery } from '@/components/batteries/Battery'
import type { AttentionBattery } from '@/lib/build-overview-summary'

import './BatteryCollectionSidebar.css'

type BatteryCollectionSidebarProps = {
  readonly batteries: readonly AttentionBattery[]
}

const socPatterns: Record<string, readonly string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '%': ['11001', '11010', '00100', '01000', '10110', '00110', '00000'],
}

function buildSocDots(value: number): ReactNode[] {
  const dots: ReactNode[] = []
  const characters = [...`${Math.round(value)}%`]
  const pitch = 3.7

  characters.forEach((character, characterIndex) => {
    const pattern = socPatterns[character]
    if (!pattern) return

    pattern.forEach((row, rowIndex) => {
      ;[...row].forEach((cell, columnIndex) => {
        if (cell !== '1') return

        dots.push(
          <circle
            cx={3 + characterIndex * 21 + columnIndex * pitch}
            cy={3 + rowIndex * pitch}
            key={`${characterIndex}-${rowIndex}-${columnIndex}`}
            r="1.25"
          />,
        )
      })
    })
  })

  return dots
}

export function BatteryCollectionSidebar({
  batteries,
}: BatteryCollectionSidebarProps) {
  return (
    <aside aria-labelledby="attention-heading" className="battery-collection-panel">
      <header className="battery-collection-header">
        <div className="flex items-center gap-3">
          <svg
            aria-hidden="true"
            fill="none"
            height="22"
            viewBox="0 0 40 40"
            width="22"
          >
            <path
              d="M18.2 5.8a2.1 2.1 0 0 1 3.6 0l15.1 26.1a2.1 2.1 0 0 1-1.8 3.2H4.9a2.1 2.1 0 0 1-1.8-3.2L18.2 5.8Z"
              stroke="var(--battery-collection-alert-icon)"
              strokeWidth="2.4"
            />
            <path
              d="M20 13.3v11.2"
              stroke="var(--battery-collection-alert-icon)"
              strokeLinecap="round"
              strokeWidth="2.4"
            />
            <circle
              cx="20"
              cy="29.4"
              fill="var(--battery-collection-alert-icon)"
              r="1.5"
            />
          </svg>
          <h2 id="attention-heading">Needs attention</h2>
        </div>
      </header>

      <div
        aria-label="Batteries needing attention"
        className="battery-collection-list"
        role="region"
      >
        {batteries.map(({ event, reason, tone }) => {
          const stateOfCharge = Math.round(event.metrics.stateOfCharge)
          const socDots = buildSocDots(stateOfCharge)

          return (
            <Link
              aria-label={`Open ${event.batteryId}, ${reason.toLowerCase()} at ${stateOfCharge}%`}
              className="battery-collection-row"
              key={event.batteryId}
              to={`/batteries/${event.batteryId}`}
            >
              <span className="battery-collection-slot">
                <Battery
                  className="battery-collection-mini"
                  label={event.batteryId}
                  level={stateOfCharge}
                  tone={tone}
                  variant="compact"
                />
              </span>
              <span className="battery-collection-content">
                <span className="battery-collection-row-top">
                  <span>
                    <span className="battery-collection-id">{event.batteryId}</span>
                    <span className="battery-collection-badge">
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="16"
                        viewBox="0 0 40 40"
                        width="16"
                      >
                        <path
                          d="M18.2 5.8a2.1 2.1 0 0 1 3.6 0l15.1 26.1a2.1 2.1 0 0 1-1.8 3.2H4.9a2.1 2.1 0 0 1-1.8-3.2L18.2 5.8Z"
                          stroke="currentColor"
                          strokeWidth="2.4"
                        />
                        <path
                          d="M20 13.3v11.2"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="2.4"
                        />
                        <circle cx="20" cy="29.4" fill="currentColor" r="1.5" />
                      </svg>
                      {reason.replace(' charge', '')}
                    </span>
                  </span>
                  <span className="battery-collection-soc">
                    <svg
                      aria-label={`${stateOfCharge}% state of charge`}
                      className="h-[28px] w-[52px]"
                      role="img"
                      viewBox={`0 0 ${[...`${stateOfCharge}%`].length * 21} 29`}
                    >
                      <g fill="var(--battery-collection-soc)">{socDots}</g>
                    </svg>
                    <span className="battery-collection-soc-label">SOC</span>
                  </span>
                </span>
                <span className="battery-collection-metrics">
                  <span>
                    <span className="battery-collection-metric-value">
                      {event.metrics.voltage.toFixed(1)} V
                    </span>
                    <span className="battery-collection-metric-label">Voltage</span>
                  </span>
                  <span>
                    <span className="battery-collection-metric-value">
                      {event.metrics.current.toFixed(2)} A
                    </span>
                    <span className="battery-collection-metric-label">Current</span>
                  </span>
                  <span>
                    <span className="battery-collection-metric-value">
                      {event.metrics.temperature.toFixed(1)}°C
                    </span>
                    <span className="battery-collection-metric-label">Temp</span>
                  </span>
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
