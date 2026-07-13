import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'

import { Battery } from '@/components/batteries/Battery'
import type { BatteryLevelGroup, BatteryTone } from '@/lib/build-overview-summary'

import './BatteryFleet.css'

type BatteryFleetProps = {
  readonly batteryCount: number
  readonly groups: readonly BatteryLevelGroup[]
}

const dotPatterns: Record<string, readonly string[]> = {
  '0': [
    '0111110',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '1100011',
    '0111110',
  ],
  '1': [
    '0011000',
    '0111000',
    '1111000',
    '0011000',
    '0011000',
    '0011000',
    '0011000',
    '0011000',
    '0011000',
    '0011000',
    '1111110',
  ],
}

const toneColors: Record<BatteryTone, string> = {
  critical: 'var(--fleet-critical, #e94b43)',
  low: 'var(--fleet-low, #e6a10d)',
  standard: 'var(--fleet-standard, #5ed153)',
}

export function BatteryFleet({ batteryCount, groups }: BatteryFleetProps) {
  const dotValue = String(batteryCount)
  const dotPitch = 15
  const verticalPitch = 13.5
  const digitWidth = 7 * dotPitch
  const digitGap = 10
  const heroDots: ReactNode[] = []

  ;[...dotValue].forEach((digit, digitIndex) => {
    const pattern = dotPatterns[digit]
    if (!pattern) return

    pattern.forEach((row, rowIndex) => {
      ;[...row].forEach((cell, columnIndex) => {
        if (cell !== '1') return

        heroDots.push(
          <circle
            cx={8 + digitIndex * (digitWidth + digitGap) + columnIndex * dotPitch}
            cy={8 + rowIndex * verticalPitch}
            key={`${digitIndex}-${rowIndex}-${columnIndex}`}
            r="5.1"
          />,
        )
      })
    })
  })

  return (
    <section
      aria-labelledby="fleet-heading"
      className="fleet-device-shell px-[30px] pb-[34px] pt-[25px] max-[680px]:px-[5.5vw] max-[680px]:pb-[6vw] max-[680px]:pt-[5vw]"
    >
      <header className="flex items-start justify-between">
        <svg
          aria-label="Fleet mark"
          className="h-7 w-10"
          role="img"
          viewBox="0 0 52 36"
        >
          <defs>
            <linearGradient id="fleet-mark-metal" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="var(--fleet-mark-highlight)" />
              <stop offset=".5" stopColor="var(--fleet-mark-mid)" />
              <stop offset="1" stopColor="var(--fleet-mark-end)" />
            </linearGradient>
          </defs>
          <path
            d="M10 4h10L10 32H0zM25 4h10L25 32H15zM40 4h10L40 32H30z"
            fill="url(#fleet-mark-metal)"
          />
        </svg>
      </header>

      <section
        aria-label="Fleet summary"
        className="mt-[25px] max-[680px]:mt-[4vw]"
      >
        <svg
          aria-label={`${batteryCount} batteries`}
          className="block h-auto w-full max-w-[312px]"
          role="img"
          viewBox="0 0 335 148"
        >
          <defs>
            <filter height="160%" id="fleet-dot-glow" width="160%" x="-30%" y="-30%">
              <feGaussianBlur result="blur" stdDeviation="1.3" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g fill="var(--fleet-device-ink)" filter="url(#fleet-dot-glow)">
            {heroDots}
          </g>
        </svg>
        <h1
          className="fleet-title -mt-[3px] text-[65px] font-light leading-none
            tracking-[-0.055em] max-[680px]:text-[11.5vw]"
          id="fleet-heading"
        >
          Battery fleet
        </h1>
      </section>

      <section aria-label="Battery health levels" className="mt-[30px]">
        <div className="relative px-[18px] max-[680px]:px-0">
          <div
            aria-hidden="true"
            className="fleet-scale pointer-events-none absolute left-0 top-[60px] hidden h-[291px] w-6 sm:block"
          >
            <div className="fleet-tech-label absolute -left-4 top-0 text-[10px]">100</div>
            <div className="fleet-scale-major-tick absolute left-1 top-[4px] h-px w-2" />
            {[1, 2, 3, 4, 6, 7, 8, 9].map((tick) => (
              <div
                className="fleet-scale-minor-tick absolute left-1 h-px w-2"
                key={tick}
                style={{ top: `${tick * 28.4}px` }}
              />
            ))}
            <div className="fleet-tech-label absolute -left-2 top-[140px] text-[10px]">50</div>
            <div className="fleet-scale-major-tick absolute left-1 top-[145px] h-px w-2" />
            <div className="fleet-tech-label absolute left-0 top-[283px] text-[10px]">0</div>
            <div className="fleet-scale-major-tick absolute left-1 top-[287px] h-px w-2" />
          </div>

          <div className="grid grid-cols-3 gap-[23px] max-[680px]:gap-[2.5vw]">
            {groups.map((group) => {
              const status = group.label

              return (
                <article
                  aria-label={`${status}: ${Math.round(group.medianStateOfCharge)}% battery level, ${group.count} batteries`}
                  className="fleet-battery-card"
                  key={group.tone}
                  style={
                    {
                      '--fleet-status-color': toneColors[group.tone],
                    } as CSSProperties
                  }
                >
                  <h2 className="fleet-status-title mb-3">{status}</h2>
                  <Battery
                    className="mx-auto w-full max-w-[135px]"
                    label={status}
                    level={group.medianStateOfCharge}
                    tone={group.tone}
                    variant="fleet"
                  />
                  <p className="fleet-battery-count">{group.count} batteries</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="mt-[28px] px-[4px] max-[680px]:mt-[5vw] max-[680px]:px-0">
        <Link
          aria-label="View all batteries"
          className="fleet-action-button group"
          to="/batteries"
        >
          <span className="fleet-action-cell fleet-action-icon">
            <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 36 36">
              {[0, 1, 2, 3, 5, 6, 7, 8].map((cell) => (
                <circle
                  cx={5 + (cell % 3) * 11}
                  cy={5 + Math.floor(cell / 3) * 11}
                  fill="none"
                  key={cell}
                  r="2.7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              ))}
              <circle cx="16" cy="16" fill="currentColor" r="2.2" />
            </svg>
          </span>
          <span
            className="fleet-action-cell fleet-action-label justify-start! px-3.5
              text-left font-mono text-[13px] font-bold uppercase tracking-[-0.08em]
              max-[680px]:px-3 max-[680px]:text-[3vw]"
          >
            View all batteries
          </span>
          <span className="fleet-action-cell">
            <svg
              aria-hidden="true"
              className="fleet-action-arrow h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="m9 5 7 7-7 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
        </Link>
      </footer>
    </section>
  )
}
