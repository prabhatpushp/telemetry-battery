import { memo, useId, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import type { BatteryTone } from '@/lib/build-overview-summary'

type BatteryProps = {
  readonly className?: string
  readonly label: string
  readonly level: number
  readonly tone: BatteryTone | 'metric'
  readonly variant: 'fleet' | 'compact'
}

const pixelPatterns: Record<string, readonly string[]> = {
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

const toneColors: Record<
  BatteryTone | 'metric',
  { readonly main: string; readonly deep: string }
> = {
  critical: {
    main: 'var(--battery-liquid-critical, #e94b43)',
    deep: 'var(--battery-liquid-critical-deep, #501413)',
  },
  low: {
    main: 'var(--battery-liquid-low, #e6a10d)',
    deep: 'var(--battery-liquid-low-deep, #59400a)',
  },
  metric: {
    main: 'var(--battery-liquid-metric, #9b7cf4)',
    deep: 'var(--battery-liquid-metric-deep, #35205e)',
  },
  standard: {
    main: 'var(--battery-liquid-normal, #5ed153)',
    deep: 'var(--battery-liquid-normal-deep, #123e18)',
  },
}

export const Battery = memo(function Battery({
  className,
  label,
  level,
  tone,
  variant,
}: BatteryProps) {
  const uniqueId = useId().replaceAll(':', '')
  const percentage = Math.round(Math.max(0, Math.min(100, level)))
  const fillTop = 410 - percentage * 3.15
  const batteryColors = toneColors[tone]
  const isFleet = variant === 'fleet'
  const mainColor = batteryColors.main
  const deepColor = batteryColors.deep
  const surfaceDuration = isFleet
    ? tone === 'critical'
      ? '4.2s'
      : tone === 'low'
        ? '4.8s'
        : '5.4s'
    : `${4.3 + percentage * 0.12}s`
  const surfaceBegin = isFleet
    ? tone === 'critical'
      ? '0s'
      : tone === 'low'
        ? '-1.4s'
        : '-2.6s'
    : undefined
  const outerBodyPath =
    'M44 43 C27 43 17 58 17 78 V396 C17 417 29 429 48 433 C74 438 106 438 132 433 C151 429 163 417 163 396 V78 C163 58 153 43 136 43 Z'
  const innerBodyPath =
    'M45 53 C31 53 23 66 23 82 V394 C23 411 34 420 49 423 C75 427 105 427 131 423 C146 420 157 411 157 394 V82 C157 66 149 53 135 53 Z'
  const shoulderPath =
    'M35 54 C36 38 48 28 62 27 H118 C132 28 144 38 145 54 C151 57 155 63 157 72 C135 67 45 67 23 72 C25 63 29 57 35 54 Z'
  const waveTopFrames = [
    `M18 ${fillTop} C34 ${fillTop - 3} 50 ${fillTop - 6} 66 ${fillTop - 2} C82 ${fillTop + 3} 98 ${fillTop + 6} 114 ${fillTop + 2} C130 ${fillTop - 2} 146 ${fillTop - 5} 162 ${fillTop}`,
    `M18 ${fillTop + 1} C34 ${fillTop + 6} 50 ${fillTop + 4} 66 ${fillTop} C82 ${fillTop - 5} 98 ${fillTop - 7} 114 ${fillTop - 2} C130 ${fillTop + 4} 146 ${fillTop + 6} 162 ${fillTop + 1}`,
    `M18 ${fillTop - 1} C34 ${fillTop - 5} 50 ${fillTop - 3} 66 ${fillTop + 2} C82 ${fillTop + 6} 98 ${fillTop + 4} 114 ${fillTop - 1} C130 ${fillTop - 6} 146 ${fillTop - 4} 162 ${fillTop - 1}`,
    `M18 ${fillTop} C34 ${fillTop + 2} 50 ${fillTop + 6} 66 ${fillTop + 2} C82 ${fillTop - 3} 98 ${fillTop - 6} 114 ${fillTop - 2} C130 ${fillTop + 2} 146 ${fillTop + 5} 162 ${fillTop}`,
  ]
  const waveFillFrames = waveTopFrames.map((frame) => `${frame} V420 H18 Z`)
  const waveTopValues = [...waveTopFrames, waveTopFrames[0]].join(';')
  const waveFillValues = [...waveFillFrames, waveFillFrames[0]].join(';')
  const percentageDots: ReactNode[] = []
  const percentageCharacters = [...`${percentage}%`]
  const pitch = 4.8
  const characterWidth = 5 * pitch
  const characterGap = 5
  const totalWidth =
    percentageCharacters.length * characterWidth +
    (percentageCharacters.length - 1) * characterGap
  const startX = 90 - totalWidth / 2 + pitch / 2

  if (isFleet) {
    percentageCharacters.forEach((character, characterIndex) => {
      const pattern = pixelPatterns[character]
      if (!pattern) return

      pattern.forEach((row, rowIndex) => {
        ;[...row].forEach((cell, columnIndex) => {
          if (cell !== '1') return

          percentageDots.push(
            <circle
              cx={
                startX +
                characterIndex * (characterWidth + characterGap) +
                columnIndex * pitch
              }
              cy={226 + rowIndex * pitch}
              key={`${characterIndex}-${rowIndex}-${columnIndex}`}
              r="1.65"
            />,
          )
        })
      })
    })
  }

  const terminalGradient = `${uniqueId}-terminal`
  const shellGradient = `${uniqueId}-shell`
  const liquidGradient = `${uniqueId}-liquid`
  const clipId = `${uniqueId}-clip`
  const glowId = `${uniqueId}-glow`
  const textGlowId = `${uniqueId}-text-glow`

  return (
    <svg
      aria-label={`${label} battery at ${percentage}%`}
      className={cn('block', className)}
      preserveAspectRatio={isFleet ? undefined : 'none'}
      role="img"
      viewBox="8 0 164 470"
    >
      <defs>
        <linearGradient id={terminalGradient} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--background)" />
          <stop offset=".15" stopColor="var(--muted-foreground)" />
          <stop
            offset={isFleet ? '.28' : '.3'}
            stopColor="var(--border)"
          />
          <stop
            offset={isFleet ? '.72' : '.74'}
            stopColor="var(--background)"
          />
          <stop
            offset={isFleet ? '.88' : '.9'}
            stopColor="var(--muted-foreground)"
          />
          <stop offset="1" stopColor="var(--background)" />
        </linearGradient>
        {isFleet ? (
          <linearGradient id={shellGradient} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--background)" />
            <stop offset=".055" stopColor="var(--muted-foreground)" />
            <stop offset=".105" stopColor="var(--card)" />
            <stop offset=".17" stopColor="var(--muted-foreground)" />
            <stop offset=".23" stopColor="var(--background)" />
            <stop offset=".77" stopColor="var(--background)" />
            <stop offset=".86" stopColor="var(--muted-foreground)" />
            <stop offset=".92" stopColor="var(--card)" />
            <stop offset=".965" stopColor="var(--muted-foreground)" />
            <stop offset="1" stopColor="var(--background)" />
          </linearGradient>
        ) : (
          <linearGradient id={shellGradient} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--background)" />
            <stop offset=".06" stopColor="var(--muted-foreground)" />
            <stop offset=".13" stopColor="var(--card)" />
            <stop offset=".2" stopColor="var(--muted-foreground)" />
            <stop offset=".29" stopColor="var(--background)" />
            <stop offset=".75" stopColor="var(--background)" />
            <stop offset=".87" stopColor="var(--muted-foreground)" />
            <stop offset="1" stopColor="var(--background)" />
          </linearGradient>
        )}
        <linearGradient id={liquidGradient} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={mainColor} stopOpacity={isFleet ? '.82' : '.93'} />
          <stop
            offset={isFleet ? '.42' : '.46'}
            stopColor={deepColor}
            stopOpacity={isFleet ? '.82' : '.88'}
          />
          <stop
            offset="1"
            stopColor={deepColor}
            stopOpacity={isFleet ? '.95' : '.97'}
          />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={innerBodyPath} />
        </clipPath>
        <filter
          height={isFleet ? '210%' : '280%'}
          id={glowId}
          width={isFleet ? '210%' : '220%'}
          x={isFleet ? '-55%' : '-60%'}
          y={isFleet ? '-55%' : '-90%'}
        >
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="7" />
          <feFlood floodColor={mainColor} floodOpacity=".9" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {isFleet && (
          <filter height="160%" id={textGlowId} width="160%" x="-30%" y="-30%">
            <feGaussianBlur result="blur" stdDeviation=".65" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      <path d={outerBodyPath} fill="var(--background)" />
      <rect
        fill="var(--background)"
        height="23"
        rx="9"
        stroke="var(--border)"
        strokeWidth="3"
        width="84"
        x="48"
        y="6"
      />
      <rect
        fill={`url(#${terminalGradient})`}
        height="12"
        opacity=".72"
        rx="6"
        width="74"
        x="53"
        y="10"
      />
      <path
        d={shoulderPath}
        fill={`url(#${shellGradient})`}
        stroke="var(--background)"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M32 57 C46 45 134 45 148 57 C151 60 153 63 154 67 C124 62 56 62 26 67 C27 63 29 60 32 57 Z"
        fill={`url(#${terminalGradient})`}
        opacity=".72"
      />
      {isFleet && (
        <path
          d="M39 52 C51 45 129 45 141 52"
          fill="none"
          stroke="var(--foreground)"
          strokeLinecap="round"
          strokeOpacity=".32"
          strokeWidth="2.4"
        />
      )}

      <g clipPath={`url(#${clipId})`}>
        <path d={innerBodyPath} fill="var(--background)" />
        <path d={waveFillFrames[0]} fill={`url(#${liquidGradient})`}>
          <animate
            attributeName="d"
            begin={surfaceBegin}
            dur={surfaceDuration}
            repeatCount="indefinite"
            values={waveFillValues}
          />
        </path>
        <path
          d={waveTopFrames[0]}
          fill="none"
          filter={`url(#${glowId})`}
          opacity={isFleet ? '.88' : '.9'}
          stroke={mainColor}
          strokeLinecap="round"
          strokeWidth={isFleet ? '3.2' : '3.5'}
        >
          <animate
            attributeName="d"
            begin={surfaceBegin}
            dur={surfaceDuration}
            repeatCount="indefinite"
            values={waveTopValues}
          />
        </path>
        <path
          d={waveTopFrames[0]}
          fill="none"
          opacity={isFleet ? '.28' : '.26'}
          stroke={mainColor}
          strokeLinecap="round"
          strokeWidth={isFleet ? '1.15' : '1.1'}
        >
          <animate
            attributeName="d"
            begin={surfaceBegin}
            dur={surfaceDuration}
            repeatCount="indefinite"
            values={waveTopValues}
          />
          {isFleet && (
            <animate
              attributeName="opacity"
              begin={surfaceBegin}
              dur={surfaceDuration}
              repeatCount="indefinite"
              values=".18;.34;.22;.3;.18"
            />
          )}
        </path>
        {isFleet && percentage > 50 && (
          <g fill={mainColor} opacity=".16">
            <circle cx="58" cy={fillTop + 28} r="1.2" />
            <circle cx="105" cy={fillTop + 46} r=".8" />
            <circle cx="119" cy={fillTop + 22} r="1" />
            <circle cx="75" cy={fillTop + 68} r=".7" />
            <circle cx="138" cy={fillTop + 78} r="1.1" />
            <circle cx="42" cy={fillTop + 100} r=".8" />
          </g>
        )}
        {!isFleet && (
          <g fill={mainColor} opacity=".22">
            <circle cx="46" cy="365" r="1.2" />
            <circle cx="72" cy="350" r=".9" />
            <circle cx="108" cy="372" r="1.1" />
            <circle cx="134" cy="342" r=".8" />
          </g>
        )}
        {isFleet && (
          <>
            <path
              d="M31 78 C27 101 28 356 31 393 C32 404 35 412 42 417"
              fill="none"
              stroke="var(--foreground)"
              strokeLinecap="round"
              strokeOpacity=".17"
              strokeWidth="5"
            />
            <path
              d="M149 80 C153 105 152 355 149 392 C148 404 145 412 139 417"
              fill="none"
              stroke="var(--foreground)"
              strokeLinecap="round"
              strokeOpacity=".15"
              strokeWidth="4.5"
            />
          </>
        )}
      </g>

      {isFleet && (
        <path
          d="M92 81 77 108h12l-6 23 22-31H92l8-19Z"
          fill="var(--muted-foreground)"
          opacity=".26"
        />
      )}
      <path
        d={outerBodyPath}
        fill="none"
        stroke="var(--background)"
        strokeLinejoin={isFleet ? 'round' : undefined}
        strokeWidth="11"
      />
      <path
        d={outerBodyPath}
        fill="none"
        stroke={`url(#${shellGradient})`}
        strokeLinejoin={isFleet ? 'round' : undefined}
        strokeWidth="7"
      />
      <path
        d={innerBodyPath}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeOpacity=".21"
        strokeWidth="2"
      />
      <path
        d="M30 78 C26 111 27 359 30 393 C31 405 35 414 43 420"
        fill="none"
        stroke="var(--foreground)"
        strokeLinecap="round"
        strokeOpacity={isFleet ? '.19' : '.2'}
        strokeWidth="3.5"
      />
      <path
        d="M150 78 C154 111 153 359 150 393 C149 405 145 414 137 420"
        fill="none"
        stroke="var(--foreground)"
        strokeLinecap="round"
        strokeOpacity=".17"
        strokeWidth="3.5"
      />
      <path
        d="M31 412 C47 430 133 430 149 412"
        fill="none"
        stroke="var(--muted-foreground)"
        strokeLinecap="round"
        strokeOpacity=".46"
        strokeWidth="4.5"
      />

      {isFleet && (
        <g fill="var(--foreground)" filter={`url(#${textGlowId})`}>
          {percentageDots}
        </g>
      )}
    </svg>
  )
})
